// shared/api.js — all backend API calls

const BASE = "/api";

async function post(path, body, isFormData = false) {
  const opts = {
    method: "POST",
    ...(isFormData
      ? { body }
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  };
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

async function get(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Not found");
  return res.json();
}

// Resume
export const uploadResume = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return post("/resume/upload", fd, true);
};
export const parseResume = (text) => post("/resume/parse", { text });

// JD
export const parseJD = (text) => post("/jd/parse", { text });

// Session
export const startSession = (payload) => post("/session/start", payload);
export const analyzeChunk = (payload) => post("/session/chunk", payload);
export const generateReport = (session_id) => post("/session/report", { session_id });
export const getSession = (id) => get(`/session/${id}`);
export const logIntegrity = (session_id, event) =>
  post(`/session/${session_id}/integrity`, event);

// Factcheck
export const factCheck = (claim, resume_parsed) =>
  post("/factcheck", { claim, resume_parsed });

// Zoom
export const createZoomMeeting = (payload) => post("/zoom/create-meeting", payload);
export const getZoomSignature = (meeting_number, role) =>
  post("/zoom/sdk-signature", { meeting_number, role });
