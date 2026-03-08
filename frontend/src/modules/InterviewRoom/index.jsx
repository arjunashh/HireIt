import { useState, useRef } from "react";
import { analyzeChunk, generateReport, getZoomSignature } from "../../shared/api.js";
import { Spinner, Alert, ScoreBar, Badge } from "../../shared/UI.jsx";
import ZoomMtgEmbedded from "@zoom/meetingsdk/embedded";

export default function InterviewRoom({ session, onReport, onBack }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [turns, setTurns] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [integrityFlags, setIntegrityFlags] = useState([]);
  const recognitionRef = useRef(null);
  const [zoomJoined, setZoomJoined] = useState(false);
  const [zoomLoading, setZoomLoading] = useState(false);
  const [zoomError, setZoomError] = useState(null);
  const zoomRef = useRef(null);

  const FLAGS = ["Hesitation", "Reading from notes", "Looking away", "Vague answer", "Inconsistent tone"];

  function toggleFlag(flag) {
    setIntegrityFlags(prev => prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]);
  }

  function toggleMic() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    r.onresult = e => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setAnswer(t); };
    r.onend = () => setIsListening(false);
    r.start(); recognitionRef.current = r; setIsListening(true);
  }

  async function submitAnswer() {
    if (!question.trim() || !answer.trim()) return;
    setLoading(true); setError(null);
    try {
      const { turn } = await analyzeChunk({ session_id: session.session_id, question, answer, integrity_flags: integrityFlags });
      setTurns(prev => [turn, ...prev]);
      setCurrentAnalysis(turn.analysis);
      setQuestion(""); setAnswer(""); setIntegrityFlags([]);
      recognitionRef.current?.stop(); setIsListening(false);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function endInterview() {
    setReporting(true);
    try {
      const { report } = await generateReport(session.session_id);
      onReport(report);
    } catch (err) { setError(err.message); setReporting(false); }
  }

  async function joinZoom() {
    const meeting = session.zoomMeeting;
    if (!meeting) return;
    setZoomLoading(true); setZoomError(null);
    try {
      const { signature, sdk_key } = await getZoomSignature(meeting.meeting_id, 1);
      const root = zoomRef.current;
      const client = ZoomMtgEmbedded.createClient();
      await client.init({ zoomAppRoot: root, language: "en-US" });
      await client.join({ sdkKey: sdk_key, signature, meetingNumber: String(meeting.meeting_id), password: meeting.password || "", userName: "Interviewer" });
      setZoomJoined(true);
    } catch (err) {
      setZoomError("Zoom join failed: " + err.message);
    }
    finally { setZoomLoading(false); }
  }

  const avgScore = turns.length ? Math.round(turns.reduce((s, t) => s + (t.analysis?.competency_score || 0), 0) / turns.length * 10) / 10 : null;

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Live Interview — {session.candidate_name}</h2>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>{session.interviewType} · {turns.length} questions{avgScore !== null ? ` · Avg: ${avgScore}/10` : ""}</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-secondary" onClick={onBack} style={{ fontSize: 13 }}>Exit</button>
            <button className="btn-danger" onClick={endInterview} disabled={turns.length === 0 || reporting}>
              {reporting ? "Generating report..." : "End & Report"}
            </button>
          </div>
        </div>

        {session.zoomMeeting && (
          <div className="card" style={{ marginBottom: 20, border: "1px solid var(--accent)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>Zoom Meeting — {session.zoomMeeting.meeting_id}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Candidate link: <a href={session.zoomMeeting.join_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{session.zoomMeeting.join_url}</a></div>
              </div>
              {!zoomJoined && <button className="btn-primary" onClick={joinZoom} disabled={zoomLoading}>{zoomLoading ? "Joining..." : "Join Meeting"}</button>}
            </div>
            {zoomError && <Alert type="warn" style={{ marginTop: 10 }}>{zoomError}</Alert>}
            <div ref={zoomRef} style={{ width: "100%", height: 480, minHeight: 480, overflow: "hidden", borderRadius: 8, marginTop: 12 }} />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card">
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--muted)" }}>Question Asked</label>
              <textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Type the question you asked..." style={{ minHeight: 72, marginBottom: 14 }} />
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--muted)" }}>
                Candidate Answer
                <button onClick={toggleMic} style={{ marginLeft: 10, fontSize: 12, padding: "3px 10px", background: isListening ? "var(--danger)" : "var(--surface2)", border: `1px solid ${isListening ? "var(--danger)" : "var(--border)"}`, borderRadius: 20, color: isListening ? "#fff" : "var(--text)" }}>
                  {isListening ? "Stop mic" : "Use mic"}
                </button>
              </label>
              <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Type or dictate the candidate answer..." style={{ minHeight: 110, marginBottom: 14 }} />
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "var(--muted)" }}>Integrity Flags</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {FLAGS.map(f => (
                  <button key={f} onClick={() => toggleFlag(f)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, background: integrityFlags.includes(f) ? "#ffb70322" : "var(--surface2)", border: `1px solid ${integrityFlags.includes(f) ? "var(--warn)" : "var(--border)"}`, color: integrityFlags.includes(f) ? "var(--warn)" : "var(--muted)" }}>{f}</button>
                ))}
              </div>
              {error && <Alert type="danger" style={{ marginBottom: 12 }}>{error}</Alert>}
              <button className="btn-primary" onClick={submitAnswer} disabled={!question.trim() || !answer.trim() || loading} style={{ width: "100%" }}>
                {loading ? <span style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}><Spinner size={16} /> Analyzing...</span> : "Analyze Answer"}
              </button>
            </div>
            {turns.map((t, i) => <TurnCard key={i} turn={t} index={turns.length - i} />)}
          </div>

          <div style={{ position: "sticky", top: 24 }}>
            {currentAnalysis
              ? <AnalysisPanel analysis={currentAnalysis} onUseQuestion={q => setQuestion(q)} />
              : <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}><div style={{ fontSize: 32, marginBottom: 10 }}>AI</div><p style={{ fontSize: 14 }}>Submit an answer to see live analysis here.</p></div>}
            {session.jdParsed?.competencies?.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Target Competencies</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {session.jdParsed.competencies.map((c, i) => <span key={i} style={{ background: "#00d4aa11", border: "1px solid var(--accent2)", borderRadius: 20, padding: "2px 10px", fontSize: 12, color: "var(--accent2)" }}>{c}</span>)}
                </div>
              </div>
            )}
            {session.jdParsed?.suggested_questions?.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Suggested Questions</h4>
                {session.jdParsed.suggested_questions.slice(0, 4).map((q, i) => (
                  <div key={i} onClick={() => setQuestion(q)} style={{ fontSize: 13, padding: "8px 10px", marginBottom: 6, background: "var(--surface2)", borderRadius: 8, cursor: "pointer", border: "1px solid transparent" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"} onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}>{q}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisPanel({ analysis, onUseQuestion }) {
  return (
    <div className="card">
      <h4 style={{ marginBottom: 16, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Live Analysis</h4>
      <ScoreBar label="Relevance" score={analysis.relevance_score || 0} />
      <ScoreBar label="Competency" score={analysis.competency_score || 0} />
      {analysis.summary && <p style={{ fontSize: 13, color: "var(--muted)", margin: "14px 0", lineHeight: 1.6 }}>{analysis.summary}</p>}
      {analysis.contradictions?.length > 0 && <><div style={{ fontSize: 11, color: "var(--danger)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Contradictions</div>{analysis.contradictions.map((c, i) => <div key={i} style={{ fontSize: 13, padding: "6px 10px", background: "#ff4d6d11", borderRadius: 6, marginBottom: 4, borderLeft: "3px solid var(--danger)" }}>{c}</div>)}</>}
      {analysis.follow_up_questions?.length > 0 && <><div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, margin: "10px 0 6px", textTransform: "uppercase" }}>Follow-up Questions</div>{analysis.follow_up_questions.map((q, i) => <div key={i} onClick={() => onUseQuestion(q)} style={{ fontSize: 13, padding: "6px 10px", background: "#6c63ff11", borderRadius: 6, marginBottom: 4, borderLeft: "3px solid var(--accent)", cursor: "pointer" }}>{q}</div>)}</>}
      {analysis.concerns?.length > 0 && <><div style={{ fontSize: 11, color: "var(--warn)", fontWeight: 700, margin: "10px 0 6px", textTransform: "uppercase" }}>Concerns</div>{analysis.concerns.map((c, i) => <div key={i} style={{ fontSize: 13, padding: "6px 10px", background: "#ffb70311", borderRadius: 6, marginBottom: 4, borderLeft: "3px solid var(--warn)" }}>{c}</div>)}</>}
      {analysis.strengths?.length > 0 && <><div style={{ fontSize: 11, color: "var(--accent2)", fontWeight: 700, margin: "10px 0 6px", textTransform: "uppercase" }}>Strengths</div>{analysis.strengths.map((s, i) => <div key={i} style={{ fontSize: 13, padding: "6px 10px", background: "#00d4aa11", borderRadius: 6, marginBottom: 4, borderLeft: "3px solid var(--accent2)" }}>{s}</div>)}</>}
    </div>
  );
}

function TurnCard({ turn, index }) {
  const [open, setOpen] = useState(false);
  const score = turn.analysis?.competency_score || 0;
  const scoreColor = score >= 7 ? "var(--accent2)" : score >= 4 ? "var(--warn)" : "var(--danger)";
  return (
    <div className="card" style={{ marginBottom: 12, cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Q{index}. {turn.question.slice(0, 60)}{turn.question.length > 60 ? "…" : ""}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {turn.analysis?.contradictions?.length > 0 && <Badge variant="red">{turn.analysis.contradictions.length} issues</Badge>}
          <span style={{ fontWeight: 700, color: scoreColor }}>{score}/10</span>
          <span style={{ color: "var(--muted)" }}>{open ? "?" : "?"}</span>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}><strong>Answer:</strong> {turn.answer}</p>
          {turn.analysis?.summary && <p style={{ fontSize: 13 }}>{turn.analysis.summary}</p>}
        </div>
      )}
    </div>
  );
}
