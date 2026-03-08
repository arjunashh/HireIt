import { ScoreBar, Alert, Badge } from "../../shared/UI.jsx";

const RECOMMENDATION_COLOR = {
  "Strong Hire": "var(--accent2)",
  "Hire": "#00b4aa",
  "Maybe": "var(--warn)",
  "No Hire": "var(--danger)",
};

export default function ReportView({ report, onBack }) {
  const recColor = RECOMMENDATION_COLOR[report.recommendation] || "var(--muted)";

  function printReport() {
    window.print();
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>📊 Post-Interview Report</h2>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>AI-generated evaluation summary</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-secondary" onClick={printReport} style={{ fontSize: 13 }}>🖨️ Print</button>
            <button className="btn-primary" onClick={onBack}>← New Interview</button>
          </div>
        </div>

        {/* Recommendation hero */}
        <div className="card" style={{ textAlign: "center", padding: 32, marginBottom: 20, border: `2px solid ${recColor}44` }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>
            {report.recommendation === "Strong Hire" ? "🚀" :
             report.recommendation === "Hire" ? "✅" :
             report.recommendation === "Maybe" ? "🤔" : "❌"}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: recColor, marginBottom: 6 }}>
            {report.recommendation}
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>{report.overall_score}/10</div>
          <p style={{ color: "var(--muted)", maxWidth: 600, margin: "0 auto", fontSize: 14, lineHeight: 1.7 }}>
            {report.executive_summary}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Competency scores */}
          {report.competency_scores && Object.keys(report.competency_scores).length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
                🎯 Competency Scores
              </h3>
              {Object.entries(report.competency_scores).map(([k, v]) => (
                <ScoreBar key={k} label={k} score={v} />
              ))}
            </div>
          )}

          {/* Strengths */}
          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: "var(--accent2)", textTransform: "uppercase", letterSpacing: 1 }}>
              ✅ Strengths
            </h3>
            {(report.strengths || []).map((s, i) => (
              <div key={i} style={{ fontSize: 14, padding: "7px 0", borderBottom: "1px solid var(--border)", display: "flex", gap: 8 }}>
                <span style={{ color: "var(--accent2)" }}>▸</span> {s}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Concerns */}
          {report.concerns?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: "var(--warn)", textTransform: "uppercase", letterSpacing: 1 }}>
                ⚠️ Concerns
              </h3>
              {report.concerns.map((c, i) => (
                <div key={i} style={{ fontSize: 14, padding: "7px 0", borderBottom: "1px solid var(--border)", display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--warn)" }}>▸</span> {c}
                </div>
              ))}
            </div>
          )}

          {/* Contradictions */}
          {report.contradictions_detected?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: "var(--danger)", textTransform: "uppercase", letterSpacing: 1 }}>
                🚨 Contradictions
              </h3>
              {report.contradictions_detected.map((c, i) => (
                <div key={i} style={{ fontSize: 14, padding: "7px 0", borderBottom: "1px solid var(--border)", display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--danger)" }}>▸</span> {c}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Integrity */}
        {report.integrity_summary && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 10, fontSize: 14, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>🛡️ Integrity Summary</h3>
            <p style={{ fontSize: 14, lineHeight: 1.7 }}>{report.integrity_summary}</p>
          </div>
        )}

        {/* Next steps */}
        {report.suggested_next_steps?.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 1 }}>📋 Suggested Next Steps</h3>
            {report.suggested_next_steps.map((s, i) => (
              <div key={i} style={{ fontSize: 14, padding: "8px 0", borderBottom: "1px solid var(--border)", display: "flex", gap: 8 }}>
                <span style={{ color: "var(--accent)", minWidth: 20 }}>{i + 1}.</span> {s}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
