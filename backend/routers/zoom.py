"""
zoom.py — Zoom integration for HireIt
-----------------------------------------------------
Provides two capabilities:
  1. Create a Zoom meeting via Server-to-Server OAuth (REST API)
  2. Generate a Meeting SDK JWT signature so the browser can join the
     meeting embedded inside the app (no external Zoom client needed)

Environment variables required
--------------------------------
ZOOM_ACCOUNT_ID      – from your Server-to-Server OAuth app
ZOOM_CLIENT_ID       – from your Server-to-Server OAuth app
ZOOM_CLIENT_SECRET   – from your Server-to-Server OAuth app
ZOOM_SDK_KEY         – from your Meeting SDK app
ZOOM_SDK_SECRET      – from your Meeting SDK app
"""

import os
import time
import hmac
import hashlib
import base64
import json
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# ---------------------------------------------------------------------------
# Config (strip whitespace so .env typos don't break signature)
# ---------------------------------------------------------------------------
ZOOM_ACCOUNT_ID    = (os.getenv("ZOOM_ACCOUNT_ID", "") or "").strip()
ZOOM_CLIENT_ID     = (os.getenv("ZOOM_CLIENT_ID", "") or "").strip()
ZOOM_CLIENT_SECRET = (os.getenv("ZOOM_CLIENT_SECRET", "") or "").strip()
ZOOM_SDK_KEY       = (os.getenv("ZOOM_SDK_KEY", "") or "").strip()
ZOOM_SDK_SECRET    = (os.getenv("ZOOM_SDK_SECRET", "") or "").strip()

ZOOM_OAUTH_URL  = "https://zoom.us/oauth/token"
ZOOM_API_BASE   = "https://api.zoom.us/v2"


# ---------------------------------------------------------------------------
# Helper: get a Server-to-Server OAuth access token
# ---------------------------------------------------------------------------
async def _get_access_token() -> str:
    """Exchange client credentials for a short-lived Zoom access token."""
    if not all([ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET]):
        raise HTTPException(
            status_code=500,
            detail="Zoom Server-to-Server OAuth credentials are not configured. "
                   "Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET.",
        )

    creds = base64.b64encode(
        f"{ZOOM_CLIENT_ID}:{ZOOM_CLIENT_SECRET}".encode()
    ).decode()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            ZOOM_OAUTH_URL,
            params={"grant_type": "account_credentials", "account_id": ZOOM_ACCOUNT_ID},
            headers={"Authorization": f"Basic {creds}"},
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Zoom OAuth token request failed: {resp.text}",
        )
    return resp.json()["access_token"]


# ---------------------------------------------------------------------------
# POST /api/zoom/create-meeting
# ---------------------------------------------------------------------------
class CreateMeetingRequest(BaseModel):
    topic: str = "AI Copilot Interview"
    duration_minutes: int = 60
    candidate_name: str = ""


class CreateMeetingResponse(BaseModel):
    meeting_id: str
    password: str
    join_url: str
    start_url: str
    topic: str


@router.post("/create-meeting", response_model=CreateMeetingResponse)
async def create_meeting(req: CreateMeetingRequest):
    """
    Create a Zoom meeting using the Server-to-Server OAuth credentials.
    Returns meeting_id, password, join_url (candidate), and start_url (host).
    """
    token = await _get_access_token()
    topic = req.topic
    if req.candidate_name:
        topic = f"Interview – {req.candidate_name}"

    payload = {
        "topic": topic,
        "type": 2,  # scheduled meeting
        "duration": req.duration_minutes,
        "settings": {
            "host_video": True,
            "participant_video": True,
            "waiting_room": False,
            "mute_upon_entry": False,
            "auto_recording": "none",
        },
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{ZOOM_API_BASE}/users/me/meetings",
            json=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail=f"Zoom create-meeting failed: {resp.text}",
        )

    data = resp.json()
    return CreateMeetingResponse(
        meeting_id=str(data["id"]),
        password=data.get("password", ""),
        join_url=data["join_url"],
        start_url=data["start_url"],
        topic=data["topic"],
    )


# ---------------------------------------------------------------------------
# POST /api/zoom/sdk-signature
# ---------------------------------------------------------------------------
class SDKSignatureRequest(BaseModel):
    meeting_number: str
    role: int  # 0 = attendee (candidate), 1 = host (interviewer)


class SDKSignatureResponse(BaseModel):
    signature: str
    sdk_key: str


@router.post("/sdk-signature", response_model=SDKSignatureResponse)
def generate_sdk_signature(req: SDKSignatureRequest):
    """
    Generate a Meeting SDK JWT signature so the browser can join a Zoom
    meeting embedded in the app without the external Zoom client.

    Role:
      0 – Attendee  (candidate view)
      1 – Host/Co-host (interviewer view)
    """
    if not all([ZOOM_SDK_KEY, ZOOM_SDK_SECRET]):
        raise HTTPException(
            status_code=500,
            detail="Zoom Meeting SDK credentials are not configured. "
                   "Set ZOOM_SDK_KEY and ZOOM_SDK_SECRET.",
        )

    ts = int(time.time() * 1000) - 30_000  # issued 30 s ago to allow clock skew
    expire = ts + 60 * 60 * 2 * 1000       # valid for 2 hours

    header = base64.urlsafe_b64encode(
        json.dumps({"alg": "HS256", "typ": "JWT"}).encode()
    ).rstrip(b"=").decode()

    # Zoom SDK v5+ requires appKey in JWT payload for signature validation
    payload_data = {
        "appKey": ZOOM_SDK_KEY,
        "sdkKey": ZOOM_SDK_KEY,
        "mn": req.meeting_number,
        "role": req.role,
        "iat": ts // 1000,
        "exp": expire // 1000,
        "tokenExp": expire // 1000,
    }
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps(payload_data).encode()
    ).rstrip(b"=").decode()

    message = f"{header}.{payload_b64}"
    sig = hmac.new(
        ZOOM_SDK_SECRET.encode(), message.encode(), hashlib.sha256
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).rstrip(b"=").decode()

    return SDKSignatureResponse(
        signature=f"{message}.{sig_b64}",
        sdk_key=ZOOM_SDK_KEY,
    )
