export default function RoleSelect({ onSelect }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}></div>
        <h1 style={{ fontSize: 32, fontWeight: 800, background: "linear-gradient(135deg, #6c63ff, #00d4aa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>
          HireIt
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 16 }}>
          Real-time copilot for technical, behavioral & leadership interviews
        </p>
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
        <RoleCard icon="" title="Candidate" description="Start your interview session. Your webcam will monitor eye movement for integrity tracking." color="#6c63ff" onClick={() => onSelect("candidate")} />
        <RoleCard icon="" title="Interviewer" description="Set up interview context, upload resume and JD, then get live AI analysis and follow-up suggestions." color="#00d4aa" onClick={() => onSelect("interviewer")} />
      </div>
    </div>
  );
}

function RoleCard({ icon, title, description, color, onClick }) {
  return (
    <div onClick={onClick} style={{ background: "var(--surface)", border: `2px solid ${color}44`, borderRadius: 16, padding: "32px 28px", maxWidth: 300, textAlign: "center", cursor: "pointer", transition: "border-color .2s, transform .15s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "translateY(-4px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}44`; e.currentTarget.style.transform = "translateY(0)"; }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color, marginBottom: 10 }}>{title}</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>{description}</p>
      <button style={{ marginTop: 20, background: color, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" }}>
        Enter as {title}
      </button>
    </div>
  );
}
