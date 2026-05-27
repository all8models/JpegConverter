from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # 애플리케이션 설정
    APP_NAME: str = "Image Compression Service"
    DEBUG: bool = True
    MAX_FILE_SIZE: int = 25 * 1024 * 1024  # 25MB
    ALLOWED_MIME_TYPES: list[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ]

    # Celery 설정
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"

    # MinIO 설정
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_NAME: str = "compressed-images"
    MINIO_SECURE: bool = False

    # 스토리지 백엔드: "local" 또는 "minio"
    STORAGE_BACKEND: str = "local"

    # 임시 파일 저장 경로 (로컬 스토리지 사용 시)
    UPLOAD_DIR: str = "/tmp/uploads"
    RESULT_DIR: str = "/tmp/results"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
