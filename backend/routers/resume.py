"""
routers/resume.py — Resume upload and LLM-based structured parsing
"""

import io
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from groq import Groq

router = APIRouter()
_client = None

def get_client():
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _client

MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")


def extract_text(filename: str, data: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()

    if ext == "pdf":
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=data, filetype="pdf")
            return "\n".join(page.get_text() for page in doc)
        except Exception as e:
            raise HTTPException(400, f"PDF extraction failed: {e}")

    if ext in ("docx", "doc"):
        try:
            import docx
            doc = docx.Document(io.BytesIO(data))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception as e:
            raise HTTPException(400, f"DOCX extraction failed: {e}")

    if ext in ("txt", "md"):
        return data.decode("utf-8", errors="replace")

    raise HTTPException(400, f"Unsupported file type: {ext}")


PARSE_PROMPT = """You are a resume parser. Given the raw resume text below, extract structured information and return ONLY valid JSON (no markdown, no explanation) with this exact schema:

{
  "name": "string",
  "email": "string",
  "phone": "string",
  "summary": "string",
  "skills": ["string"],
  "experience": [
    {
      "company": "string",
      "title": "string",
      "duration": "string",
      "highlights": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "year": "string"
    }
  ],
  "certifications": ["string"],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["string"]
    }
  ]
}

Resume text:
"""


class ParseRequest(BaseModel):
    text: str


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    data = await file.read()
    text = extract_text(file.filename, data)
    return {"text": text, "filename": file.filename}


@router.post("/parse")
async def parse_resume(req: ParseRequest):
    try:
        resp = get_client().chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": PARSE_PROMPT + req.text}],
            temperature=0.1,
            max_tokens=2048,
        )
        import json
        raw = resp.choices[0].message.content.strip()
        # strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
        return {"parsed": parsed}
    except Exception as e:
        raise HTTPException(500, f"Parse failed: {e}")
