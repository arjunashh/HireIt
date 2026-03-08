"""
routers/jd.py — Job description parsing into competency targets
"""

import os
import json
from fastapi import APIRouter, HTTPException
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

JD_PROMPT = """You are a hiring expert. Given the job description below, extract structured information and return ONLY valid JSON (no markdown):

{
  "role": "string",
  "seniority": "string",
  "competencies": ["string"],
  "required_skills": ["string"],
  "nice_to_have": ["string"],
  "responsibilities": ["string"],
  "suggested_questions": ["string"]
}

Job Description:
"""


class JDRequest(BaseModel):
    text: str


@router.post("/parse")
async def parse_jd(req: JDRequest):
    try:
        resp = get_client().chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": JD_PROMPT + req.text}],
            temperature=0.1,
            max_tokens=1500,
        )
        raw = resp.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
        return {"parsed": parsed}
    except Exception as e:
        raise HTTPException(500, f"JD parse failed: {e}")
