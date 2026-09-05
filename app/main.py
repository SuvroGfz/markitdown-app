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

# CORS middleware for local dev (allow all origins)
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
        # Run CPU-bound conversion in a thread pool
        result = await asyncio.to_thread(convert_pdf, content, file.filename)
        
        # Count tokens for markdown output
        token_count = count_tokens(result.markdown)
        
        return {
            "success": True,
            "filename": file.filename,
            "title": result.title,
            "markdown": result.markdown,
            "stats": {
                "file_size_bytes": file_size_bytes,
                "processing_time_ms": result.processing_time_ms,
                "markdown_length": len(result.markdown),
                "token_count": token_count,
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Mount static files at the root (placed after API routes so they take priority)
static_dir = Path(__file__).parent.parent / "static"
app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000)
