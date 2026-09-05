FROM python:3.11-slim

WORKDIR /app

# No system-level deps needed for PDF-only (pdfplumber is pure Python)

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/
COPY static/ static/

EXPOSE 8000

# Single worker to stay within 512MB RAM on Render free tier
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
