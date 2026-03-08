import { useState } from "react";
import { uploadResume, parseResume } from "../../shared/api.js";
import { Spinner, Alert } from "../../shared/UI.jsx";

export default function ResumeParser({ onParsed }) {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  async function handleFileUpload(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoading(true);
    setError(null);
    try {
      const { text: extractedText } = await uploadResume(selectedFile);
      const { parsed } = await parseResume(extractedText);
      setParsedData(parsed);
      onParsed(parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTextSubmit() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { parsed } = await parseResume(text);
      setParsedData(parsed);
      onParsed(parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="resume-parser">
      <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>📄 Resume Analysis</h3>
      
      {!parsedData ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div 
            style={{ 
              border: "2px dashed var(--border)", 
              borderRadius: "var(--radius)", 
              padding: 30, 
              textAlign: "center",
              background: "var(--surface2)",
              cursor: "pointer",
              position: "relative"
            }}
          >
            <input 
              type="file" 
              onChange={handleFileUpload} 
              accept=".pdf,.docx,.doc,.txt"
              style={{ 
                position: "absolute", 
                inset: 0, 
                opacity: 0, 
                cursor: "pointer" 
              }} 
            />
            <div style={{ fontSize: 32, marginBottom: 8 }}>📤</div>
            <div style={{ fontWeight: 600 }}>{file ? file.name : "Click or drag resume"}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>PDF, DOCX, TXT supported</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }}></div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>OR PASTE TEXT</div>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }}></div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea 
              value={text} 
              onChange={e => setText(e.target.value)} 
              placeholder="Paste raw resume text here..." 
              style={{ minHeight: 120 }} 
            />
            <button 
              className="btn-primary" 
              onClick={handleTextSubmit} 
              disabled={!text.trim() || loading}
            >
              {loading ? "Analyzing..." : "Analyze Text"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--surface2)", borderRadius: "var(--radius)", padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{parsedData.name || "Candidate"}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>{parsedData.email}</div>
            </div>
            <button 
              className="btn-secondary" 
              style={{ fontSize: 12, padding: "6px 12px" }} 
              onClick={() => { setParsedData(null); onParsed(null); setFile(null); setText(""); }}
            >
              🔄 Reset
            </button>
          </div>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {(parsedData.skills || []).slice(0, 8).map((s, i) => (
              <span key={i} style={{ 
                background: "var(--accent)20", 
                border: "1px solid var(--accent)40", 
                borderRadius: 20, 
                padding: "2px 10px", 
                fontSize: 11, 
                color: "var(--accent)" 
              }}>
                {s}
              </span>
            ))}
            {(parsedData.skills || []).length > 8 && (
              <span style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center" }}>
                +{parsedData.skills.length - 8} more
              </span>
            )}
          </div>

          <div style={{ fontSize: 13, color: "var(--accent2)", fontWeight: 600 }}>
            ✅ Resume parsed successfully
          </div>
        </div>
      )}

      {error && <Alert type="danger" style={{ marginTop: 16 }}>{error}</Alert>}
      {loading && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Spinner size="sm" />
          <span style={{ marginLeft: 8, fontSize: 13, color: "var(--muted)" }}>Processing...</span>
        </div>
      )}
    </div>
  );
}
