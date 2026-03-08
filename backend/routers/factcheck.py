"""
routers/factcheck.py — Direct resume cross-check endpoint
"""

import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict
from groq import Groq

router = APIRouter()
_client = None

def get_client():
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _client

MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

SYSTEM = """You are a fact-checking assistant for interviews. Compare the candidate's spoken claim against their resume data and return ONLY valid JSON:
{
  "verdict": "consistent | inconsistent | unverifiable",
  "confidence": 0-100,
  "explanation": "string",
  "resume_evidence": "string or null",
  "flags": ["string"]
}"""


class FactCheckRequest(BaseModel):
    claim: str
    resume_parsed: Dict[str, Any]


@router.post("")
async def factcheck(req: FactCheckRequest):
    prompt = f"""Resume data:
{json.dumps(req.resume_parsed, indent=2)}

Candidate claim: "{req.claim}"

Fact-check this claim against the resume."""

    try:
        resp = get_client().chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=500,
        )
        raw = resp.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except Exception as e:
        raise HTTPException(500, f"Fact-check failed: {e}")
