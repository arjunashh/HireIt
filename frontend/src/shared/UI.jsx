export function Spinner({ size = 24 }) {
  return (
    <div style={{ width: size, height: size, border: "3px solid #252a3d", borderTopColor: "#7c6dff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
  );
}

export function Badge({ children, variant = "purple" }) {
  const colors = { purple: { bg: "#7c6dff22", color: "#7c6dff", border: "#7c6dff" }, green: { bg: "#00e5b022", color: "#00e5b0", border: "#00e5b0" }, red: { bg: "#ff456622", color: "#ff4566", border: "#ff4566" }, yellow: { bg: "#ffb02022", color: "#ffb020", border: "#ffb020" } };
  const c = colors[variant] || colors.purple;
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{children}</span>;
}

export function Card({ children, style }) {
  return <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20, ...style }}>{children}</div>;
}

export function Alert({ type = "info", children, style }) {
  const colors = { info: { bg: "#7c6dff10", border: "#7c6dff40", color: "#a89fff" }, warn: { bg: "#ffb02010", border: "#ffb02040", color: "#ffb020" }, danger: { bg: "#ff456610", border: "#ff456640", color: "#ff4566" }, success: { bg: "#00e5b010", border: "#00e5b040", color: "#00e5b0" } };
  const c = colors[type] || colors.info;
  return <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: "var(--radius)", padding: "12px 16px", color: c.color, fontSize: 13, ...style }}>{children}</div>;
}

export function ScoreBar({ label, score, max = 10 }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 70 ? "#00e5b0" : pct >= 40 ? "#ffb020" : "#ff4566";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{score}/{max}</span>
      </div>
      <div style={{ background: "#1e2235", borderRadius: 4, height: 6 }}>
        <div style={{ width: `${pct}%`, height: 6, borderRadius: 4, background: color, transition: "width .4s" }} />
      </div>
    </div>
  );
}

export function Section({ title, children, style }) {
  return (
    <div style={{ marginBottom: 24, ...style }}>
      {title && <h3 style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>{title}</h3>}
      {children}
    </div>
  );
}
