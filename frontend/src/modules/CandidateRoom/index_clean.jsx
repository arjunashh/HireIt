import { useState, useEffect, useRef } from "react";
import { Alert, Spinner, ScoreBar } from "../../shared/UI.jsx";
import { factCheck, uploadResume, parseResume } from "../../shared/api.js";

export default function CandidateRoom({ onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [integrityLog, setIntegrityLog] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [started, setStarted] = useState(false);
  const [gazeAlert, setGazeAlert] = useState(null);
  const [eyeStatus, setEyeStatus] = useState("Initializing...");
  const [faceDetected, setFaceDetected] = useState(false);
  const recognitionRef = useRef(null);
  const lookAwayTimer = useRef(null);
  const faceApiLoaded = useRef(false);
  const trackingInterval = useRef(null);

  // Resume
  const [resumeParsed, setResumeParsed] = useState(null);
  const [resumeRawText, setResumeRawText] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);

  // Analysis
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  // -- Load face-api.js from CDN ---------------------------------------------
  async function loadFaceApi() {
    if (faceApiLoaded.current) return true;
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
      script.onload = async () => {
        try {
          const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
          await Promise.all([
            window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            window.faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          ]);
          faceApiLoaded.current = true;
          resolve(true);
        } catch {
          resolve(false);
        }
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  // -- Start eye tracking ----------------------------------------------------
  async function startEyeTracking() {
    setEyeStatus("Loading face detection model...");
    const loaded = await loadFaceApi();
    if (!loaded) {
      setEyeStatus("Face detection unavailable");
      return;
    }
    setEyeStatus("Face detection active");

    let lookAwayCount = 0;

    trackingInterval.current = setInterval(async () => {
      if (!videoRef.current || !window.faceapi) return;
      try {
        const detection = await window.faceapi
          .detectSingleFace(videoRef.current, new window.faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks(true);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!detection) {
          lookAwayCount++;
          setFaceDetected(false);
          setEyeStatus("No face detected");
          if (lookAwayCount === 2) {
            logEvent("?? Face not detected — candidate may have looked away");
            setGazeAlert("Please face the camera.");
            clearTimeout(lookAwayTimer.current);
            lookAwayTimer.current = setTimeout(() => setGazeAlert(null), 5000);
          }
          return;
        }

        lookAwayCount = 0;
        setFaceDetected(true);

        // Draw face box
        const { x, y, width, height } = detection.detection.box;
        const scaleX = canvas.width / videoRef.current.videoWidth;
        const scaleY = canvas.height / videoRef.current.videoHeight;
        ctx.strokeStyle = "#00e5b0";
        ctx.lineWidth = 2;
        ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY);

        // Draw eye landmarks
        const landmarks = detection.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();

        ctx.fillStyle = "#7c6dff";
        [...leftEye, ...rightEye].forEach(pt => {
          ctx.beginPath();
          ctx.arc(pt.x * scaleX, pt.y * scaleY, 2, 0, Math.PI * 2);
          ctx.fill();
        });

        // Check gaze direction: compare eye center X to face center X
        const leftEyeCenter = leftEye.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
        leftEyeCenter.x /= leftEye.length;
        leftEyeCenter.y /= leftEye.length;
        const rightEyeCenter = rightEye.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
        rightEyeCenter.x /= rightEye.length;
        rightEyeCenter.y /= rightEye.length;
        const eyeMidX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
        const faceCenterX = x + width / 2;
        const gaze = (eyeMidX - faceCenterX) / width;

        if (Math.abs(gaze) > 0.15) {
          setEyeStatus(`Gaze deviation: looking ${gaze > 0 ? "right" : "left"}`);
          logEvent(`?? Gaze deviation detected (${gaze > 0 ? "right" : "left"})`);
          setGazeAlert("Please look straight at the camera.");
          clearTimeout(lookAwayTimer.current);
          lookAwayTimer.current = setTimeout(() => setGazeAlert(null), 4000);
        } else {
          setEyeStatus("Face & gaze detected ?");
        }
      } catch { }
    }, 1500);
  }

  // -- Tab switch detection ---------------------------------------------------
  useEffect(() => {
    if (!started) return;
    function handleVisibility() {
      if (document.hidden) {
        logEvent("?? Tab switched — candidate left interview tab");
        setGazeAlert("Tab switch detected!");
        setTimeout(() => setGazeAlert(null), 5000);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [started]);

  function logEvent(msg) {
    setIntegrityLog(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev]);
  }

  // -- Camera ----------------------------------------------------------------
  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => {
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth || 640;
            canvasRef.current.height = videoRef.current.videoHeight || 480;
          }
          startEyeTracking();
        };
      }
    } catch {
      logEvent("?? Camera/mic permission denied");
    }
  }

  // -- Cleanup ---------------------------------------------------------------
  function stopAll() {
    stream?.getTracks().forEach(t => t.stop());
    recognitionRef.current?.stop();
    clearInterval(trackingInterval.current);
  }

  // -- Resume upload ---------------------------------------------------------
  async function handleResumeFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setResumeLoading(true);
    try {
      const { text } = await uploadResume(file);
      setResumeRawText(text);
      const { parsed } = await parseResume(text);
      setResumeParsed(parsed);
    } catch (err) { alert("Resume upload failed: " + err.message); }
    finally { setResumeLoading(false); }
  }

  async function handleResumeText() {
    if (!resumeRawText.trim()) return;
    setResumeLoading(true);
    try {
      const { parsed } = await parseResume(resumeRawText);
      setResumeParsed(parsed);
    } catch (err) { alert("Resume parse failed: " + err.message); }
    finally { setResumeLoading(false); }
  }

  // -- Mic -------------------------------------------------------------------
  function toggleMic() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      logEvent("Speech recognition not supported"); return;
    }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setTranscript(t);
    };
    r.onend = () => setIsListening(false);
    r.start();
    recognitionRef.current = r;
    setIsListening(true);
    logEvent("Microphone activated");
  }

  // -- Analyze ---------------------------------------------------------------
  async function analyzeTranscript() {
    if (!transcript.trim() || !resumeParsed) return;
    setAnalyzing(true); setAnalyzeError(null);
    try {
      const result = await factCheck(transcript, resumeParsed);
      setAnalysisResult(result);
      logEvent("?? AI analysis complete: " + result.verdict);
    } catch (err) { setAnalyzeError(err.message); }
    finally { setAnalyzing(false); }
  }

  // -- Setup screen ----------------------------------------------------------
  if (!started) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 520, width: "100%" }}>
          <button className="btn-secondary" onClick={onBack} style={{ marginBottom: 24, fontSize: 13 }}>? Back</button>
          <div className="card">
            <h2 style={{ marginBottom: 6, fontSize: 22 }}>?? Candidate Setup</h2>
            <p style={{ color: "var(--muted)", marginBottom: 20, fontSize: 14 }}>Upload your resume. AI will fact-check your spoken answers against it in real time.</p>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--muted)" }}>Full Name</label>
            <input value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="e.g. Jane Smith" style={{ marginBottom: 16 }} />
            <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "var(--muted)" }}>Your Resume</label>
            {!resumeParsed ? (
              <div style={{ marginBottom: 16 }}>
                <label style={{ background: "var(--surface2)", border: "2px dashed var(--border)", borderRadius: "var(--radius)", padding: 16, textAlign: "center", display: "block", cursor: "pointer", marginBottom: 10 }}>
                  <input type="file" accept=".pdf,.docx,.txt" onChange={handleResumeFile} style={{ display: "none" }} />
                  {resumeLoading ? <Spinner /> : <><div style={{ fontSize: 20, marginBottom: 4 }}>?? Upload File</div><div style={{ fontSize: 13, color: "var(--muted)" }}>PDF, DOCX or TXT</div></>}
                </label>
                <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, marginBottom: 8 }}>— or paste —</div>
                <textarea value={resumeRawText} onChange={e => setResumeRawText(e.target.value)} placeholder="Paste resume text..." style={{ minHeight: 100, marginBottom: 8 }} />
                <button className="btn-secondary" onClick={handleResumeText} disabled={!resumeRawText.trim() || resumeLoading} style={{ width: "100%" }}>
                  {resumeLoading ? "Parsing..." : "Parse Resume"}
                </button>
              </div>
            ) : (
              <div style={{ background: "var(--surface2)", borderRadius: "var(--radius)", padding: 14, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700 }}>{resumeParsed.name || "Resume loaded"}</span>
                  <button className="btn-secondary" onClick={() => { setResumeParsed(null); setResumeRawText(""); }} style={{ fontSize: 12, padding: "4px 10px" }}>Clear</button>
                </div>
                <div>{(resumeParsed.skills || []).slice(0, 8).map((s, i) => <span key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "2px 10px", fontSize: 12, margin: 3, display: "inline-block" }}>{s}</span>)}</div>
                <div style={{ marginTop: 8, fontSize: 13, color: "var(--accent2)", fontWeight: 600 }}>? Resume ready for AI analysis</div>
              </div>
            )}
            <Alert type="info">?? Eye tracking will run live using face detection. AI will fact-check your spoken answers against your resume.</Alert>
            <button className="btn-primary" onClick={() => { setStarted(true); startCamera(); logEvent("? Interview session started"); }} disabled={!candidateName.trim() || !resumeParsed} style={{ marginTop: 16, width: "100%" }}>
              Start Interview Session
            </button>
            {!resumeParsed && <p style={{ textAlign: "center", fontSize: 12, color: "var(--danger)", marginTop: 8 }}>?? Upload your resume to continue</p>}
          </div>
        </div>
      </div>
    );
  }

  // -- Interview screen ------------------------------------------------------
  const verdictColor = { consistent: "var(--accent2)", inconsistent: "var(--danger)", unverifiable: "var(--warn)" };

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>?? Candidate: {candidateName}</h2>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Interview in progress — stay focused on the screen</p>
          </div>
          <button className="btn-danger" onClick={() => { stopAll(); onBack(); }}>End & Exit</button>
        </div>

        {gazeAlert && <Alert type="warn" style={{ marginBottom: 16 }}>?? {gazeAlert}</Alert>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Camera + eye tracking overlay */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>?? Camera + Eye Tracking</h3>
              <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: faceDetected ? "#00e5b015" : "#ff456615", border: `1px solid ${faceDetected ? "var(--accent2)" : "var(--danger)"}`, color: faceDetected ? "var(--accent2)" : "var(--danger)" }}>
                {faceDetected ? "Face detected ?" : "No face"}
              </span>
            </div>
            <div style={{ position: "relative", width: "100%", background: "#000", borderRadius: 8, overflow: "hidden", minHeight: 240 }}>
              <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", display: "block" }} />
              <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: stream ? "var(--accent2)" : "var(--danger)", flexShrink: 0 }} />
              {eyeStatus}
            </div>
          </div>

          {/* Mic + transcript + analyze */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 13, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>Microphone & Analysis</h3>
            <button className={isListening ? "btn-danger" : "btn-success"} onClick={toggleMic} style={{ width: "100%" }}>
              {isListening ? "? Stop Listening" : "? Start Speaking"}
            </button>
            <div style={{ background: "var(--surface2)", borderRadius: 8, padding: 12, minHeight: 120, fontSize: 14, lineHeight: 1.7, color: transcript ? "var(--text)" : "var(--muted)", flex: 1 }}>
              {transcript || "Your speech will appear here in real time..."}
            </div>
            {analyzeError && <Alert type="danger">{analyzeError}</Alert>}
            <button className="btn-primary" onClick={analyzeTranscript} disabled={!transcript.trim() || analyzing} style={{ width: "100%" }}>
              {analyzing ? "Analyzing against resume..." : "?? Analyze My Answer vs Resume"}
            </button>
          </div>

          {/* Analysis result */}
          {analysisResult && (
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <h3 style={{ marginBottom: 16, fontSize: 13, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>?? Resume Cross-Check Result</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ fontSize: 36 }}>{analysisResult.verdict === "consistent" ? "?" : analysisResult.verdict === "inconsistent" ? "?" : "??"}</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: verdictColor[analysisResult.verdict] }}>{(analysisResult.verdict || "").toUpperCase()}</div>
                      <div style={{ fontSize: 13, color: "var(--muted)" }}>Confidence: {analysisResult.confidence}%</div>
                    </div>
                  </div>
                  <ScoreBar label="Confidence Score" score={Math.round((analysisResult.confidence || 0) / 10)} />
                  <p style={{ fontSize: 14, lineHeight: 1.7, marginTop: 10 }}>{analysisResult.explanation}</p>
                </div>
                <div>
                  {analysisResult.resume_evidence && (
                    <div style={{ background: "var(--surface2)", borderRadius: 8, padding: 14, marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>?? Resume Evidence</div>
                      <p style={{ fontSize: 13, lineHeight: 1.6 }}>{analysisResult.resume_evidence}</p>
                    </div>
                  )}
                  {analysisResult.flags?.length > 0 && analysisResult.flags.map((f, i) => (
                    <div key={i} style={{ fontSize: 13, padding: "7px 12px", background: "#ff4d6d11", borderRadius: 6, marginBottom: 6, borderLeft: "3px solid var(--danger)" }}>{f}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Integrity log */}
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <h3 style={{ marginBottom: 12, fontSize: 13, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>Integrity Log</h3>
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              {integrityLog.length === 0
                ? <p style={{ color: "var(--muted)", fontSize: 13 }}>No events logged yet.</p>
                : integrityLog.map((e, i) => (
                  <div key={i} style={{ fontSize: 13, padding: "5px 0", borderBottom: "1px solid var(--border)", display: "flex", gap: 12 }}>
                    <span style={{ color: "var(--muted)", minWidth: 70, fontSize: 11 }}>{e.time}</span>
                    <span>{e.msg}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
