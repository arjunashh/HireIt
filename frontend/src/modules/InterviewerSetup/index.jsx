import { useState } from "react";
import ResumeParser from "../ResumeParser/index.jsx";
import JDSetup from "../JDSetup/index.jsx";
import { startSession, createZoomMeeting } from "../../shared/api.js";
import { Alert, Spinner } from "../../shared/UI.jsx";

const TYPES = ["technical", "behavioral", "leadership", "mixed"];

export default function InterviewerSetup({ onReady, onBack }) {
  const [step, setStep] = useState(1);
  const [resumeParsed, setResumeParsed] = useState(null);
  const [jdParsed, setJdParsed] = useState(null);
  const [candidateName, setCandidateName] = useState("");
  const [interviewType, setInterviewType] = useState("technical");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useZoom, setUseZoom] = useState(false);
  const [zoomMeeting, setZoomMeeting] = useState(null);
  const [zoomLoading, setZoomLoading] = useState(false);
  const [zoomError, setZoomError] = useState(null);

  function handleResumeDone(parsed) {
    setResumeParsed(parsed);
    if (parsed && parsed.name) setCandidateName(parsed.name);
  }

  function handleJDDone(parsed) {
    setJdParsed(parsed);
    setStep(3);
  }

  async function handleCreateZoom() {
    setZoomLoading(true);
    setZoomError(null);
    try {
      const meeting = await createZoomMeeting({ candidate_name: candidateName });
      setZoomMeeting(meeting);
    } catch (err) {
      setZoomError(err.message);
    } finally {
      setZoomLoading(false);
    }
  }

  async function handleLaunch() {
    if (!resumeParsed || !candidateName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await startSession({
        candidate_name: candidateName,
        interview_type: interviewType,
        resume_parsed: resumeParsed,
        jd_parsed: jdParsed || null,
      });
      onReady({
        session_id: data.session_id,
        candidate_name: data.candidate_name,
        resumeParsed,
        jdParsed,
        interviewType,
        zoomMeeting: zoomMeeting || null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <button className="btn-secondary" onClick={onBack} style={{ marginBottom: 20, fontSize: 13 }}>? Back</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Interviewer Setup</h2>
        <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 14 }}>Configure the interview to enable real-time AI analysis.</p>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {["1. Resume", "2. Job Description", "3. Launch"].map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: "9px 0", textAlign: "center", borderRadius: "var(--radius)",
              background: step === i + 1 ? "var(--accent)" : step > i + 1 ? "var(--accent2)" : "var(--surface2)",
              color: step > i + 1 ? "#0f1117" : "var(--text)",
              fontSize: 13, fontWeight: 600,
              cursor: step > i + 1 ? "pointer" : "default",
            }} onClick={() => { if (step > i + 1) setStep(i + 1); }}>
              {step > i + 1 ? "? " : ""}{s}
            </div>
          ))}
        </div>

        <div className="card">
          {/* STEP 1 — Resume */}
          {step === 1 && (
            <div>
              <ResumeParser onParsed={handleResumeDone} />
              {resumeParsed && (
                <button className="btn-primary" onClick={() => setStep(2)} style={{ marginTop: 20, width: "100%" }}>
                  Next: Job Description ?
                </button>
              )}
            </div>
          )}

          {/* STEP 2 — JD */}
          {step === 2 && (
            <JDSetup onParsed={handleJDDone} />
          )}

          {/* STEP 3 — Config + Zoom + Launch */}
          {step === 3 && (
            <div>
              <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>?? Configuration</h3>

              <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--muted)" }}>Candidate Name</label>
              <input
                value={candidateName}
                onChange={e => setCandidateName(e.target.value)}
                placeholder="e.g. Jane Smith"
                style={{ marginBottom: 16 }}
              />

              <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "var(--muted)" }}>Interview Type</label>
              <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
                {TYPES.map(t => (
                  <button key={t} onClick={() => setInterviewType(t)} style={{
                    background: interviewType === t ? "var(--accent)" : "var(--surface2)",
                    border: `1px solid ${interviewType === t ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "var(--radius)", padding: "8px 18px",
                    fontSize: 13, fontWeight: 600,
                    color: interviewType === t ? "#fff" : "var(--text)",
                    textTransform: "capitalize",
                  }}>{t}</button>
                ))}
              </div>

              {/* Zoom */}
              <div style={{ background: "var(--surface2)", borderRadius: "var(--radius)", padding: 16, marginBottom: 20, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: useZoom ? 14 : 0 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>?? Zoom Meeting (Optional)</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>Embed a Zoom session inside the interview room</div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={useZoom} onChange={e => setUseZoom(e.target.checked)} />
                    Enable
                  </label>
                </div>

                {useZoom && !zoomMeeting && (
                  <div>
                    <button className="btn-primary" onClick={handleCreateZoom} disabled={zoomLoading || !candidateName.trim()} style={{ width: "100%", marginBottom: 8 }}>
                      {zoomLoading ? "Creating..." : "?? Create Zoom Meeting"}
                    </button>
                    {zoomError && (
                      <Alert type="warn">
                        {zoomError}
                        <div style={{ marginTop: 4, fontSize: 12 }}>Make sure ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET are set.</div>
                      </Alert>
                    )}
                  </div>
                )}

                {useZoom && zoomMeeting && (
                  <div style={{ background: "var(--surface)", borderRadius: 8, padding: 12 }}>
                    <div style={{ color: "var(--accent2)", fontWeight: 700, marginBottom: 8, fontSize: 13 }}>? Zoom Meeting Created</div>
                    <div style={{ fontSize: 13, marginBottom: 4 }}><strong>ID:</strong> {zoomMeeting.meeting_id}</div>
                    <div style={{ fontSize: 13, marginBottom: 4 }}><strong>Password:</strong> {zoomMeeting.password}</div>
                    <div style={{ fontSize: 13 }}><strong>Candidate Link:</strong>{" "}
                      <a href={zoomMeeting.join_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{zoomMeeting.join_url}</a>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div style={{ background: "var(--surface2)", borderRadius: "var(--radius)", padding: 14, fontSize: 13, marginBottom: 20 }}>
                <div style={{ marginBottom: 4 }}>?? <strong>Candidate:</strong> {candidateName || "—"}</div>
                <div style={{ marginBottom: 4 }}>?? <strong>Resume:</strong> {resumeParsed ? `${resumeParsed.name || "Loaded"} · ${resumeParsed.skills?.length || 0} skills` : "Not loaded"}</div>
                <div style={{ marginBottom: 4 }}>?? <strong>JD:</strong> {jdParsed ? `${jdParsed.role || "Loaded"} · ${jdParsed.competencies?.length || 0} competencies` : "Skipped"}</div>
                <div style={{ marginBottom: 4 }}>?? <strong>Type:</strong> {interviewType}</div>
                <div>?? <strong>Zoom:</strong> {zoomMeeting ? `Meeting ${zoomMeeting.meeting_id}` : useZoom ? "Not created yet" : "Disabled"}</div>
              </div>

              {error && <Alert type="danger" style={{ marginBottom: 14 }}>{error}</Alert>}

              <button
                className="btn-success"
                onClick={handleLaunch}
                disabled={!resumeParsed || !candidateName.trim() || loading}
                style={{ width: "100%", fontSize: 16, padding: 14 }}
              >
                {loading ? "Starting session..." : "?? Launch Interview"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
