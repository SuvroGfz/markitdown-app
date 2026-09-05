import asyncio
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.converter import convert_pdf, count_tokens

app = FastAPI(
    title="MarkItDown API",
    description="PDF to Markdown conversion API using Microsoft MarkItDown"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf"}


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/api/convert")
async def convert_endpoint(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension {ext} not allowed. Only .pdf is supported.")

    content = await file.read()
    file_size_bytes = len(content)

    if file_size_bytes > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File size exceeds maximum limit of {MAX_FILE_SIZE} bytes.")

    try:
        result = await asyncio.to_thread(convert_pdf, content, file.filename)

        # Count tokens for both raw text and clean markdown
        raw_token_count = count_tokens(result.raw_text)
        md_token_count = count_tokens(result.markdown)
        tokens_saved = max(0, raw_token_count - md_token_count)
        savings_pct = round((tokens_saved / raw_token_count * 100), 1) if raw_token_count > 0 else 0

        return {
            "success": True,
            "filename": file.filename,
            "title": result.title,
            "markdown": result.markdown,
            "stats": {
                "file_size_bytes": file_size_bytes,
                "processing_time_ms": round(result.processing_time_ms, 1),
                "markdown_length": len(result.markdown),
                "md_token_count": md_token_count,
                "raw_token_count": raw_token_count,
                "tokens_saved": tokens_saved,
                "savings_percentage": savings_pct,
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# Static files served last so API routes take priority
static_dir = Path(__file__).parent.parent / "static"
app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
