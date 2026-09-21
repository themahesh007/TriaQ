import React, { useState, useEffect, useCallback, useMemo } from "react";
import ClinicalSummaryCard from "../components/ClinicalSummaryCard";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export default function StaffPortal({ onNavigateHome }) {
  const [staffSession, setStaffSession] = useState(() => {
    try {
      const saved = localStorage.getItem("triaq_staff_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forced password change state
  const [requiresPwChange, setRequiresPwChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Dashboard states
  const [queue, setQueue] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [editableSummary, setEditableSummary] = useState("");
  const [originalSummary, setOriginalSummary] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");
  const [disposition, setDisposition] = useState("Routine OPD Treatment");
  const [prescription, setPrescription] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [notification, setNotification] = useState("");
  const [consultationRoom, setConsultationRoom] = useState("Room 2");
  const [callingToken, setCallingToken] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [summaryViewMode, setSummaryViewMode] = useState("cards");

  // Admin tab states
  const [activeAdminTab, setActiveAdminTab] = useState("queue"); // queue | staff_manage
  const [allStaffList, setAllStaffList] = useState([]);

  // Synthesized Web Audio chime
  const playHospitalChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now + 0.16);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.16);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.65);
    } catch {}
  };

  const handleCallPatient = (noteToCall = null) => {
    const note = noteToCall || selectedNote;
    if (!note) return;
    const token = note.patient?.tokenId || note.tokenId || "Patient";
    setCallingToken(token);
    playHospitalChime();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const message = `Token ${token}, please proceed to Doctor Consultation ${consultationRoom}.`;
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      setTimeout(() => window.speechSynthesis.speak(utterance), 250);
    }

    setNotification(`📢 Calling Token ${token} to ${consultationRoom}...`);
    setTimeout(() => setCallingToken(""), 5000);
  };

  const fetchDashboardData = useCallback(async () => {
    if (!staffSession) return;
    try {
      const headers = { Authorization: `Bearer ${staffSession.token}` };
      const notesRes = await fetch(`${API_BASE}/api/triage-notes?status=PENDING`, { headers });
      if (notesRes.ok) {
        const notes = await notesRes.json();
        setQueue(notes);
        setSelectedNote((curr) => {
          if (curr) {
            const match = notes.find((n) => n.id === curr.id);
            if (match) return match;
          }
          if (notes.length > 0) {
            setEditableSummary(notes[0].summary || "");
            setOriginalSummary(notes[0].summary || "");
            setDisposition(notes[0].disposition || "Routine OPD Treatment");
            setPrescription(notes[0].prescription || "");
            return notes[0];
          }
          return null;
        });
      }

      const logsRes = await fetch(`${API_BASE}/api/audit-log?limit=50`, { headers });
      if (logsRes.ok) {
        setAuditLogs(await logsRes.json());
      }

      if (staffSession.staff?.role === "ADMIN") {
        const staffRes = await fetch(`${API_BASE}/api/master/all-staff`, { headers });
        if (staffRes.ok) {
          setAllStaffList(await staffRes.json());
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  }, [staffSession]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Staff Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Staff login failed");

      localStorage.setItem("triaq_staff_session", JSON.stringify(data));
      setStaffSession(data);
      if (data.staff?.requiresPasswordChange) {
        setRequiresPwChange(true);
      }
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail, rolePw) => {
    setEmail(roleEmail);
    setPassword(rolePw);
  };

  const handleLogout = () => {
    localStorage.removeItem("triaq_staff_session");
    setStaffSession(null);
    setSelectedNote(null);
  };

  // Staff Decisions
  const handleDecision = async (action) => {
    if (!selectedNote) return;
    setLoading(true);
    setNotification("");
    try {
      const res = await fetch(`${API_BASE}/api/triage-notes/${selectedNote.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${staffSession.token}`
        },
        body: JSON.stringify({
          action,
          reviewerId: staffSession.staff?.name || "Clinical Reviewer",
          editedSummary: action === "EDIT_APPROVE" ? editableSummary : undefined,
          note: reviewerNote,
          disposition,
          prescription,
          reason: reviewerNote
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update decision");
      }

      setNotification(`✓ Case successfully ${action} by ${staffSession.staff?.name}!`);
      await fetchDashboardData();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.open(`${API_BASE}/api/export-csv`, "_blank");
  };

  const userRole = (staffSession?.staff?.role || "DOCTOR").toUpperCase();
  const isDoctor = userRole === "DOCTOR" || userRole === "MASTER";
  const isNurse = userRole === "NURSE";
  const isAdmin = userRole === "ADMIN" || userRole === "MASTER";

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      if (priorityFilter === "RED" && item.riskTag !== "RED") return false;
      if (priorityFilter === "YELLOW" && item.riskTag !== "YELLOW" && item.riskTag !== "AMBER") return false;
      if (priorityFilter === "GREEN" && item.riskTag !== "GREEN") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const token = (item.patient?.tokenId || "").toLowerCase();
        const text = (item.rawSymptomText || item.summary || "").toLowerCase();
        return token.includes(q) || text.includes(q);
      }
      return true;
    });
  }, [queue, priorityFilter, searchQuery]);

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateHome}
            className="text-[12px] font-bold text-slate-500 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
          >
            ← Home
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-[12.5px] font-black text-slate-800 uppercase tracking-wider">
            Staff Clinical Station
          </span>
        </div>

        {staffSession && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-900 text-white uppercase tracking-wider">
              {staffSession.staff?.role || "STAFF"}
            </span>
            <span className="text-[12.5px] font-bold text-slate-800">
              {staffSession.staff?.name}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-[11.5px] font-bold text-rose-600 hover:underline cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* LOGIN SCREEN IF NOT AUTHENTICATED */}
      {!staffSession ? (
        <div className="max-w-md mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <span className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-xl mx-auto mb-2">
              👨‍⚕️
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Hospital Staff Login
            </h2>
            <p className="text-[13px] text-slate-500 font-medium">
              Authorized clinical login for Doctors, Nurses, and Facility Administrators.
            </p>
          </div>

          {/* Quick Fill Demo Credentials */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <span className="text-[10.5px] font-black uppercase text-slate-500 tracking-wider block text-center">
              Quick Demo Login Pills (Click to test role):
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickLogin("doctor@triaq.org", "Doctor@123")}
                className="py-1.5 px-2 rounded-lg bg-white hover:bg-emerald-50 text-[11px] font-bold text-emerald-800 border border-slate-200 hover:border-emerald-300 transition cursor-pointer shadow-2xs text-center"
              >
                🩺 Doctor
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("nurse@triaq.org", "Nurse@123")}
                className="py-1.5 px-2 rounded-lg bg-white hover:bg-teal-50 text-[11px] font-bold text-teal-800 border border-slate-200 hover:border-teal-300 transition cursor-pointer shadow-2xs text-center"
              >
                👩‍⚕️ Nurse
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("admin@triaq.org", "Admin@123")}
                className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 text-[11px] font-bold text-slate-800 border border-slate-200 hover:border-slate-400 transition cursor-pointer shadow-2xs text-center"
              >
                🏢 Admin
              </button>
            </div>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12.5px] font-bold text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Hospital Staff Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@triaq.org"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-black text-[14px] text-white bg-slate-900 hover:bg-slate-800 transition cursor-pointer shadow-xs active:scale-98"
            >
              {loading ? "Verifying..." : "Sign In to Workstation →"}
            </button>
          </form>
        </div>
      ) : (
        /* STAFF DASHBOARD VIEW */
        <div className="space-y-6">
          {/* Dashboard Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveAdminTab("queue")}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition cursor-pointer ${
                    activeAdminTab === "queue" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                  }`}
                >
                  🩺 Priority Queue ({queue.length})
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setActiveAdminTab("staff_manage")}
                    className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition cursor-pointer ${
                      activeAdminTab === "staff_manage" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    👥 Staff Management
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-[12px] font-bold text-slate-500">OPD Room:</span>
                <select
                  value={consultationRoom}
                  onChange={(e) => setConsultationRoom(e.target.value)}
                  className="text-[12.5px] font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
                >
                  <option value="Room 1">Room 1</option>
                  <option value="Room 2">Room 2</option>
                  <option value="Room 3">Room 3</option>
                  <option value="Emergency OPD">Emergency OPD</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl font-bold text-[12.5px] border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <span>📥</span>
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={fetchDashboardData}
                className="px-3 py-2 rounded-xl font-bold text-[12.5px] bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer shadow-2xs"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {notification && (
            <div className="p-3.5 rounded-xl text-[13px] font-bold bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between">
              <span>{notification}</span>
              <button onClick={() => setNotification("")} className="cursor-pointer font-black">✕</button>
            </div>
          )}

          {/* MAIN TWO COLUMN QUEUE WORKSTATION */}
          {activeAdminTab === "queue" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Waiting Queue */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-[18px] font-black tracking-tight text-slate-900">
                    Patient Queue ({filteredQueue.length})
                  </h2>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    RED → YELLOW → GREEN
                  </span>
                </div>

                {/* Priority Filter Tabs */}
                <div className="grid grid-cols-4 gap-2">
                  {["ALL", "RED", "YELLOW", "GREEN"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setPriorityFilter(tag)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-black border transition cursor-pointer text-center ${
                        priorityFilter === tag
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search token or symptoms..."
                  className="w-full px-3.5 py-2 text-[12.5px] bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs font-medium"
                />

                {/* Queue List */}
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {filteredQueue.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 border border-slate-200 text-center space-y-1">
                      <p className="font-bold text-[14px] text-slate-800">Queue is clear</p>
                      <p className="text-[12px] text-slate-400">No matching triage cases pending review.</p>
                    </div>
                  ) : (
                    filteredQueue.map((item) => {
                      const isSelected = selectedNote?.id === item.id;
                      const riskColor = item.riskTag === "RED" ? "#B23A2E" : item.riskTag === "YELLOW" || item.riskTag === "AMBER" ? "#EAB308" : "#3F7D52";
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedNote(item);
                            setEditableSummary(item.summary || "");
                            setOriginalSummary(item.summary || "");
                            setDisposition(item.disposition || "Routine OPD Treatment");
                            setPrescription(item.prescription || "");
                          }}
                          className={`bg-white rounded-xl p-3.5 border transition-all cursor-pointer ${
                            isSelected
                              ? "shadow-sm ring-2 ring-emerald-600 bg-emerald-50/20 border-emerald-500"
                              : "border-slate-200/90 hover:shadow-xs hover:border-slate-300"
                          }`}
                          style={{ borderLeftWidth: "5px", borderLeftColor: riskColor }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-[14.5px] text-slate-900">
                              {item.patient?.tokenId || "Token"}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCallPatient(item);
                                }}
                                className={`text-[10.5px] px-2 py-0.5 font-black rounded border cursor-pointer ${
                                  callingToken === (item.patient?.tokenId || item.tokenId)
                                    ? "bg-emerald-600 text-white animate-pulse"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-600 hover:text-white"
                                }`}
                              >
                                📢 Call
                              </button>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  item.riskTag === "RED"
                                    ? "bg-rose-100 text-rose-800"
                                    : item.riskTag === "YELLOW" || item.riskTag === "AMBER"
                                    ? "bg-amber-100 text-amber-900"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {item.riskTag}
                              </span>
                            </div>
                          </div>

                          <p className="text-[12.5px] line-clamp-2 text-slate-600 font-medium leading-relaxed">
                            {item.summary || item.rawSymptomText}
                          </p>

                          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 text-slate-400 font-medium">
                            <span className="text-emerald-700 font-bold">
                              {item.receiptNumber ? item.receiptNumber.slice(-7) : "OPD Pass"}
                            </span>
                            <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Case Details & Action Desk */}
              <div className="lg:col-span-7">
                {!selectedNote ? (
                  <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-400 space-y-2 min-h-[420px] flex flex-col items-center justify-center">
                    <span className="text-4xl block">🩺</span>
                    <p className="font-bold text-[15px] text-slate-700">Select a patient from the queue</p>
                    <p className="text-[13px] text-slate-400 max-w-sm">
                      Inspect vitals, review structured summary, and record clinical disposition.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
                    {/* Patient Header & PII Guard */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-slate-400">
                            {selectedNote.facility || "Apollo PHC Hub"}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Receipt: {selectedNote.receiptNumber || selectedNote.patient?.tokenId}
                          </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mt-0.5">
                          {selectedNote.patient?.tokenId || "Token Patient"}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCallPatient(selectedNote)}
                          className="px-3 py-1.5 rounded-xl font-black text-[12px] bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-300 transition cursor-pointer"
                        >
                          📢 Call Patient to {consultationRoom}
                        </button>
                        <span
                          className={`px-3 py-1 rounded-full font-black text-[12px] ${
                            selectedNote.riskTag === "RED"
                              ? "bg-rose-100 text-rose-800"
                              : selectedNote.riskTag === "YELLOW" || selectedNote.riskTag === "AMBER"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {selectedNote.riskTag}
                        </span>
                      </div>
                    </div>

                    {/* Patient Demographics & Encrypted PII Card */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                          Patient Demographics {isDoctor ? "(Decrypted for Doctor)" : "(Masked for Nurse)"}
                        </span>
                        {!isDoctor && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            🔒 PII Protected
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12.5px]">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Name</span>
                          <span className="font-bold text-slate-900">{selectedNote.patient?.name || "Patient"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Age</span>
                          <span className="font-bold text-slate-900">{selectedNote.patient?.age || "--"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Phone</span>
                          <span className="font-bold text-slate-900">{selectedNote.patient?.phone || "--"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Ward / Area</span>
                          <span className="font-bold text-slate-900">{selectedNote.patient?.address || "--"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vitals Snapshot */}
                    {selectedNote.vitals && (
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                        <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                          Recorded Vitals
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px] font-bold">
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            BP: {selectedNote.vitals.bpSystolic || "--"} / {selectedNote.vitals.bpDiastolic || "--"} mmHg
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            Pulse: {selectedNote.vitals.pulse || "--"} bpm
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            SpO2: {selectedNote.vitals.spo2 || "--"} %
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            Temp: {selectedNote.vitals.temp || "--"} °F
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Summary View & Editor */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[13px] font-black text-slate-900">
                          Structured Patient Summary
                        </label>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                          <button
                            type="button"
                            onClick={() => setSummaryViewMode("cards")}
                            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                              summaryViewMode === "cards" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                            }`}
                          >
                            Clean Cards
                          </button>
                          {isDoctor && (
                            <button
                              type="button"
                              onClick={() => setSummaryViewMode("edit")}
                              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                                summaryViewMode === "edit" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                              }`}
                            >
                              Edit Text
                            </button>
                          )}
                        </div>
                      </div>

                      {summaryViewMode === "cards" ? (
                        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
                          <ClinicalSummaryCard summary={editableSummary} language={selectedNote.language} />
                        </div>
                      ) : (
                        <textarea
                          rows={6}
                          value={editableSummary}
                          onChange={(e) => setEditableSummary(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 text-[13.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white shadow-2xs leading-relaxed"
                        />
                      )}
                    </div>

                    {/* Clinical Disposition & Prescription (Doctor Only) */}
                    {isDoctor && (
                      <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/40 space-y-3">
                        <label className="text-[12.5px] font-black text-emerald-950 flex items-center gap-1.5">
                          <span>💊</span> Doctor Clinical Disposition & Prescription (Rx)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {[
                            "Routine OPD Treatment",
                            "Admit to Emergency Ward",
                            "Refer to District Hospital",
                            "Discharged with Advice"
                          ].map((disp) => (
                            <button
                              key={disp}
                              type="button"
                              onClick={() => setDisposition(disp)}
                              className={`p-2 rounded-xl text-[11.5px] font-bold border transition text-center cursor-pointer ${
                                disposition === disp
                                  ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {disp}
                            </button>
                          ))}
                        </div>

                        {/* Quick Medication Chips */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {[
                            "Paracetamol 500mg TDS",
                            "ORS Sachet 1 pack/1L",
                            "Cetirizine 10mg OD HS",
                            "Amoxicillin 500mg TDS"
                          ].map((med, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPrescription((prev) => (prev ? `${prev}\n• ${med}` : `• ${med}`))}
                              className="text-[10.5px] px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-emerald-400 font-bold text-slate-700 cursor-pointer"
                            >
                              + {med}
                            </button>
                          ))}
                        </div>

                        <textarea
                          rows={2}
                          value={prescription}
                          onChange={(e) => setPrescription(e.target.value)}
                          placeholder="Type prescription & dosage instructions..."
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-900 outline-none focus:border-emerald-600 shadow-2xs"
                        />
                      </div>
                    )}

                    {/* Action Decision Buttons Based on Role */}
                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      {isDoctor && (
                        <>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleDecision("APPROVE")}
                            className="px-5 py-2.5 rounded-xl font-bold text-[13px] border border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                          >
                            ✓ Approve
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleDecision("EDIT_APPROVE")}
                            className="px-5 py-2.5 rounded-xl font-black text-[13px] text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 transition cursor-pointer shadow-xs"
                          >
                            ✏️ Save Edit & Approve
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleDecision("REJECT")}
                            className="px-5 py-2.5 rounded-xl font-bold text-[13px] border border-rose-300 text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}

                      {isNurse && (
                        <div className="w-full flex items-center justify-between gap-3">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleDecision("ESCALATE")}
                            className="flex-1 py-2.5 rounded-xl font-black text-[13px] text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer shadow-xs"
                          >
                            📋 Escalate to Doctor (Flag Case for Dr. Sharma)
                          </button>
                          <span className="text-[11.5px] font-bold text-slate-400">
                            Nurses triage & escalate; Doctors approve & prescribe
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ADMIN TAB: STAFF ACCOUNTS & MANAGEMENT */
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-black text-slate-900">Hospital Staff Directory & Roles</h3>
                <span className="text-[11px] font-bold text-slate-400">Facility Governance Desk</span>
              </div>

              <div className="divide-y divide-slate-100">
                {allStaffList.map((s) => (
                  <div key={s.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-black text-[13.5px] text-slate-900 block">{s.name}</span>
                      <span className="text-[11.5px] text-slate-500 font-medium">{s.email} • {s.facility}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {s.role}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOTTOM IMMUTABLE AUDIT TRAIL */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-[16px] font-black text-slate-900">Recent Decisions & Audit Trail</h3>
              <span className="text-[11px] font-bold text-slate-400">{auditLogs.length} logged actions</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto text-[12px]">
              {auditLogs.map((entry) => (
                <div key={entry.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">[{entry.action}]</span>
                    <span className="text-slate-700">Token {entry.triageNote?.tokenId || "Patient"}</span>
                    <span className="text-slate-400">— by <strong>{entry.reviewerId}</strong></span>
                    {entry.disposition && (
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">
                        {entry.disposition}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
