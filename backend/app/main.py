import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from app.core.config import settings
from app.api.compress import router as compress_router

app = FastAPI(
    title=settings.APP_NAME,
    description="JPEG 압축 원리를 기반으로 이미지를 압축하는 웹서비스 API",
    version="1.0.0",
)

# CORS 설정 (프론트엔드에서 접근 가능하도록)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한 필요
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록 (StaticFiles보다 우선순위 높음)
app.include_router(compress_router)


@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "ok", "service": settings.APP_NAME}


# ===== 프론트엔드 정적 파일 서빙 (운영 환경) =====
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")

if os.path.exists(STATIC_DIR):
    # assets 등 정적 리소스는 StaticFiles로
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # SPA fallback: API가 아닌 모든 경로는 index.html 반환
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # API 경로는 404 반환 (API 라우터에서 이미 처리되지 않은 경우)
        if full_path.startswith("api/") or full_path == "api":
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        index_path = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path, media_type="text/html")
        return JSONResponse({"detail": "Not Found"}, status_code=404)
