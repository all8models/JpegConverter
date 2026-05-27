from pydantic import BaseModel, Field
from typing import Optional


class CompressRequest(BaseModel):
    quality: int = Field(default=75, ge=1, le=100, description="JPEG 품질 (1-100)")
    max_width: Optional[int] = Field(default=None, ge=1, description="최대 너비")
    max_height: Optional[int] = Field(default=None, ge=1, description="최대 높이")
    strip_metadata: bool = Field(default=True, description="EXIF 메타데이터 제거 여부")
    format: str = Field(default="jpeg", pattern="^(jpeg|png)$", description="출력 포맷")


class TaskResponse(BaseModel):
    task_id: str
    status_url: str


class StatusResponse(BaseModel):
    status: str
    progress: Optional[int] = None


class CompletedResponse(BaseModel):
    status: str = "completed"
    download_url: str
    original_size: int
    compressed_size: int
    ratio: float


class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
