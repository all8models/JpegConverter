from PIL import Image
import io
from typing import Optional


def compress_image(
    input_stream: bytes,
    quality: int = 75,
    max_size: Optional[tuple[int, int]] = None,
    strip_metadata: bool = True,
    output_format: str = "jpeg",
) -> bytes:
    """
    이미지 압축 수행

    Args:
        input_stream: 원본 이미지 바이너리
        quality: JPEG 품질 (1-100, 낮을수록 더 작은 파일)
        max_size: (max_width, max_height) - 지정 시 비율 유지 리사이즈
        strip_metadata: EXIF 메타데이터 제거 여부
        output_format: 출력 포맷 (jpeg/png)

    Returns:
        압축된 이미지 바이너리
    """
    img = Image.open(io.BytesIO(input_stream))

    # RGB 변환 (JPEG은 RGB만 지원)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    elif img.mode == "CMYK":
        img = img.convert("RGB")

    # 리사이즈 (필요시)
    if max_size:
        img.thumbnail(max_size, Image.Resampling.LANCZOS)

    # 메타데이터 제거
    if strip_metadata:
        img.info.clear()

    # 압축 저장
    output = io.BytesIO()
    save_kwargs = {
        "format": output_format.upper(),
        "optimize": True,
    }

    if output_format == "jpeg":
        save_kwargs["quality"] = quality
        save_kwargs["progressive"] = True

    img.save(output, **save_kwargs)
    return output.getvalue()


def get_image_info(image_bytes: bytes) -> dict:
    """이미지 정보 반환"""
    img = Image.open(io.BytesIO(image_bytes))
    return {
        "width": img.width,
        "height": img.height,
        "format": img.format,
        "mode": img.mode,
        "size": len(image_bytes),
    }
