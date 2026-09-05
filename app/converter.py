import io
import time
import gc
from dataclasses import dataclass
from typing import Optional

from markitdown import MarkItDown
import tiktoken
import pdfplumber


@dataclass
class ConversionResult:
    markdown: str
    title: Optional[str]
    processing_time_ms: float
    raw_text: str


# Initialize MarkItDown singleton (no plugins, PDF only)
_md_converter = MarkItDown()

# Cache tiktoken encoding
_encoding = tiktoken.encoding_for_model("gpt-4o")


def extract_raw_text(file_bytes: bytes) -> str:
    """Extract raw unprocessed text from PDF using pdfplumber directly.
    This represents what you'd get without MarkItDown's cleanup."""
    try:
        stream = io.BytesIO(file_bytes)
        text_parts = []
        with pdfplumber.open(stream) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text_parts.append(page_text)
        return "\n\n".join(text_parts)
    except Exception:
        return ""


def convert_pdf(file_bytes: bytes, filename: str) -> ConversionResult:
    start_time = time.perf_counter()
    try:
        # Extract raw text first (for token comparison)
        raw_text = extract_raw_text(file_bytes)

        # Convert with MarkItDown
        stream = io.BytesIO(file_bytes)
        result = _md_converter.convert_stream(stream, file_extension=".pdf")

        markdown_text = getattr(result, "markdown", None) or result.text_content
        title = result.title if hasattr(result, "title") else None

        processing_time_ms = (time.perf_counter() - start_time) * 1000

        return ConversionResult(
            markdown=markdown_text,
            title=title,
            processing_time_ms=processing_time_ms,
            raw_text=raw_text,
        )
    except Exception as e:
        raise ValueError(f"Failed to convert PDF '{filename}': {str(e)}") from e
    finally:
        gc.collect()


def count_tokens(text: str) -> int:
    try:
        return len(_encoding.encode(text))
    except Exception:
        return 0
