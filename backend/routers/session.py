"""
routers/session.py — In-memory interview session management
"""

import os
import json
import uuid
from typing import Any, Dict, List, Optional
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

# ── In-memory store ────────────────────────────────────────────────────────────
SESSIONS: Dict[str, Dict[str, Any]] = {}


# ── Models ─────────────────────────────────────────────────────────────────────
class StartRequest(BaseModel):
    candidate_name: str
    interview_type: str  # technical | behavioral | leadership
    resume_parsed: Dict[str, Any]
    jd_parsed: Optional[Dict[str, Any]] = None


class ChunkRequest(BaseModel):
    session_id: str
    question: str
    answer: str
    integrity_flags: Optional[List[str]] = []


class ReportRequest(BaseModel):
    session_id: str


# ── Helpers ────────────────────────────────────────────────────────────────────
CHUNK_SYSTEM = """You are an AI interview analysis assistant. Analyze the candidate's answer for:
1. Relevance and depth
2. Contradictions or inconsistencies with their resume
3. Vague, generic, or incomplete responses
4. Suggested follow-up questions (2-3 specific probing questions)
5. Competency score for this answer (0-10)

Return ONLY valid JSON:
{
  "relevance_score": 0-10,
  "competency_score": 0-10,
  "contradictions": ["string"],
  "concerns": ["string"],
  "strengths": ["string"],
  "follow_up_questions": ["string"],
  "summary": "string"
}"""

REPORT_SYSTEM = """You are a senior hiring expert. Based on the complete interview transcript and analysis data provided, generate a structured post-interview evaluation report. Return ONLY valid JSON:
{
  "overall_score": 0-10,
  "recommendation": "Strong Hire | Hire | Maybe | No Hire",
  "executive_summary": "string",
  "competency_scores": {"competency_name": 0-10},
  "strengths": ["string"],
  "concerns": ["string"],
  "contradictions_detected": ["string"],
  "integrity_summary": "string",
  "suggested_next_steps": ["string"]
}"""


# ── Routes ─────────────────────────────────────────────────────────────────────
@router.post("/start")
async def start_session(req: StartRequest):
    sid = str(uuid.uuid4())
    SESSIONS[sid] = {
        "id": sid,
        "candidate_name": req.candidate_name,
        "interview_type": req.interview_type,
        "resume_parsed": req.resume_parsed,
        "jd_parsed": req.jd_parsed,
        "turns": [],
        "integrity_events": [],
    }
    return {"session_id": sid, "candidate_name": req.candidate_name}


@router.post("/chunk")
async def analyze_chunk(req: ChunkRequest):
    session = SESSIONS.get(req.session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    resume_context = json.dumps(session["resume_parsed"], indent=2)
    jd_context = json.dumps(session.get("jd_parsed") or {}, indent=2)

    prompt = f"""Resume:
{resume_context}

Job Description Context:
{jd_context}

Interview Question: {req.question}

Candidate Answer: {req.answer}

Integrity flags observed: {', '.join(req.integrity_flags) if req.integrity_flags else 'none'}

Analyze the answer thoroughly."""

    try:
        resp = get_client().chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": CHUNK_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=1000,
        )
        raw = resp.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        analysis = json.loads(raw)
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {e}")

    turn = {
        "question": req.question,
        "answer": req.answer,
        "integrity_flags": req.integrity_flags,
        "analysis": analysis,
    }
    session["turns"].append(turn)

    return {"turn": turn}


@router.post("/report")
async def generate_report(req: ReportRequest):
    session = SESSIONS.get(req.session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    transcript = "\n\n".join(
        f"Q: {t['question']}\nA: {t['answer']}\nAnalysis: {json.dumps(t['analysis'])}"
        for t in session["turns"]
    )

    prompt = f"""Candidate: {session['candidate_name']}
Interview Type: {session['interview_type']}
Resume: {json.dumps(session['resume_parsed'], indent=2)}
JD: {json.dumps(session.get('jd_parsed') or {}, indent=2)}
Integrity events: {json.dumps(session['integrity_events'])}

Full Transcript with Analysis:
{transcript}

Generate the final evaluation report."""

    try:
        resp = get_client().chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": REPORT_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=2000,
        )
        raw = resp.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        report = json.loads(raw)
    except Exception as e:
        raise HTTPException(500, f"Report failed: {e}")

    return {"report": report, "session_id": req.session_id}


@router.get("/{session_id}")
async def get_session(session_id: str):
    session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return session


@router.post("/{session_id}/integrity")
async def log_integrity(session_id: str, event: Dict[str, Any]):
    session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    session["integrity_events"].append(event)
    return {"logged": True}
