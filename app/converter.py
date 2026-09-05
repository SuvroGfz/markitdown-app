import io
import time
import gc
from dataclasses import dataclass
from typing import Optional

from markitdown import MarkItDown
import tiktoken

@dataclass
class ConversionResult:
    markdown: str
    title: Optional[str]
    processing_time_ms: float

# Initialize MarkItDown singleton (no plugins, PDF only)
_md_converter = MarkItDown()

def convert_pdf(file_bytes: bytes, filename: str) -> ConversionResult:
    start_time = time.perf_counter()
    try:
        # Wrap the bytes in a stream for MarkItDown
        stream = io.BytesIO(file_bytes)
        result = _md_converter.convert_stream(stream, file_extension=".pdf")
        
        markdown_text = getattr(result, "markdown", None) or result.text_content
        title = result.title if hasattr(result, "title") else None
        
        processing_time_ms = (time.perf_counter() - start_time) * 1000
        
        return ConversionResult(
            markdown=markdown_text,
            title=title,
            processing_time_ms=processing_time_ms,
        )
    except Exception as e:
        raise ValueError(f"Failed to convert PDF '{filename}': {str(e)}") from e
    finally:
        # Reclaim memory (useful for limited memory environments like Render's 512MB tier)
        gc.collect()

def count_tokens(text: str, model: str = "gpt-4o") -> int:
    try:
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except Exception:
        # Graceful degradation if tiktoken fails
        return 0
