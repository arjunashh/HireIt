import { useState } from "react";
import RoleSelect from "./modules/RoleSelect/index.jsx";
import CandidateRoom from "./modules/CandidateRoom/index.jsx";
import InterviewerSetup from "./modules/InterviewerSetup/index.jsx";
import InterviewRoom from "./modules/InterviewRoom/index.jsx";
import ReportView from "./modules/Report/index.jsx";

export default function App() {
  const [screen, setScreen] = useState("role");
  const [role, setRole] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [report, setReport] = useState(null);

  function handleRoleSelect(r) {
    setRole(r);
    setScreen(r === "candidate" ? "candidate" : "interviewer-setup");
  }

  function handleSessionReady(data) {
    setSessionData(data);
    setScreen("interview");
  }

  function handleReportReady(r) {
    setReport(r);
    setScreen("report");
  }

  function reset() {
    setScreen("role");
    setRole(null);
    setSessionData(null);
    setReport(null);
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      {screen === "role" && <RoleSelect onSelect={handleRoleSelect} />}
      {screen === "candidate" && <CandidateRoom onBack={reset} />}
      {screen === "interviewer-setup" && (
        <InterviewerSetup onReady={handleSessionReady} onBack={reset} />
      )}
      {screen === "interview" && sessionData && (
        <InterviewRoom session={sessionData} onReport={handleReportReady} onBack={reset} />
      )}
      {screen === "report" && report && (
        <ReportView report={report} onBack={reset} />
      )}
    </div>
  );
}
