# MarkItDown — PDF to Markdown Converter

> Convert PDF files to clean, structured Markdown to dramatically reduce LLM token consumption.

Built on top of [Microsoft's MarkItDown](https://github.com/microsoft/markitdown) library.

## Features

- **PDF → Markdown conversion** with preserved structure (headings, tables, lists, links)
- **Token count comparison** — see how many tokens you save vs raw PDF text
- **Drag & drop upload** — intuitive file upload interface
- **Download & Copy** — get your Markdown as a `.md` file or copy to clipboard
- **10 MB file limit** — handles 93-95% of academic research papers

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11 + FastAPI |
| PDF Engine | MarkItDown (pdfplumber + pdfminer.six) |
| Token Counting | tiktoken (GPT-4o tokenizer) |
| Frontend | HTML + CSS + Vanilla JS |
| Deployment | Docker on Render (free tier) |

## Local Development

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run dev server
uvicorn app.main:app --reload --port 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

## Deploy to Render

1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New → Blueprint** and connect your repo
4. Render will auto-detect `render.yaml` and deploy

Or deploy manually:
1. **New → Web Service**
2. Connect your GitHub repo
3. Select **Docker** runtime
4. Choose **Free** plan
5. Deploy

## API Usage

```bash
# Convert a PDF
curl -X POST http://localhost:8000/api/convert \
  -F "file=@paper.pdf"

# Health check
curl http://localhost:8000/api/health
```

## License

MIT
