import io
import os
import traceback
from celery import Celery
from app.core.config import settings
from app.services.compressor import compress_image, get_image_info

celery_app = Celery(
    "image_compression",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Seoul",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)


def save_to_local(task_id: str, compressed_bytes: bytes, output_format: str) -> tuple[str, str]:
    """로컬 파일 시스템에 압축 결과 저장"""
    task_dir = os.path.join(settings.RESULT_DIR, task_id)
    os.makedirs(task_dir, exist_ok=True)

    file_ext = "jpg" if output_format == "jpeg" else "png"
    filename = f"compressed.{file_ext}"
    filepath = os.path.join(task_dir, filename)

    with open(filepath, "wb") as f:
        f.write(compressed_bytes)

    return filepath, filename


@celery_app.task(bind=True, name="compress_image_task")
def compress_image_task(
    self,
    image_bytes: bytes,
    quality: int = 75,
    max_width: int = None,
    max_height: int = None,
    strip_metadata: bool = True,
    output_format: str = "jpeg",
) -> dict:
    """
    Celery 워커에서 이미지 압축을 수행하는 태스크

    Returns:
        압축 결과 정보 딕셔너리
    """
    task_id = self.request.id
    file_ext = "jpg" if output_format == "jpeg" else "png"

    try:
        self.update_state(state="PROCESSING", meta={"progress": 10})

        # 원본 이미지 정보
        original_info = get_image_info(image_bytes)
        original_size = len(image_bytes)

        self.update_state(state="PROCESSING", meta={"progress": 30})

        # 최대 크기 설정
        max_size = None
        if max_width or max_height:
            max_size = (max_width or 99999, max_height or 99999)

        # 이미지 압축
        compressed_bytes = compress_image(
            input_stream=image_bytes,
            quality=quality,
            max_size=max_size,
            strip_metadata=strip_metadata,
            output_format=output_format,
        )

        self.update_state(state="PROCESSING", meta={"progress": 70})

        # ===== 스토리지 저장 =====
        if settings.STORAGE_BACKEND == "minio":
            # MinIO 저장 (선택 사항)
            from minio import Minio
            minio_client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE,
            )
            bucket_name = settings.MINIO_BUCKET_NAME
            if not minio_client.bucket_exists(bucket_name):
                minio_client.make_bucket(bucket_name)
            object_name = f"{task_id}/compressed.{file_ext}"
            minio_client.put_object(
                bucket_name=bucket_name,
                object_name=object_name,
                data=io.BytesIO(compressed_bytes),
                length=len(compressed_bytes),
                content_type=f"image/{output_format}",
            )
        else:
            # 로컬 파일 시스템 저장 (기본)
            filepath, object_name = save_to_local(task_id, compressed_bytes, output_format)

        self.update_state(state="PROCESSING", meta={"progress": 90})

        # 압축률 계산
        compressed_size = len(compressed_bytes)
        ratio = round(original_size / compressed_size, 1) if compressed_size > 0 else 0

        result = {
            "task_id": task_id,
            "original_size": original_size,
            "compressed_size": compressed_size,
            "ratio": ratio,
            "original_info": original_info,
            "filename": f"compressed.{file_ext}",
        }

        # 주의: state="SUCCESS" 로 update_state 하면 return 값이 덮어써짐
        # 대신 return 값이 자동으로 SUCCESS 결과로 저장됨
        return result

    except Exception as e:
        error_detail = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(f"[TASK ERROR] {error_detail}")
        self.update_state(
            state="FAILURE",
            meta={"progress": 70, "error": str(e)},
        )
        raise
