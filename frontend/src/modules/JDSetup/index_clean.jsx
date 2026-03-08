import { useState } from "react";
import { parseJD } from "../../shared/api.js";
import { Spinner, Alert } from "../../shared/UI.jsx";

export default function JDSetup({ onParsed }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await parseJD(text);
      const p = res.parsed;
      setParsed(p);
      onParsed(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function skip() {
    onParsed(null);
  }

  return (
    <div>
      <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>?? Job Description</h3>
      {!parsed ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste the job description here..." style={{ minHeight: 140 }} />
          {error && <Alert type="danger">{error}</Alert>}
          <button className="btn-primary" onClick={submit} disabled={!text.trim() || loading}>
            {loading ? "Parsing JD..." : "Parse JD"}
          </button>
          <button className="btn-secondary" onClick={skip} style={{ fontSize: 13 }}>
            Skip — no JD
          </button>
        </div>
      ) : (
        <div style={{ background: "var(--surface2)", borderRadius: "var(--radius)", padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{parsed.role || "Role"}</div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>{parsed.seniority}</div>
            </div>
            <button className="btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => { setParsed(null); onParsed(null); }}>? Clear</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {(parsed.competencies || []).map((c, i) => (
              <span key={i} style={{ background: "#00e5b010", border: "1px solid #00e5b040", borderRadius: 20, padding: "2px 10px", fontSize: 12, color: "var(--accent2)" }}>{c}</span>
            ))}
          </div>
          <div style={{ fontSize: 13, color: "var(--accent2)", fontWeight: 600 }}>? JD parsed — {parsed.competencies?.length || 0} competencies mapped</div>
          <button className="btn-primary" onClick={() => onParsed(parsed)} style={{ marginTop: 12, width: "100%" }}>
            Continue with this JD ?
          </button>
        </div>
      )}
    </div>
  );
}
