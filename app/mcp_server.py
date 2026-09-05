"""
MCP (Model Context Protocol) server for MarkItDown.
Exposes PDF-to-Markdown conversion as MCP tools for AI agents.
"""

import base64
import json
import httpx
from mcp.server.mcpserver import MCPServer

from app.converter import convert_pdf, count_tokens

# Create MCP server
mcp = MCPServer(
    "markitdown",
    instructions=(
        "MarkItDown MCP Server — Convert PDF documents to clean, structured Markdown. "
        "Reduces LLM token consumption while preserving document structure (headings, tables, lists, links). "
        "Powered by Microsoft's MarkItDown library."
    ),
)


def _build_stats(result, file_size_bytes: int) -> dict:
    """Build stats dict from conversion result."""
    raw_tokens = count_tokens(result.raw_text)
    md_tokens = count_tokens(result.markdown)
    saved = max(0, raw_tokens - md_tokens)
    pct = round((saved / raw_tokens * 100), 1) if raw_tokens > 0 else 0
    return {
        "file_size_bytes": file_size_bytes,
        "processing_time_ms": round(result.processing_time_ms, 1),
        "markdown_length": len(result.markdown),
        "md_token_count": md_tokens,
        "raw_token_count": raw_tokens,
        "tokens_saved": saved,
        "savings_percentage": pct,
    }


@mcp.tool()
def convert_pdf_to_markdown(pdf_base64: str, filename: str = "document.pdf") -> str:
    """Convert a base64-encoded PDF to clean Markdown.

    Args:
        pdf_base64: The PDF file content encoded as a base64 string.
        filename: Original filename (used for title detection). Defaults to "document.pdf".

    Returns:
        JSON string with 'markdown', 'title', and 'stats' (token counts, savings, timing).
    """
    try:
        file_bytes = base64.b64decode(pdf_base64)
    except Exception:
        return json.dumps({"error": "Invalid base64 encoding."})

    if len(file_bytes) > 10 * 1024 * 1024:
        return json.dumps({"error": "File exceeds 10 MB limit."})

    try:
        result = convert_pdf(file_bytes, filename)
        stats = _build_stats(result, len(file_bytes))
        return json.dumps({
            "markdown": result.markdown,
            "title": result.title,
            "stats": stats,
        })
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
async def convert_pdf_from_url(url: str, filename: str = "document.pdf") -> str:
    """Download a PDF from a URL and convert it to clean Markdown.

    Args:
        url: Public URL of the PDF file to download and convert.
        filename: Filename to use for title detection. Defaults to "document.pdf".

    Returns:
        JSON string with 'markdown', 'title', and 'stats' (token counts, savings, timing).
    """
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            file_bytes = resp.content
    except httpx.HTTPStatusError as e:
        return json.dumps({"error": f"HTTP {e.response.status_code} downloading PDF."})
    except Exception as e:
        return json.dumps({"error": f"Failed to download PDF: {str(e)}"})

    if len(file_bytes) > 10 * 1024 * 1024:
        return json.dumps({"error": "Downloaded file exceeds 10 MB limit."})

    # Detect filename from URL if not provided
    if filename == "document.pdf" and "/" in url:
        url_filename = url.rstrip("/").split("/")[-1].split("?")[0]
        if url_filename.lower().endswith(".pdf"):
            filename = url_filename

    try:
        result = convert_pdf(file_bytes, filename)
        stats = _build_stats(result, len(file_bytes))
        return json.dumps({
            "markdown": result.markdown,
            "title": result.title,
            "stats": stats,
        })
    except Exception as e:
        return json.dumps({"error": str(e)})
