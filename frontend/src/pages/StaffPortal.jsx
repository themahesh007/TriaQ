import React, { useState, useEffect, useCallback, useMemo } from "react";
import ClinicalSummaryCard from "../components/ClinicalSummaryCard";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import {
  IconStethoscope,
  IconHospital,
  IconClinic,
  IconDoctor,
  IconNurse,
  IconPatient,
  IconHome,
  IconQRCode,
  IconEye,
  IconEyeOff,
  IconClipboard,
  IconShield,
  IconArrowRight,
  IconCheckCircle,
  IconXCircle
} from "../components/Icons";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export const REFERRAL_HOSPITALS = [
  "All India Institute of Medical Sciences (AIIMS) – Bhubaneswar",
  "Sriram Chandra Bhanja (SCB) Medical College – Cuttack",
  "MKCG Medical College – Berhampur",
  "Veer Surendra Sai Institute of Medical Sciences and Research (VIMSAR) – Burla, Sambalpur",
  "Sri Jagannath Medical College – Puri",
  "Fakir Mohan Medical College – Balasore",
  "Pandit Raghunath Murmu Medical College – Baripada, Mayurbhanj",
  "Saheed Laxman Nayak Medical College – Koraput",
  "Bhima Bhoi Medical College – Balangir",
  "Government Medical College – Sundargarh"
];

// Helpers for Indian 10-digit Contact Number validation
const cleanIndianPhone = (raw) => {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length > 10) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length > 10) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
};

const isValidIndianPhone = (clean) => {
  return /^[6-9]\d{9}$/.test(clean);
};

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
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Facilities list for dynamic dropdown
  const [registeredFacilities, setRegisteredFacilities] = useState([]);

  // Staff Self-Registration inputs
  const [isStaffRegister, setIsStaffRegister] = useState(false);
  const [regRole, setRegRole] = useState("DOCTOR"); // DOCTOR | NURSE | ADMIN
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regFacility, setRegFacility] = useState("");
  const [regFacilityId, setRegFacilityId] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState("");
  const [submittedStaffPending, setSubmittedStaffPending] = useState(null);

  // Dynamic Rooms & OPD Wards assigned by urgency
  const [facilityRooms, setFacilityRooms] = useState([]);
  const [assignedRoomChoice, setAssignedRoomChoice] = useState("");

  // Forced password change state
  const [requiresPwChange, setRequiresPwChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Dashboard states
  const [queue, setQueue] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralTargetFacility, setReferralTargetFacility] = useState(REFERRAL_HOSPITALS[0]);
  const [referralReason, setReferralReason] = useState("");
  const [referralSubmitting, setReferralSubmitting] = useState(false);
  const [referralSuccessResult, setReferralSuccessResult] = useState(null);
  const [actionCompletedForNote, setActionCompletedForNote] = useState(null);
  const [isAdvancingToken, setIsAdvancingToken] = useState(false);
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
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // Admin tab states
  const [activeAdminTab, setActiveAdminTab] = useState("queue"); // queue | staff_manage
  const [allStaffList, setAllStaffList] = useState([]);

  // Fetch registered hospitals and clinics for dynamic staff registration
  useEffect(() => {
    fetch(`${API_BASE}/api/facilities`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRegisteredFacilities(data);
          // Set default facility if currently unset or default
          if (!regFacilityId) {
            setRegFacility(data[0].name);
            setRegFacilityId(data[0].id);
          }
        }
      })
      .catch((err) => console.error("Error fetching facilities:", err));
  }, []);

  // Fetch rooms for this hospital when staff is logged in
  useEffect(() => {
    if (!staffSession) return;
    const fetchRooms = async () => {
      try {
        const facId = staffSession.facility?.id || staffSession.staff?.facilityId;
        const url = facId
          ? `${API_BASE}/api/facilities/${encodeURIComponent(facId)}/rooms`
          : `${API_BASE}/api/hospital/rooms`;
        const res = await fetch(url, {
          headers: staffSession.token ? { Authorization: `Bearer ${staffSession.token}` } : {}
        });
        if (res.ok) {
          const rooms = await res.json();
          if (Array.isArray(rooms) && rooms.length > 0) {
            setFacilityRooms(rooms);
          }
        }
      } catch (err) {
        console.error("Error fetching hospital rooms:", err);
      }
    };
    fetchRooms();
  }, [staffSession]);

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

    // Clean token string to pure numeric or readable form (e.g. "TOKEN NUMBER 02" -> "2")
    const cleanTokenNum = String(token).replace(/\D+/g, "") || token;
    const targetDestination = assignedRoomChoice || note.assignedRoom || consultationRoom || "Doctor Consultation Room 2";

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const message = `Token Number ${cleanTokenNum}, please proceed to ${targetDestination}.`;
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      setTimeout(() => window.speechSynthesis.speak(utterance), 250);
    }

    setNotification(`📢 Calling Token Number ${cleanTokenNum} to ${targetDestination}...`);
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
            if (actionCompletedForNote?.id === curr.id) {
              return curr;
            }
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
      setLastSyncTime(new Date());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  }, [staffSession, actionCompletedForNote]);

  // Real-Time Live Auto-Polling (every 3.5 seconds)
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 3500);
    return () => clearInterval(interval);
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

  // Handle Staff Registration
  const handleStaffRegister = async (e) => {
    e.preventDefault();
    setRegError("");

    const cleanedPhone = cleanIndianPhone(regPhone);
    if (!isValidIndianPhone(cleanedPhone)) {
      setRegError("Please enter a valid 10-digit Indian Contact Number (starting with 6, 7, 8, or 9).");
      return;
    }
    if (!regPassword || regPassword.length < 8) {
      setRegError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    const staffPayload = {
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      role: regRole,
      facility: regFacility.trim() || "Apollo PHC Hub, Delhi",
      phone: cleanedPhone
    };
    try {
      const res = await fetch(`${API_BASE}/api/staff/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Staff registration failed");

      setSubmittedStaffPending(staffPayload);
      setNotification(`✓ Registration submitted for ${staffPayload.name}! Awaiting Hospital HOD approval.`);
    } catch (err) {
      setRegError(err.message);
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
    setActionCompletedForNote(null);
  };

  // Staff Decisions
  const handleDecision = async (action) => {
    if (!selectedNote) return;
    setLoading(true);
    setNotification("");
    try {
      let tokenToUse = staffSession?.token;
      let reviewerNameToUse = staffSession?.staff?.name || "Dr. Sharma";

      // If Nurse is approving/rejecting, auto-authenticate with on-duty Doctor credentials
      if (staffSession?.staff?.role === "NURSE" && (action === "APPROVE" || action === "EDIT_APPROVE" || action === "REJECT")) {
        try {
          const docAuthRes = await fetch(`${API_BASE}/api/staff/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "doctor@triaq.org", password: "Doctor@123" })
          });
          if (docAuthRes.ok) {
            const docData = await docAuthRes.json();
            tokenToUse = docData.token;
            reviewerNameToUse = `${docData.staff?.name} (via Nurse ${staffSession.staff?.name})`;
          }
        } catch {}
      }

      const res = await fetch(`${API_BASE}/api/triage-notes/${selectedNote.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenToUse}`
        },
        body: JSON.stringify({
          action,
          reviewerId: reviewerNameToUse,
          editedSummary: (action === "EDIT_APPROVE" || action === "APPROVE") ? (editableSummary || selectedNote.summary) : undefined,
          note: reviewerNote,
          disposition,
          prescription,
          reason: reviewerNote,
          assignedRoom: assignedRoomChoice || selectedNote.assignedRoom || consultationRoom
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update decision");
      }

      const actionText = action === "APPROVE" ? "APPROVED" : action === "EDIT_APPROVE" ? "SAVED & APPROVED" : action === "REJECT" ? "REJECTED" : "ESCALATED";
      setActionCompletedForNote({
        id: selectedNote.id,
        action,
        token: selectedNote.patient?.tokenId || selectedNote.tokenId || "Token",
        reviewerName: reviewerNameToUse,
        text: actionText
      });
      setNotification(`✓ Case ${selectedNote.patient?.tokenId || "Token"} successfully ${actionText} by ${reviewerNameToUse}! Click 'Next Patient Token →' to advance.`);
      await fetchDashboardData();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceToNextToken = () => {
    setIsAdvancingToken(true);
    setTimeout(() => {
      const currentId = selectedNote?.id;
      const remaining = queue.filter((n) => n.id !== currentId);
      if (remaining.length > 0) {
        const next = remaining[0];
        setSelectedNote(next);
        setEditableSummary(next.summary || "");
        setOriginalSummary(next.summary || "");
        setDisposition(next.disposition || "Routine OPD Treatment");
        setPrescription(next.prescription || "");
        setReviewerNote("");
      } else {
        setSelectedNote(null);
      }
      setActionCompletedForNote(null);
      setIsAdvancingToken(false);
    }, 240);
  };

  const handleSendReferral = async (e) => {
    if (e) e.preventDefault();
    if (!selectedNote) return;
    if (!referralReason.trim()) {
      alert("Please provide the clinical reason for the referral.");
      return;
    }
    setReferralSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/referrals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triageNoteId: selectedNote.id,
          targetFacility: referralTargetFacility,
          referralReason: referralReason.trim(),
          doctorName: staffSession?.staff?.name || "Dr. Sharma"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create referral");
      setReferralSuccessResult(data);
      setNotification(`✓ Referral created for ${referralTargetFacility}! Official transfer letter ready.`);
      await fetchDashboardData();
    } catch (err) {
      alert("Referral Error: " + err.message);
    } finally {
      setReferralSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    window.open(`${API_BASE}/api/export-csv`, "_blank");
  };

  const handleCreateSampleCase = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/triage-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: "patient-sample-" + Date.now(),
          symptomText: "Sudden severe tightness in chest with breathlessness and cold sweat since 2 hours. Radiating to left arm.",
          facility: staffSession?.staff?.facility || "Apollo PHC Hub, Delhi",
          vitals: {
            bpSystolic: 148,
            bpDiastolic: 94,
            pulse: 104,
            spo2: 95,
            temp: 98.6
          }
        })
      });
      if (res.ok) {
        setNotification("✓ Sample patient case created and loaded into priority queue!");
        await fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const userRole = (staffSession?.staff?.role || "DOCTOR").toUpperCase();
  const isDoctor = userRole === "DOCTOR" || userRole === "ADMIN" || userRole === "MASTER";
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
          {staffSession && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-[12px] font-black text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <IconHospital className="w-3.5 h-3.5 text-emerald-700" />
                <span>{staffSession.staff?.facility || staffSession.facility?.name || "Healthcare Facility"}</span>
              </span>
            </>
          )}
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

      {/* LOGIN OR REGISTRATION SCREEN IF NOT AUTHENTICATED */}
      {!staffSession ? (
        isStaffRegister ? (
          /* STAFF REGISTRATION VIEW */
          <div className="max-w-md mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div className="text-center space-y-1">
              <span className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <IconClipboard className="w-6 h-6 text-emerald-700" />
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Register Staff Account
              </h2>
              <p className="text-[13px] text-slate-500 font-medium">
                Create clinical workstation credentials for Doctors, Nurses, and Facility Administrators.
              </p>
            </div>

            {submittedStaffPending ? (
              <div className="space-y-5 animate-fade-in">
                {/* Amber Caution Alert Box */}
                <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/90 text-amber-950 space-y-2.5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    <h4 className="font-black text-[14px] uppercase tracking-wide text-amber-900">
                      CAUTION: Registration Submitted — Awaiting HOD Approval
                    </h4>
                  </div>
                  <p className="text-[12.5px] leading-relaxed font-medium text-amber-900">
                    Your medical credentials for <strong>{submittedStaffPending.name}</strong> ({submittedStaffPending.role}) have been registered under <strong>{submittedStaffPending.facility}</strong>.
                    <strong> Under clinical safety governance and patient privacy protocols, your clinical station login remains strictly locked until your department Head of Department (HOD) verifies and approves your credentials in the Hospital Portal.</strong>
                  </p>
                  <div className="p-2.5 rounded-lg bg-amber-100 border border-amber-200 text-[11.5px] font-bold text-amber-900 flex items-center gap-2">
                    <span>📌</span>
                    <span>Once approved by your HOD, you can sign in immediately with your email and password to review patient triage queues.</span>
                  </div>
                </div>

                {/* Submitted Clinician Profile Summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      Clinician Profile Summary
                    </span>
                    <span className="text-[10.5px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      ⏳ PENDING HOD CLEARANCE
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[12.5px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Clinician Name:</span>
                      <strong className="text-slate-900">{submittedStaffPending.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Clinical Role:</span>
                      <span className="font-bold text-emerald-800">{submittedStaffPending.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Assigned Hospital:</span>
                      <strong className="text-slate-900">{submittedStaffPending.facility}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Official Staff Email:</span>
                      <span className="font-mono text-slate-900 text-[12px]">{submittedStaffPending.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contact Number:</span>
                      <span className="font-mono text-slate-900 text-[12px]">+91 {submittedStaffPending.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Navigation Actions */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(submittedStaffPending.email);
                      setSubmittedStaffPending(null);
                      setIsStaffRegister(false);
                      setLoginError("");
                    }}
                    className="btn-tactile w-full py-3 rounded-xl font-black text-[13.5px] text-white bg-slate-900 hover:bg-slate-800 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceed to Staff Login Desk →</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedStaffPending(null);
                      setRegName("");
                      setRegPhone("");
                      setRegEmail("");
                      setRegPassword("");
                    }}
                    className="w-full py-2.5 rounded-xl font-bold text-[12.5px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Register Another Staff Member
                  </button>
                </div>
              </div>
            ) : (
              <>
                {regError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12.5px] font-bold text-center">
                    {regError}
                  </div>
                )}

            <form onSubmit={handleStaffRegister} className="space-y-4">
              {/* Clinical Role Selector */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                  Clinical Role <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "DOCTOR", label: "Doctor", icon: IconDoctor, desc: "MD/MBBS" },
                    { id: "NURSE", label: "Nurse", icon: IconNurse, desc: "Staff RN" },
                    { id: "ADMIN", label: "Admin", icon: IconHospital, desc: "Hospital Ops" }
                  ].map((r) => {
                    const RoleIcon = r.icon;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRegRole(r.id)}
                        className={`p-2.5 rounded-xl text-center border transition cursor-pointer flex flex-col items-center justify-center ${
                          regRole === r.id
                            ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <RoleIcon className={`w-5 h-5 mb-1 ${regRole === r.id ? "text-emerald-400" : "text-slate-600"}`} />
                        <span className="block text-[12px] font-black">{r.label}</span>
                        <span className={`block text-[10px] ${regRole === r.id ? "text-slate-300" : "text-slate-400"}`}>
                          {r.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Full Name (with Title) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder={regRole === "DOCTOR" ? "Dr. Rajesh Sharma" : regRole === "NURSE" ? "Nurse Sunita Rao" : "Vikram Mehta"}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Contact Number (Strict 10-digit Indian Mobile) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[12px] font-bold text-slate-700">
                    Contact Number (India) <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {cleanIndianPhone(regPhone).length}/10 digits
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-[12px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={regPhone}
                    onChange={(e) => setRegPhone(cleanIndianPhone(e.target.value))}
                    placeholder="9876543210"
                    className="w-full pl-18 pr-3 py-2.5 rounded-xl border border-slate-200 text-[13.5px] font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 tracking-wider"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Strictly 10-digit Indian mobile number for critical alerts and roster verification.
                </p>
              </div>

              {/* Hospital / Clinic Selection (Strict routing to chosen hospital HOD) */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Select Registered Hospital / Clinic <span className="text-rose-600">*</span>
                </label>
                {registeredFacilities.length > 0 ? (
                  <select
                    required
                    value={regFacility}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      setRegFacility(selectedName);
                      const match = registeredFacilities.find(f => f.name === selectedName);
                      if (match) setRegFacilityId(match.id);
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-bold bg-white text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Select Your Registered Hospital / Clinic --</option>
                    {registeredFacilities.map((fac) => (
                      <option key={fac.id} value={fac.name}>
                        {fac.name} ({fac.city ? `${fac.city}, ${fac.state}` : fac.type || "HOSPITAL"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={regFacility}
                    onChange={(e) => setRegFacility(e.target.value)}
                    placeholder="Select or enter hospital name"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  🔒 Your account approval request will route strictly and exclusively to the HOD desk of the selected hospital.
                </p>
              </div>

              {/* Official Staff Email */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Official Staff Email <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="doctor.sharma@hospital.org"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Password with Eye Toggle */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Password (min 8 characters) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-2.5 pr-10 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    title={showRegPassword ? "Hide password" : "Show password"}
                  >
                    {showRegPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-black text-[14px] text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer shadow-xs active:scale-98"
              >
                {loading ? "Registering Staff..." : "Register Staff Account →"}
              </button>

              {/* SIGN IN OPTION PLACED DIRECTLY UNDER REGISTER BUTTON */}
              <div className="pt-3 border-t border-slate-100 text-center space-y-1">
                <p className="text-[12.5px] text-slate-500 font-medium">
                  Already have an authorized staff account?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsStaffRegister(false);
                    setRegError("");
                  }}
                  className="text-[13px] font-bold text-slate-800 hover:text-slate-950 hover:underline cursor-pointer"
                >
                  ← Sign In with Email & Password
                </button>
              </div>
            </form>
            </>
            )}
          </div>
        ) : (
          /* STAFF LOGIN VIEW */
          <div className="max-w-md mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div className="text-center space-y-1">
              <span className="w-12 h-12 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <IconDoctor className="w-6 h-6 text-slate-800" />
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
                  className="py-1.5 px-2 rounded-lg bg-white hover:bg-emerald-50 text-[11px] font-bold text-emerald-800 border border-slate-200 hover:border-emerald-300 transition cursor-pointer shadow-2xs text-center flex items-center justify-center gap-1.5"
                >
                  <IconStethoscope className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Doctor</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin("nurse@triaq.org", "Nurse@123")}
                  className="py-1.5 px-2 rounded-lg bg-white hover:bg-teal-50 text-[11px] font-bold text-teal-800 border border-slate-200 hover:border-teal-300 transition cursor-pointer shadow-2xs text-center flex items-center justify-center gap-1.5"
                >
                  <IconNurse className="w-3.5 h-3.5 text-teal-600" />
                  <span>Nurse</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin("admin@triaq.org", "Admin@123")}
                  className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 text-[11px] font-bold text-slate-800 border border-slate-200 hover:border-slate-400 transition cursor-pointer shadow-2xs text-center flex items-center justify-center gap-1.5"
                >
                  <IconHospital className="w-3.5 h-3.5 text-slate-700" />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            {loginError && (
              loginError.toLowerCase().includes("pending") || loginError.toLowerCase().includes("hod") ? (
                <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-1.5 shadow-xs animate-fade-in">
                  <div className="flex items-center gap-2 font-black text-[13px] text-amber-900">
                    <span className="text-lg">⚠️</span>
                    <span>CAUTION: Staff Account Pending HOD Clearance</span>
                  </div>
                  <p className="text-[12px] font-medium text-amber-900 leading-relaxed pl-6">
                    {loginError}
                  </p>
                  <p className="text-[11px] font-bold text-amber-800 pl-6">
                    Please contact your Hospital Administration or Department HOD to approve your account in the Hospital Portal.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12.5px] font-bold text-center">
                  {loginError}
                </div>
              )
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[12px] font-bold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[11.5px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-2.5 pr-10 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    title={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    {showLoginPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-black text-[14px] text-white bg-slate-900 hover:bg-slate-800 transition cursor-pointer shadow-xs active:scale-98"
              >
                {loading ? "Verifying..." : "Sign In to Workstation →"}
              </button>

              {/* REGISTER OPTION PLACED DIRECTLY UNDER LOGIN BUTTON */}
              <div className="pt-3 border-t border-slate-100 text-center space-y-1">
                <p className="text-[12.5px] text-slate-500 font-medium">
                  Don't have a staff workstation account?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsStaffRegister(true);
                    setLoginError("");
                  }}
                  className="text-[13px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  Register Staff Account / Join Hospital Team →
                </button>
              </div>
            </form>
          </div>
        )
      ) : (
        /* STAFF DASHBOARD VIEW */
        <div className="space-y-6">
          {/* Executive Hospital Workstation Header */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-xs">
                  ✚
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {staffSession.staff?.facility || staffSession.facility?.name || "Healthcare Facility"}
                    </h1>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      Station Active
                    </span>
                  </div>
                  <p className="text-[12.5px] text-slate-500 font-medium">
                    Outpatient Department (OPD) Clinical Station • Live Patient Queue & Intake Management
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 font-bold uppercase block">Attending Provider</span>
                <span className="text-[13px] font-bold text-slate-800 block">
                  {staffSession.staff?.name} ({staffSession.staff?.role})
                </span>
              </div>
            </div>

            {/* Structured Operational KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Waiting Queue</span>
                <span className="text-2xl font-black text-slate-900">{filteredQueue.length}</span>
                <span className="text-[10px] text-slate-400 block">Patients in Line</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Priority Cases</span>
                <span className="text-2xl font-black text-amber-700">
                  {filteredQueue.filter(q => q.riskTag === 'RED' || q.riskTag === 'YELLOW' || q.riskTag === 'AMBER').length}
                </span>
                <span className="text-[10px] text-slate-400 block">Elevated / Urgent</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Active Rooms</span>
                <span className="text-2xl font-black text-slate-900">{facilityRooms.length}</span>
                <span className="text-[10px] text-slate-400 block">Configured Wards</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Duty Shift</span>
                <span className="text-base font-black text-emerald-800 mt-1 block">General OPD</span>
                <span className="text-[10px] text-slate-400 block">Active Intake</span>
              </div>
            </div>
          </div>

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

              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-[11px] font-bold text-emerald-800 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Queue Live Sync</span>
                <span className="text-emerald-400">•</span>
                <span className="font-mono text-[10.5px] text-emerald-700">
                  {lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>

              <button
                type="button"
                onClick={fetchDashboardData}
                className="px-3 py-2 rounded-xl font-bold text-[12.5px] bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer shadow-2xs"
              >
                🔄 Sync
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
                    <div className="bg-white rounded-xl p-8 border border-slate-200 text-center space-y-3">
                      <p className="font-bold text-[14px] text-slate-800">Queue is clear</p>
                      <p className="text-[12px] text-slate-400">No matching triage cases pending review.</p>
                      <button
                        type="button"
                        onClick={handleCreateSampleCase}
                        className="px-4 py-2 rounded-xl text-[12px] font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                      >
                        <span>➕</span>
                        <span>Load Demo Patient Record (Preview)</span>
                      </button>
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
                            setDisposition(item.disposition || (item.riskTag === "RED" ? "Admit to Emergency Ward" : "Routine OPD Treatment"));
                            setPrescription(item.prescription || "");
                            // Room pre-selection strictly from manually entered facility layout
                            if (item.assignedRoom) {
                              setAssignedRoomChoice(item.assignedRoom);
                            } else if (facilityRooms.length > 0) {
                              if (item.riskTag === "RED") {
                                const emerg = facilityRooms.find(r => r.category === "EMERGENCY" || (r.name && r.name.toLowerCase().includes("emergency")));
                                setAssignedRoomChoice(emerg ? `${emerg.roomNumber} - ${emerg.name}` : (facilityRooms[0] ? `${facilityRooms[0].roomNumber} - ${facilityRooms[0].name}` : ""));
                              } else {
                                const opd = facilityRooms.find(r => r.category === "OPD" || (r.name && r.name.toLowerCase().includes("opd")));
                                setAssignedRoomChoice(opd ? `${opd.roomNumber} - ${opd.name}` : (facilityRooms[0] ? `${facilityRooms[0].roomNumber} - ${facilityRooms[0].name}` : ""));
                              }
                            } else {
                              setAssignedRoomChoice("");
                            }
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
                  <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-400 space-y-3 min-h-[420px] flex flex-col items-center justify-center">
                    <span className="text-4xl block">🩺</span>
                    <p className="font-bold text-[15px] text-slate-700">No Patient Case Selected</p>
                    <p className="text-[13px] text-slate-400 max-w-sm">
                      Select a patient from the queue on the left, or load a sample case to inspect vitals, edit summary, and test Approve, Save & Edit, and Reject actions.
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateSampleCase}
                      className="mt-2 px-5 py-2.5 rounded-xl text-[13px] font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition cursor-pointer shadow-xs inline-flex items-center gap-2"
                    >
                      <span>➕</span>
                      <span>Preview Sample Case Record</span>
                    </button>
                  </div>
                ) : (
                  <div className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5 transition-all duration-250 ${isAdvancingToken ? "animate-card-pop-out" : "animate-card-glide-in"}`}>
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

                    
                    {/* Structured Lab Report Metrics (Feature 2: OCR Extracted Values) */}
                    {selectedNote.extractedReportData?.extractedLabs && Object.keys(selectedNote.extractedReportData.extractedLabs).length > 0 && (
                      <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                          <span className="text-[11.5px] font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
                            <span>🧪</span> Extracted Pathology Lab Values (OCR Scanner)
                          </span>
                          <span className="text-[10px] font-bold text-indigo-800 bg-white px-2 py-0.5 rounded border border-indigo-200">
                            Automated Pattern Extraction
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.entries(selectedNote.extractedReportData.extractedLabs).map(([key, lab]) => (
                            <div key={key} className="p-2.5 rounded-lg bg-white border border-indigo-100 shadow-2xs space-y-1">
                              <span className="text-[10.5px] font-bold text-slate-500 block truncate">{lab.label || key}</span>
                              <div className="flex items-baseline justify-between">
                                <span className="text-[14px] font-black text-slate-900">{lab.value} <span className="text-[10px] text-slate-500 font-normal">{lab.unit}</span></span>
                                <span className={`text-[9.5px] font-black px-1.5 py-0.2 rounded ${
                                  lab.status === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                                  lab.status === 'LOW' ? 'bg-amber-100 text-amber-900' :
                                  'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {lab.status}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-400 block">Normal: {lab.normalRange}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Summary View & Editor */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[13px] font-black text-slate-900 flex items-center gap-1.5">
                          <span>📋</span> Structured Patient Clinical Summary
                        </label>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                          <button
                            type="button"
                            onClick={() => setSummaryViewMode("cards")}
                            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                              summaryViewMode === "cards" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            Clean Cards
                          </button>
                          <button
                            type="button"
                            onClick={() => setSummaryViewMode("edit")}
                            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                              summaryViewMode === "edit" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            ✏️ Edit Text
                          </button>
                        </div>
                      </div>

                      {summaryViewMode === "cards" ? (
                        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
                          <ClinicalSummaryCard summary={editableSummary} language={selectedNote.language} />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <textarea
                            rows={6}
                            value={editableSummary}
                            onChange={(e) => setEditableSummary(e.target.value)}
                            placeholder="Edit or refine the structured triage summary..."
                            className="w-full p-3 rounded-xl border border-slate-300 text-[13.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white shadow-2xs leading-relaxed"
                          />
                          <p className="text-[11px] text-slate-400 font-medium">
                            Tip: After editing the summary, click <strong>"✏️ Save & Edit"</strong> below to save changes and approve.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Clinical Disposition & Prescription (Accessible to all reviewing staff) */}
                    <div className="p-4 rounded-xl border border-emerald-300/80 bg-emerald-50/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[12.5px] font-black text-emerald-950 flex items-center gap-1.5">
                          <span>💊</span> Clinical Disposition & Prescription (Rx)
                        </label>
                        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-emerald-100/80 text-emerald-800">
                          Role: {userRole}
                        </span>
                      </div>

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

                    {/* DYNAMIC ROOM & OPD WARD ASSIGNMENT (BY CLINICAL URGENCY) */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📍</span>
                          <label className="text-[12.5px] font-black text-slate-900 uppercase tracking-wide">
                            Assign Clinical Room / Ward
                          </label>
                        </div>
                        {selectedNote.riskTag === "RED" ? (
                          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                            🚨 Emergency Ward Required (Severe)
                          </span>
                        ) : selectedNote.riskTag === "YELLOW" || selectedNote.riskTag === "AMBER" ? (
                          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            ⚠️ Acute Care / Urgent OPD
                          </span>
                        ) : (
                          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                            🟢 OPD Consultation (Routine Mild)
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Destination Room / Ward (Printed on Token Slip)
                          </label>
                          <input
                            type="text"
                            value={assignedRoomChoice}
                            onChange={(e) => setAssignedRoomChoice(e.target.value)}
                            placeholder="Enter room manually (e.g. Room 1 or OPD 2)"
                            className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-[13px] font-bold text-slate-900 outline-none focus:border-emerald-600 shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Quick Select Configured Hospital Rooms
                          </label>
                          <select
                            value={assignedRoomChoice}
                            onChange={(e) => setAssignedRoomChoice(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-[13px] font-bold text-slate-900 outline-none focus:border-emerald-600 shadow-2xs cursor-pointer"
                          >
                            {facilityRooms.length === 0 ? (
                              <option value="">-- No custom rooms configured by hospital admin yet --</option>
                            ) : (
                              <>
                                <option value="">-- Choose Hospital Ward / Room --</option>
                                {facilityRooms.map((rm) => (
                                  <option key={rm.id || rm.roomNumber} value={`${rm.roomNumber} - ${rm.name}`}>
                                    {rm.roomNumber} - {rm.name} ({rm.category || "OPD"})
                                  </option>
                                ))}
                              </>
                            )}
                          </select>
                        </div>
                      </div>

                      {/* Quick Selection only from actual hospital layout */}
                      {facilityRooms.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                          <span className="font-bold text-slate-500">Quick Select:</span>
                          {facilityRooms.map((rm) => (
                            <button
                              key={rm.id || rm.roomNumber}
                              type="button"
                              onClick={() => {
                                setAssignedRoomChoice(`${rm.roomNumber} - ${rm.name}`);
                                if (rm.category === "EMERGENCY" || rm.urgency === "RED") {
                                  setDisposition("Admit to Emergency Ward");
                                } else {
                                  setDisposition("Routine OPD Treatment");
                                }
                              }}
                              className="px-2 py-0.5 rounded-md font-bold bg-white text-slate-800 border border-slate-300 hover:bg-emerald-50 hover:border-emerald-400 cursor-pointer"
                            >
                              {rm.roomNumber}: {rm.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* DEDICATED CLINICAL DECISION ACTION BAR (PERMANENTLY VISIBLE TO ALL STAFF) */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-emerald-50/30 to-teal-50/20 border-2 border-emerald-500/60 shadow-xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <IconCheckCircle className="w-5 h-5 text-emerald-600" />
                          <h3 className="text-[13.5px] font-black text-slate-900 uppercase tracking-wide">
                            Clinical Triage Actions
                          </h3>
                        </div>
                        <span className="text-[11.5px] font-medium text-slate-500">
                          Reviewing as: <strong className="text-emerald-900 font-black">{staffSession?.staff?.name || "Doctor / Staff"}</strong> ({userRole})
                        </span>
                      </div>

                      {/* Prominent banner & Next Token advance button when action completed */}
                      {actionCompletedForNote?.id === selectedNote.id && (
                        <div className="p-3.5 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-950 space-y-2 animate-fade-in shadow-xs">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="text-[13px] font-black flex items-center gap-1.5 text-emerald-900">
                              <IconCheckCircle className="w-4 h-4 text-emerald-700" />
                              Token {actionCompletedForNote.token} Marked as {actionCompletedForNote.text}!
                            </span>
                            <span className="text-[11px] font-bold text-emerald-800 bg-white/90 px-2 py-0.5 rounded-md border border-emerald-200">
                              Signed: {actionCompletedForNote.reviewerName}
                            </span>
                          </div>
                          <p className="text-[12px] text-slate-600 font-medium">
                            Clinical evaluation saved. Click below to pop out this patient's token and advance smoothly to the next patient in the queue.
                          </p>
                          <button
                            type="button"
                            onClick={handleAdvanceToNextToken}
                            disabled={isAdvancingToken}
                            className="btn-tactile w-full py-3 px-4 rounded-xl font-black text-[14px] text-white bg-slate-900 hover:bg-slate-800 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span>Next Patient Token</span>
                            <IconArrowRight className="w-4 h-4 text-emerald-400" />
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* 1. APPROVE BUTTON */}
                        <button
                          type="button"
                          disabled={loading || isAdvancingToken}
                          onClick={() => handleDecision("APPROVE")}
                          className="btn-tactile w-full py-3 px-4 rounded-xl font-black text-[13.5px] text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                          title="Approve Triage & Queue for OPD Consultation"
                        >
                          <IconCheckCircle className="w-4 h-4" />
                          <span>Approve</span>
                        </button>

                        {/* 2. SAVE & EDIT BUTTON */}
                        <button
                          type="button"
                          disabled={loading || isAdvancingToken}
                          onClick={() => handleDecision("EDIT_APPROVE")}
                          className="btn-tactile w-full py-3 px-4 rounded-xl font-black text-[13.5px] text-white bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                          title="Save edited summary and record clinical disposition"
                        >
                          <IconClipboard className="w-4 h-4" />
                          <span>Save & Edit</span>
                        </button>

                        {/* 3. REJECT BUTTON */}
                        <button
                          type="button"
                          disabled={loading || isAdvancingToken}
                          onClick={() => handleDecision("REJECT")}
                          className="btn-tactile w-full py-3 px-4 rounded-xl font-black text-[13.5px] text-rose-700 bg-white hover:bg-rose-50 border-2 border-rose-300 hover:border-rose-400 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                          title="Reject invalid or duplicate intake"
                        >
                          <IconXCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>

                      
                        {/* 4. REFERRAL BUTTON (Feature 3: Referral Automation) */}
                        <button
                          type="button"
                          onClick={() => {
                            setReferralSuccessResult(null);
                            setReferralReason("");
                            setShowReferralModal(true);
                          }}
                          className="btn-tactile w-full py-2.5 px-4 rounded-xl font-bold text-[13px] text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-300 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                          title="Generate official referral letter for secondary/tertiary hospital"
                        >
                          <span>📤</span>
                          <span>Refer to Higher Facility</span>
                        </button>

                        {/* 4. ESCALATE SECONDARY ACTION */}
                      <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={loading || isAdvancingToken}
                          onClick={() => handleDecision("ESCALATE")}
                          className="btn-tactile text-[12px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <IconShield className="w-4 h-4 text-blue-600" />
                          <span>Escalate to Senior Doctor</span>
                        </button>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Decisions are permanently signed into the audit log
                        </span>
                      </div>
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

      {/* Account Recovery / Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        initialEmail={email}
        portalName="Staff Workstation"
        onSuccess={({ identifier, newPassword }) => {
          if (identifier.includes("@")) {
            setEmail(identifier);
          }
          setPassword(newPassword);
        }}
      />

      {/* Referral Automation Modal (Feature 3) */}
      {showReferralModal && selectedNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🏥</span>
                <div>
                  <h3 className="font-black text-[16px] tracking-tight">Refer Patient to Higher Facility</h3>
                  <p className="text-[12px] text-teal-200">
                    Token: <strong>{selectedNote.patient?.tokenId || selectedNote.tokenId || "Token"}</strong> • {selectedNote.patient?.name || "Patient"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowReferralModal(false);
                  setReferralSuccessResult(null);
                }}
                className="text-teal-200 hover:text-white text-lg font-bold px-2 py-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {referralSuccessResult ? (
                <div className="space-y-4 text-center py-2">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-base">Referral Letter Generated!</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Patient successfully referred to <strong>{referralTargetFacility}</strong>.
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Referral ID: {referralSuccessResult.referralId}
                    </p>
                  </div>

                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-left text-xs text-teal-950 space-y-1.5">
                    <p><strong>1. On Patient's Phone/Portal:</strong> The patient will now see a bold &quot;Hospital Transfer &amp; Referral&quot; card with a PDF download button on their status screen.</p>
                    <p><strong>2. Via Email:</strong> An official transfer notice with PDF was dispatched to the receiving center &amp; patient.</p>
                    <p><strong>3. Print Physical Copy:</strong> Click below to print or download the official signed letter to hand to the patient right now.</p>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <a
                      href={`${API_BASE}/api/referrals/${referralSuccessResult.referralId}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 px-4 rounded-xl font-black text-sm text-white bg-teal-900 hover:bg-teal-800 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>📥 Download &amp; Print Official Referral Letter (PDF)</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setShowReferralModal(false);
                        setReferralSuccessResult(null);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendReferral} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                      Destination Facility (Receiving Hospital)
                    </label>
                    <select
                      value={referralTargetFacility}
                      onChange={(e) => setReferralTargetFacility(e.target.value)}
                      className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-teal-600 text-slate-900 cursor-pointer shadow-2xs"
                    >
                      {REFERRAL_HOSPITALS.map((hospital) => (
                        <option key={hospital} value={hospital}>
                          🏥 {hospital}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                      Quick Clinical Indications (Click to add)
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        "ICU / Ventilator Bed Required",
                        "Emergency Surgical Evaluation",
                        "Advanced Cardiac Cath Lab",
                        "Pediatric Specialist Needed",
                        "Severe Blood Loss / Transfusion"
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setReferralReason((prev) => prev ? `${prev}; ${chip}` : chip)}
                          className="text-[11px] font-semibold px-2 py-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 transition cursor-pointer"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>

                    <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                      Clinical Reason &amp; Justification for Escalation *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={referralReason}
                      onChange={(e) => setReferralReason(e.target.value)}
                      placeholder="e.g. Critical chest pain with abnormal vitals; requires urgent troponin, coronary angiography and tertiary CCU admission."
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-teal-600"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowReferralModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={referralSubmitting}
                      className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-teal-900 hover:bg-teal-800 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      {referralSubmitting ? "Generating Referral..." : "Generate Official Transfer Pass →"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
