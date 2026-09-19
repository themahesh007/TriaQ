import React, { useState, useEffect, useCallback, useMemo } from "react";
import ClinicalSummaryCard from "../components/ClinicalSummaryCard";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export default function DashboardPage({ onQueueUpdated }) {
  const [queue, setQueue] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [editableSummary, setEditableSummary] = useState("");
  const [originalSummary, setOriginalSummary] = useState("");
  const [reviewerId, setReviewerId] = useState("Dr. Sharma");
  const [reviewerNote, setReviewerNote] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState("");

  // Doctor Clinical Disposition & Prescription States
  const [consultationRoom, setConsultationRoom] = useState("Room 2");
  const [disposition, setDisposition] = useState("Routine OPD Treatment");
  const [prescription, setPrescription] = useState("");
  const [callingToken, setCallingToken] = useState("");

  // Filter & search states
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [resolvedMissingMap, setResolvedMissingMap] = useState({});
  const [summaryViewMode, setSummaryViewMode] = useState("cards");

  const fetchQueueAndLogs = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      // 1. Fetch pending notes
      const notesRes = await fetch(`${API_BASE}/api/triage-notes?status=PENDING`);
      if (notesRes.ok) {
        const notes = await notesRes.json();
        setQueue(notes);
        if (onQueueUpdated) onQueueUpdated(notes.length);

        // Keep or clear selected note
        setSelectedNote((currentSelected) => {
          if (currentSelected) {
            const stillThere = notes.find((n) => n.id === currentSelected.id);
            if (stillThere) return stillThere;
          }
          if (notes.length > 0) {
            setEditableSummary(notes[0].summary || "");
            setOriginalSummary(notes[0].summary || "");
            setDisposition(notes[0].disposition || "Routine OPD Treatment");
            setPrescription(notes[0].prescription || "");
            return notes[0];
          }
          setEditableSummary("");
          setOriginalSummary("");
          setDisposition("Routine OPD Treatment");
          setPrescription("");
          return null;
        });
      }

      // 2. Fetch audit logs
      const auditRes = await fetch(`${API_BASE}/api/audit-log?limit=50`);
      if (auditRes.ok) {
        const logs = await auditRes.json();
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [onQueueUpdated]);

  useEffect(() => {
    fetchQueueAndLogs();
  }, [fetchQueueAndLogs]);

  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setEditableSummary(note.summary || "");
    setOriginalSummary(note.summary || "");
    setReviewerNote("");
    setDisposition(note.disposition || "Routine OPD Treatment");
    setPrescription(note.prescription || "");
    setNotification("");
    setSummaryViewMode("cards");
  };

  // Synthesized Web Audio hospital two-tone chime (0 network bytes)
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
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now + 0.16); // E5

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.16);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.65);
    } catch (e) {
      // AudioContext may be restricted before user gesture
    }
  };

  // Voice Queue Calling Announcement using native SpeechSynthesis
  const handleCallPatient = (noteToCall = null) => {
    const note = noteToCall || selectedNote;
    if (!note) return;

    const token = note.patient?.tokenId || note.tokenId || "Patient";
    const lang = note.language || "en";

    setCallingToken(token);
    playHospitalChime();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      let message = `Token ${token}, please proceed to Doctor Consultation ${consultationRoom}.`;
      let voiceLang = "en-IN";

      if (lang === "hi") {
        message = `टोकन ${token}, कृपया डॉक्टर परामर्श कक्ष ${consultationRoom} में जाएं।`;
        voiceLang = "hi-IN";
      } else if (lang === "or") {
        message = `ଟୋକନ୍ ${token}, ଦୟାକରି ଡାକ୍ତର ପରାମର୍ଶ କୋଠରୀ ${consultationRoom} କୁ ଯାଆନ୍ତୁ।`;
        voiceLang = "or-IN";
      }

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.lang = voiceLang;

      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 250);
    }

    setNotification(`📢 Calling Token ${token} to ${consultationRoom}...`);
    setTimeout(() => setCallingToken(""), 5000);
  };

  // Quick insertion clinical templates for reviewer
  const handleInsertClinicalChip = (chipText) => {
    setEditableSummary((prev) => {
      const addition = `\n• Reviewer Order: ${chipText}`;
      return `${prev.trim()}${addition}`;
    });
  };

  // Quick medication insertion
  const handleInsertMedication = (medText) => {
    setPrescription((prev) => {
      if (!prev.trim()) return medText;
      return `${prev.trim()}\n• ${medText}`;
    });
  };

  // Revert edits
  const handleRevertSummary = () => {
    setEditableSummary(originalSummary);
  };

  // Toggle resolved missing info
  const toggleMissingResolved = (noteId, itemText) => {
    const key = `${noteId}-${itemText}`;
    setResolvedMissingMap((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Export Daily Registry as standard CSV
  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/export-csv`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `triaq_daily_registry_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setNotification("✓ Daily registry exported successfully as CSV!");
        return;
      }
    } catch (e) {
      console.warn("Backend CSV export failed, generating offline CSV fallback:", e);
    }

    // Client-side instant offline CSV fallback
    const headers = ["Token ID", "Time", "Status", "Priority Flag", "Language", "Symptoms Summary", "Reviewer"];
    const escapeCsv = (val) => `"${String(val || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    const rows = queue.map((item) => [
      escapeCsv(item.patient?.tokenId || "Token"),
      escapeCsv(new Date(item.createdAt).toLocaleTimeString()),
      escapeCsv(item.status),
      escapeCsv(item.riskTag),
      escapeCsv(item.language),
      escapeCsv(item.summary || item.rawSymptomText),
      escapeCsv(reviewerId)
    ].join(","));

    const csvData = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `triaq_registry_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotification("✓ Registry exported as CSV (Offline mode)!");
  };

  const handleAction = async (action) => {
    if (!selectedNote) return;

    setActionLoading(true);
    setNotification("");

    try {
      const res = await fetch(`${API_BASE}/api/triage-notes/${selectedNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewerId: reviewerId.trim() || "Dr. Sharma",
          editedSummary: action === "EDIT_APPROVE" ? editableSummary : undefined,
          note: reviewerNote.trim() || undefined,
          disposition: disposition || undefined,
          prescription: prescription.trim() || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update triage decision.");
      }

      const token = selectedNote.patient?.tokenId || "Patient";
      const actionName = action === "APPROVE" ? "APPROVED" : action === "EDIT_APPROVE" ? "EDITED & APPROVED" : "REJECTED";
      setNotification(`✓ Case ${token} successfully ${actionName} by ${reviewerId} (${disposition})`);
      await fetchQueueAndLogs();
    } catch (err) {
      console.error(err);
      alert("Error processing action: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getRiskColor = (tag) => {
    switch (tag) {
      case "RED":
        return "#B23A2E";
      case "AMBER":
      case "YELLOW":
        return "#EAB308";
      case "GREEN":
      default:
        return "#3F7D52";
    }
  };

  const getRiskBadge = (tag) => {
    switch (tag) {
      case "RED":
        return { bg: "#FBEBE8", color: "#B23A2E", dot: "#B23A2E", label: "Urgent (RED)" };
      case "AMBER":
      case "YELLOW":
        return { bg: "#FEF9C3", color: "#854D0E", dot: "#EAB308", label: "Moderate (YELLOW)" };
      case "GREEN":
      default:
        return { bg: "#EAF3EC", color: "#3F7D52", dot: "#3F7D52", label: "Normal (GREEN)" };
    }
  };

  // Compute metrics
  const metrics = useMemo(() => {
    const red = queue.filter((n) => n.riskTag === "RED").length;
    const yellow = queue.filter((n) => n.riskTag === "YELLOW" || n.riskTag === "AMBER").length;
    const green = queue.filter((n) => n.riskTag === "GREEN").length;
    return { total: queue.length, red, yellow, green };
  }, [queue]);

  // Filtered queue
  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      // 1. Priority filter
      if (priorityFilter === "RED" && item.riskTag !== "RED") return false;
      if (priorityFilter === "YELLOW" && (item.riskTag !== "YELLOW" && item.riskTag !== "AMBER")) return false;
      if (priorityFilter === "GREEN" && item.riskTag !== "GREEN") return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const tokenMatch = (item.patient?.tokenId || "").toLowerCase().includes(query);
        const symptomMatch = (item.rawSymptomText || "").toLowerCase().includes(query);
        const summaryMatch = (item.summary || "").toLowerCase().includes(query);
        return tokenMatch || symptomMatch || summaryMatch;
      }

      return true;
    });
  }, [queue, priorityFilter, searchQuery]);

  const hasEdits = editableSummary.trim() !== originalSummary.trim();

  return (
    <div className="max-w-[1240px] mx-auto p-6 md:p-8 space-y-6">
      {/* Dashboard Top Header & Metrics Bar */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[28px] md:text-[32px] font-black tracking-tight text-slate-900">
                Reviewer Dashboard
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black bg-emerald-50 text-emerald-800 border border-emerald-300 tracking-wider">
                CLINICAL TRIAGE
              </span>
            </div>
            <p className="text-[14.5px] font-medium text-slate-500 mt-0.5">
              Doctor & Triage Officer Review Desk • Strictly Human-in-the-Loop Clinical Decisions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* OPD Room Selector for Voice Calling */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
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
                <option value="Triage Desk">Triage Desk</option>
              </select>
            </div>

            {/* Active Reviewer Input */}
            <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[12px] font-bold text-slate-500">
                Active Reviewer:
              </span>
              <input
                type="text"
                value={reviewerId}
                onChange={(e) => setReviewerId(e.target.value)}
                placeholder="Dr. Name"
                className="text-[13px] font-bold text-slate-900 outline-none border-b border-transparent focus:border-emerald-600 min-w-[110px]"
              />
            </div>

            {/* Export Daily Registry as CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl font-bold text-[12.5px] border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5"
              title="Download complete registry as CSV spreadsheet"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>

            {/* Refresh Queue */}
            <button
              type="button"
              onClick={() => fetchQueueAndLogs(true)}
              disabled={loading}
              className="px-4 py-2 rounded-xl font-bold text-[12.5px] border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5"
            >
              <span>{loading ? "↻" : "🔄"}</span>
              <span>{loading ? "Updating..." : "Refresh Queue"}</span>
            </button>
          </div>
        </div>

        {/* Priority Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={() => setPriorityFilter("ALL")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              priorityFilter === "ALL" 
                ? "ring-2 ring-slate-900 bg-white shadow-sm border-slate-900" 
                : "bg-white hover:bg-slate-50 border-slate-200/90 shadow-xs"
            }`}
          >
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">All Pending</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{metrics.total}</span>
          </button>

          <button
            type="button"
            onClick={() => setPriorityFilter("RED")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              priorityFilter === "RED" 
                ? "ring-2 ring-rose-600 bg-rose-50 shadow-sm border-rose-500" 
                : "bg-white hover:bg-rose-50/50 border-slate-200/90 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-rose-700 tracking-wider block">🔴 Urgent (RED)</span>
              {metrics.red > 0 && <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>}
            </div>
            <span className="text-2xl font-black text-rose-700 mt-1 block">{metrics.red}</span>
          </button>

          <button
            type="button"
            onClick={() => setPriorityFilter("YELLOW")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              priorityFilter === "YELLOW" 
                ? "ring-2 ring-amber-500 bg-amber-50 shadow-sm border-amber-500" 
                : "bg-white hover:bg-amber-50/50 border-slate-200/90 shadow-xs"
            }`}
          >
            <span className="text-[11px] font-black uppercase text-amber-800 tracking-wider block">🟡 Moderate (YELLOW)</span>
            <span className="text-2xl font-black text-amber-800 mt-1 block">{metrics.yellow}</span>
          </button>

          <button
            type="button"
            onClick={() => setPriorityFilter("GREEN")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              priorityFilter === "GREEN" 
                ? "ring-2 ring-emerald-600 bg-emerald-50 shadow-sm border-emerald-500" 
                : "bg-white hover:bg-emerald-50/50 border-slate-200/90 shadow-xs"
            }`}
          >
            <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider block">🟢 Normal (GREEN)</span>
            <span className="text-2xl font-black text-emerald-800 mt-1 block">{metrics.green}</span>
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {notification && (
        <div 
          className="p-4 rounded-xl text-[13.5px] font-bold border flex items-center justify-between shadow-xs transition-all bg-emerald-50 border-emerald-300 text-emerald-900"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">✓</span>
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification("")} className="cursor-pointer text-sm font-black hover:opacity-75 ml-2">✕</button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Queue list */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-black tracking-tight text-slate-900">
              Patients Waiting ({filteredQueue.length})
            </h2>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Priority: RED → YELLOW → GREEN
            </span>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Token ID or symptoms..."
              className="w-full pl-9 pr-8 py-2 text-[13px] bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 shadow-2xs transition placeholder:text-slate-400 font-medium"
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2 text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-[660px] overflow-y-auto pr-1">
            {filteredQueue.length === 0 ? (
              <div 
                className="bg-white rounded-2xl p-8 border border-slate-200/90 text-center space-y-2 shadow-xs"
              >
                <span className="text-3xl block mb-1">🎉</span>
                <p className="font-black text-[15px] text-slate-900">
                  {queue.length === 0 ? "Queue is clear" : "No matching patients"}
                </p>
                <p className="text-[13px] text-slate-500">
                  {queue.length === 0
                    ? "No pending patient notes awaiting clinical review."
                    : "Try clearing your priority filter or search query."}
                </p>
              </div>
            ) : (
              filteredQueue.map((item) => {
                const isSelected = selectedNote?.id === item.id;
                const riskColor = getRiskColor(item.riskTag);
                const badge = getRiskBadge(item.riskTag);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectNote(item)}
                    className={`bg-white rounded-xl p-4 border transition-all cursor-pointer ${
                      isSelected 
                        ? "shadow-sm ring-2 ring-emerald-600 bg-emerald-50/20 border-emerald-500" 
                        : "border-slate-200/90 hover:shadow-xs hover:border-slate-300"
                    }`}
                    style={{
                      borderLeftWidth: "5px",
                      borderLeftColor: riskColor
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[15px] text-slate-900">
                          {item.patient?.tokenId || "Token"}
                        </span>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {item.language || "EN"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCallPatient(item);
                          }}
                          className={`text-[11px] px-2.5 py-0.5 font-bold rounded-lg border transition flex items-center gap-1 cursor-pointer shadow-2xs ${
                            callingToken === (item.patient?.tokenId || item.tokenId)
                              ? "bg-emerald-600 text-white border-emerald-600 animate-pulse"
                              : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-600 hover:text-white"
                          }`}
                          title={`Call patient to ${consultationRoom}`}
                        >
                          <span>📢</span>
                          <span>{callingToken === (item.patient?.tokenId || item.tokenId) ? "Calling..." : "Call"}</span>
                        </button>
                        <span 
                          className="text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs"
                          style={{ backgroundColor: badge.bg, color: badge.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: badge.dot }}></span>
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    {/* Matched risk keyword badges */}
                    {item.matchedRiskKeywords && item.matchedRiskKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.matchedRiskKeywords.slice(0, 3).map((kw, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-black px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: badge.bg, color: badge.color }}
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-[13px] line-clamp-2 mb-2 leading-relaxed text-slate-600 font-medium">
                      {item.summary || item.rawSymptomText}
                    </p>

                    <div className="flex items-center justify-between text-[11.5px] pt-1.5 border-t border-slate-100 font-medium text-slate-400">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Awaiting Review
                      </span>
                      <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detail Panel */}
        <div className="lg:col-span-7">
          {!selectedNote ? (
            <div 
              className="bg-white rounded-2xl p-12 border border-slate-200/90 text-center space-y-2 h-full min-h-[420px] flex flex-col items-center justify-center shadow-xs"
            >
              <span className="text-4xl mb-1">🩺</span>
              <p className="text-[16px] font-black text-slate-900">
                Select a patient from the queue
              </p>
              <p className="text-[13px] max-w-sm mx-auto text-slate-500 leading-relaxed">
                Click any patient in the waiting queue on the left to inspect symptoms, edit the structured triage summary, and record your clinical decision.
              </p>
            </div>
          ) : (
            <div 
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-5"
            >
              {/* Patient Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Clinical Case
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      Lang: {(selectedNote.language || "en").toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-[22px] font-black text-slate-900 mt-0.5">
                    {selectedNote.patient?.tokenId || "Token Patient"}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCallPatient(selectedNote)}
                    className={`px-3.5 py-1.5 rounded-xl font-black text-[12.5px] border transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 ${
                      callingToken === (selectedNote.patient?.tokenId || selectedNote.tokenId)
                        ? "bg-emerald-600 text-white border-emerald-600 animate-pulse"
                        : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-600 hover:text-white"
                    }`}
                  >
                    <span>📢</span>
                    <span>{callingToken === (selectedNote.patient?.tokenId || selectedNote.tokenId) ? `Calling to ${consultationRoom}...` : `Call to ${consultationRoom}`}</span>
                  </button>

                  {(() => {
                    const badge = getRiskBadge(selectedNote.riskTag);
                    return (
                      <span 
                        className="px-3.5 py-1.5 rounded-full font-black text-[12.5px] flex items-center gap-1.5 shadow-2xs"
                        style={{ backgroundColor: badge.bg, color: badge.color }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: badge.dot }}></span>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Patient Vitals Tracker Card if recorded */}
              {selectedNote.vitals && Object.values(selectedNote.vitals).some((v) => v !== null && v !== undefined && v !== "") && (
                <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span>🩺</span> Recorded Patient Vitals
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      Triage Baseline
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {selectedNote.vitals.bpSystolic || selectedNote.vitals.bpDiastolic ? (
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70">
                        <span className="text-[10px] font-black uppercase text-slate-500 block">Blood Pressure</span>
                        <span className="text-[14px] font-black text-slate-900 block mt-0.5">
                          {selectedNote.vitals.bpSystolic || "--"} / {selectedNote.vitals.bpDiastolic || "--"} <span className="text-[10px] text-slate-500 font-normal">mmHg</span>
                        </span>
                        {Number(selectedNote.vitals.bpSystolic) >= 180 || Number(selectedNote.vitals.bpDiastolic) >= 110 ? (
                          <span className="text-[9.5px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded mt-1 inline-block">⚠ Hypertensive Crisis</span>
                        ) : Number(selectedNote.vitals.bpSystolic) >= 140 ? (
                          <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded mt-1 inline-block">Stage 2 High</span>
                        ) : (
                          <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded mt-1 inline-block">Normal</span>
                        )}
                      </div>
                    ) : null}

                    {selectedNote.vitals.pulse ? (
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70">
                        <span className="text-[10px] font-black uppercase text-slate-500 block">Pulse Rate</span>
                        <span className="text-[14px] font-black text-slate-900 block mt-0.5">
                          {selectedNote.vitals.pulse} <span className="text-[10px] text-slate-500 font-normal">bpm</span>
                        </span>
                        {Number(selectedNote.vitals.pulse) > 130 || Number(selectedNote.vitals.pulse) < 45 ? (
                          <span className="text-[9.5px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded mt-1 inline-block">⚠ Critical Pulse</span>
                        ) : Number(selectedNote.vitals.pulse) > 100 ? (
                          <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded mt-1 inline-block">Tachycardia</span>
                        ) : (
                          <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded mt-1 inline-block">Normal</span>
                        )}
                      </div>
                    ) : null}

                    {selectedNote.vitals.spo2 ? (
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70">
                        <span className="text-[10px] font-black uppercase text-slate-500 block">SpO2 Oxygen</span>
                        <span className="text-[14px] font-black text-slate-900 block mt-0.5">
                          {selectedNote.vitals.spo2} <span className="text-[10px] text-slate-500 font-normal">%</span>
                        </span>
                        {Number(selectedNote.vitals.spo2) < 90 ? (
                          <span className="text-[9.5px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded mt-1 inline-block">⚠ Hypoxia (RED)</span>
                        ) : Number(selectedNote.vitals.spo2) < 95 ? (
                          <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded mt-1 inline-block">Borderline</span>
                        ) : (
                          <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded mt-1 inline-block">Normal</span>
                        )}
                      </div>
                    ) : null}

                    {selectedNote.vitals.temp ? (
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70">
                        <span className="text-[10px] font-black uppercase text-slate-500 block">Temperature</span>
                        <span className="text-[14px] font-black text-slate-900 block mt-0.5">
                          {selectedNote.vitals.temp} <span className="text-[10px] text-slate-500 font-normal">°F</span>
                        </span>
                        {Number(selectedNote.vitals.temp) >= 103 ? (
                          <span className="text-[9.5px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded mt-1 inline-block">⚠ High Pyrexia</span>
                        ) : Number(selectedNote.vitals.temp) >= 100.4 ? (
                          <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded mt-1 inline-block">Fever</span>
                        ) : (
                          <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded mt-1 inline-block">Normal</span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Clinical Summary & Reviewer Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[14px] font-black text-slate-900 flex items-center gap-1.5">
                      <span>📋</span> Patient Triage Summary
                    </label>
                    {hasEdits && (
                      <span className="text-[10.5px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                        Modified
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Mode switcher tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setSummaryViewMode("cards")}
                        className={`px-3 py-1 rounded-lg text-[12px] font-bold transition cursor-pointer ${
                          summaryViewMode === "cards"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        📋 Clean Q&A Cards
                      </button>
                      <button
                        type="button"
                        onClick={() => setSummaryViewMode("edit")}
                        className={`px-3 py-1 rounded-lg text-[12px] font-bold transition cursor-pointer ${
                          summaryViewMode === "edit"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        ✏️ Edit Text
                      </button>
                    </div>

                    {hasEdits && (
                      <button
                        type="button"
                        onClick={handleRevertSummary}
                        className="text-[12px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Revert
                      </button>
                    )}
                  </div>
                </div>

                {summaryViewMode === "cards" ? (
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    <ClinicalSummaryCard summary={editableSummary} language={selectedNote.language} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      rows={7}
                      value={editableSummary}
                      onChange={(e) => setEditableSummary(e.target.value)}
                      placeholder="Review and edit the patient triage summary here..."
                      className="w-full p-4 rounded-xl text-[14.5px] font-sans font-medium border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 leading-relaxed transition shadow-2xs outline-none text-slate-900"
                    />

                    {/* Quick Clinical Order Chips */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[12px] font-bold text-slate-500">Quick Orders:</span>
                      {[
                        "Stable for routine OPD",
                        "Urgent ECG & Vitals Check",
                        "Oral Rehydration & Rest",
                        "Priority Bed Admission",
                        "Blood Routine & CBC Test"
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleInsertClinicalChip(chip)}
                          className="text-[12px] px-3 py-1 rounded-lg bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 hover:border-emerald-400 text-slate-700 cursor-pointer transition font-bold shadow-2xs"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Optional OCR Lab Report Attachment if any */}
              {selectedNote.extractedReportData && (
                <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/70 space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
                    📄 Lab Report OCR Findings
                  </span>
                  <p className="text-[13px] text-slate-800 font-medium">
                    {selectedNote.extractedReportData.sampleLines?.join(" | ") || "Report parsed."}
                  </p>
                </div>
              )}

              {/* Clinical Safety Checks & Questions (Collapsible Reference) */}
              <details className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 transition">
                <summary className="text-[13px] font-bold text-slate-700 cursor-pointer select-none flex items-center justify-between">
                  <span>🛡️ Clinical Safety Checklist & Gaps Reference</span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                    {(selectedNote.missingInfo || []).length} field gaps
                  </span>
                </summary>

                <div className="pt-3 space-y-3 border-t border-dashed border-slate-200">
                  {/* Missing Information Flags */}
                  <div>
                    <span className="text-[11px] font-black uppercase block mb-1.5 text-slate-500">
                      Baseline Information Status
                    </span>
                    <div className="space-y-1.5">
                      {(selectedNote.missingInfo || []).map((item, idx) => {
                        const resolvedKey = `${selectedNote.id}-${item}`;
                        const isResolved = resolvedMissingMap[resolvedKey];

                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-2.5 rounded-lg border text-[13px] font-medium transition ${
                              isResolved 
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800" 
                                : "bg-amber-50 border-amber-300 text-amber-900"
                            }`}
                          >
                            <span className="font-semibold">
                              {isResolved ? "✓ Verified: " : "⚠ Not explicitly noted: "} {item}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleMissingResolved(selectedNote.id, item)}
                              className={`px-3 py-0.5 text-[12px] font-black rounded-md border cursor-pointer shadow-2xs transition ${
                                isResolved
                                  ? "bg-white border-emerald-400 text-emerald-800 hover:bg-emerald-100"
                                  : "bg-white border-amber-400 text-amber-900 hover:bg-amber-100"
                              }`}
                            >
                              {isResolved ? "Unmark" : "Mark Verified ✓"}
                            </button>
                          </div>
                        );
                      })}
                      {(!selectedNote.missingInfo || selectedNote.missingInfo.length === 0) && (
                        <p className="text-[13px] text-emerald-700 font-bold italic">✓ All baseline clinical fields present.</p>
                      )}
                    </div>
                  </div>

                  {/* Suggested Follow-up Questions */}
                  {selectedNote.followUpQuestions && selectedNote.followUpQuestions.length > 0 && (
                    <div>
                      <span className="text-[11px] font-black uppercase block mb-1.5 text-slate-500">
                        Reference Follow-up Clarifications (Optional)
                      </span>
                      <ul className="space-y-1.5">
                        {selectedNote.followUpQuestions.map((q, idx) => (
                          <li
                            key={idx}
                            className="text-[13px] p-2.5 rounded-lg border border-slate-200 bg-white flex items-start justify-between gap-2 shadow-2xs"
                          >
                            <span className="font-medium text-slate-800 leading-relaxed">❓ {q}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const addition = `\n• Follow-up Note: ${q} -> `;
                                setEditableSummary((prev) => `${prev.trim()}${addition}`);
                              }}
                              className="px-2.5 py-1 text-[11px] font-black rounded-md bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-200 shrink-0 cursor-pointer transition"
                            >
                              + Add to Note
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>

              {/* Doctor Clinical Disposition & Prescription (New Feature) */}
              <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/40 space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-black text-emerald-950 flex items-center gap-1.5">
                    <span>💊</span> Doctor Clinical Disposition & Prescription (Rx)
                  </label>
                  <span className="text-[10.5px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    OPD CLINICAL ORDER
                  </span>
                </div>

                {/* Disposition Pills */}
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    Select Clinical Disposition:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "Routine OPD Treatment", label: "Routine OPD", icon: "🩺" },
                      { id: "Admit to Emergency Ward", label: "Admit Emergency", icon: "🚨" },
                      { id: "Refer to District Hospital", label: "Refer District", icon: "🚑" },
                      { id: "Discharged with Advice", label: "Discharged", icon: "🏠" }
                    ].map((disp) => {
                      const isSelected = disposition === disp.id;
                      return (
                        <button
                          key={disp.id}
                          type="button"
                          onClick={() => setDisposition(disp.id)}
                          className={`p-2 rounded-xl text-[12px] font-bold border transition text-left cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                            isSelected
                              ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span>{disp.icon}</span>
                          <span className="truncate">{disp.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Prescription Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-600">
                      Quick Medication Prescriptions:
                    </span>
                    <span className="text-[10.5px] text-slate-500 font-medium">Click to append</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Paracetamol 500mg (1 tab TDS x 3 days)",
                      "ORS Sachet (1 pack in 1L clean water)",
                      "Cetirizine 10mg (1 tab OD HS x 3 days)",
                      "Amoxicillin 500mg (1 cap TDS x 5 days)",
                      "Antacid Syrup (2 tsp TDS before food)",
                      "Oral Rehydration & Rest (Plenty fluids)"
                    ].map((med, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleInsertMedication(med)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 hover:border-emerald-400 text-slate-700 font-bold transition shadow-2xs cursor-pointer"
                      >
                        + {med}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prescription Textarea */}
                <div>
                  <textarea
                    rows={3}
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    placeholder="Type prescription, dosage, or clinical discharge advice (e.g. Tab Paracetamol 500mg TDS, plenty of fluids, review in 3 days if fever persists)..."
                    className="w-full p-3 rounded-xl text-[13.5px] border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 font-medium leading-relaxed shadow-2xs placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Optional Reviewer Comment */}
              <div>
                <label className="text-[12px] font-black uppercase tracking-wider block mb-1.5 text-slate-500">
                  Reviewer Internal Note / Clinical Disposition (Optional)
                </label>
                <input
                  type="text"
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder="e.g. Advised urgent ECG; transferred to Bed 3, OPD Room 4"
                  className="w-full p-3 rounded-xl text-[13.5px] border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 bg-slate-50/50 focus:bg-white transition shadow-2xs font-medium"
                />
              </div>

              {/* Action Decision Buttons */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction("APPROVE")}
                  className="px-5 py-2.5 rounded-xl font-bold text-[13px] border border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white transition cursor-pointer disabled:opacity-40 shadow-2xs"
                >
                  {actionLoading ? "Processing..." : "✓ Approve"}
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction("EDIT_APPROVE")}
                  className="px-6 py-2.5 rounded-xl font-black text-[13.5px] text-white transition-all cursor-pointer disabled:opacity-40 shadow-sm hover:shadow-md bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-98"
                >
                  {actionLoading ? "Saving..." : "✏️ Save Edit & Approve"}
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction("REJECT")}
                  className="px-5 py-2.5 rounded-xl font-bold text-[13px] border border-rose-300 text-rose-700 hover:bg-rose-50 transition cursor-pointer disabled:opacity-40 shadow-2xs"
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Audit Log Panel (Card, Full Width) */}
      <div 
        className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-[18px] font-black text-slate-900">
              Recent Decisions (Audit Trail)
            </h2>
            <p className="text-[12.5px] font-medium text-slate-500 mt-0.5">
              Permanent tamper-evident clinical governance log with reviewer IDs and timestamps
            </p>
          </div>
          <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {auditLogs.length} total logged actions
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-[13px] italic text-slate-400">
            No decisions logged yet. Approved or rejected cases above will appear here in real time.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[260px] overflow-y-auto">
            {auditLogs.map((entry) => {
              const isApprove = entry.action === "APPROVE";
              const isEditApprove = entry.action === "EDIT_APPROVE";

              const badgeClass = isApprove
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : isEditApprove
                ? "bg-teal-50 text-teal-800 border-teal-300"
                : "bg-rose-50 text-rose-800 border-rose-300";

              const actionLabel = isApprove
                ? "APPROVED"
                : isEditApprove
                ? "EDITED & APPROVED"
                : "REJECTED";

              const token = entry.triageNote?.patient?.tokenId || entry.triageNote?.tokenId || "Patient";

              return (
                <div key={entry.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span 
                      className={`font-black px-2 py-0.5 rounded-md text-[10.5px] border ${badgeClass}`}
                    >
                      {actionLabel}
                    </span>
                    <span className="font-bold text-slate-900">
                      Patient [{token}]
                    </span>
                    {entry.disposition && (
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {entry.disposition}
                      </span>
                    )}
                    <span className="text-slate-500 font-medium">
                      — action by <strong className="text-slate-800">{entry.reviewerId}</strong>
                    </span>
                    {entry.note && (
                      <span className="italic text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        "{entry.note}"
                      </span>
                    )}
                    {entry.prescription && (
                      <span className="text-[11px] text-emerald-900 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200 font-medium">
                        💊 {entry.prescription.length > 50 ? entry.prescription.slice(0, 50) + "..." : entry.prescription}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
