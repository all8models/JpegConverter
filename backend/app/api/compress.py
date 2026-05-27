import io
import uuid
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import Response
from typing import Optional

from app.core.config import settings
from app.models.schemas import TaskResponse, StatusResponse, CompletedResponse, ErrorResponse
from app.tasks.image_tasks import compress_image_task
from celery.result import AsyncResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["compression"])


@router.post("/compress", response_model=TaskResponse)
async def compress_image(
    file: UploadFile = File(...),
    quality: int = Form(default=75, ge=1, le=100),
    max_width: Optional[int] = Form(default=None, ge=1),
    max_height: Optional[int] = Form(default=None, ge=1),
    strip_metadata: bool = Form(default=True),
    output_format: str = Form(default="jpeg"),
):
    """
    이미지 압축 요청
    - 파일 업로드 + 압축 파라미터 전송
    - 작업 ID 반환 (비동기 처리)
    """
    # 파일 크기 검증
    contents = await file.read()
    if len(contents) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"파일 크기가 너무 큽니다. 최대 {settings.MAX_FILE_SIZE // (1024*1024)}MB까지 허용됩니다.",
        )

    # MIME 타입 검증
    if file.content_type not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식입니다. 지원 형식: {', '.join(settings.ALLOWED_MIME_TYPES)}",
        )

    # Celery 태스크 실행
    task = compress_image_task.delay(
        image_bytes=contents,
        quality=quality,
        max_width=max_width,
        max_height=max_height,
        strip_metadata=strip_metadata,
        output_format=output_format,
    )

    return TaskResponse(
        task_id=task.id,
        status_url=f"/api/status/{task.id}",
    )


@router.get("/status/{task_id}")
async def get_status(task_id: str):
    """
    작업 상태 조회
    - processing: 처리 중
    - completed: 완료
    - error: 오류
    """
    task = AsyncResult(task_id, app=compress_image_task.app)

    if task.state == "PENDING":
        return StatusResponse(status="pending", progress=0)
    elif task.state == "PROCESSING":
        meta = task.info or {}
        return StatusResponse(status="processing", progress=meta.get("progress", 0))
    elif task.state == "SUCCESS":
        try:
            result = task.result
            logger.info(f"Task {task_id} SUCCESS, result type={type(result).__name__}, keys={list(result.keys()) if isinstance(result, dict) else 'N/A'}, content={result}")
            # result가 dict가 아닌 경우 대비
            if not isinstance(result, dict):
                result = {}
            return CompletedResponse(
                status="completed",
                download_url=f"/api/download/{task_id}",
                original_size=result.get("original_size", 0),
                compressed_size=result.get("compressed_size", 0),
                ratio=result.get("ratio", 0),
            )
        except Exception as e:
            return ErrorResponse(status="error", message=f"결과 조회 실패: {str(e)}")
    elif task.state == "FAILURE":
        error_info = task.info if isinstance(task.info, dict) else {}
        return ErrorResponse(
            status="error",
            message=error_info.get("error", str(task.info)),
        )
    else:
        return StatusResponse(status=task.state.lower())


@router.get("/download/{task_id}")
async def download_image(task_id: str):
    """
    압축된 이미지 다운로드
    """
    task = AsyncResult(task_id, app=compress_image_task.app)

    if task.state != "SUCCESS":
        raise HTTPException(status_code=404, detail="작업이 아직 완료되지 않았습니다.")

    result = task.result
    filename = result.get("filename", "compressed.jpg")

    # 콘텐츠 타입 결정
    content_type = "image/jpeg"
    if filename.endswith(".png"):
        content_type = "image/png"

    if settings.STORAGE_BACKEND == "minio":
        # MinIO에서 다운로드
        from app.tasks.image_tasks import celery_app
        from minio import Minio
        from minio.error import S3Error

        minio_client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        try:
            object_name = f"{task_id}/{filename}"
            response = minio_client.get_object(settings.MINIO_BUCKET_NAME, object_name)
            image_data = response.read()
            response.close()
            response.release_conn()
        except S3Error:
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    else:
        # 로컬 파일 시스템에서 다운로드
        import os
        filepath = os.path.join(settings.RESULT_DIR, task_id, filename)
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
        with open(filepath, "rb") as f:
            image_data = f.read()

    return Response(
        content=image_data,
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="compressed_{task_id[:8]}.{content_type.split("/")[1]}"'
        },
    )
