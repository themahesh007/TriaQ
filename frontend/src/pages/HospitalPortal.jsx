import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  IconHospital,
  IconClinic,
  IconDoctor,
  IconNurse,
  IconQRCode,
  IconEye,
  IconEyeOff,
  IconClipboard,
  IconCheckCircle,
  IconXCircle,
  IconArrowRight,
  IconShield,
  IconPatient
} from "../components/Icons";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

// Clean Indian 10-digit phone
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

export default function HospitalPortal({ onNavigateHome, language = "en" }) {
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem("triaq_hospital_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login Form States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  // Self-Registration Form States for Hospitals / Clinics
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regType, setRegType] = useState("HOSPITAL"); // HOSPITAL | CLINIC
  const [regState, setRegState] = useState("");
  const [regDistrict, setRegDistrict] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLicenseNumber, setRegLicenseNumber] = useState("");
  const [regError, setRegError] = useState("");
  const [submittedPendingFacility, setSubmittedPendingFacility] = useState(null);

  // Active Dashboard Tab: "qr" | "approvals" | "staff" | "queue" | "rooms"
  const [activeTab, setActiveTab] = useState("qr");

  // Facility Data
  const [staffList, setStaffList] = useState([]);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [facilityQueue, setFacilityQueue] = useState([]);
  const [notification, setNotification] = useState("");

  // Rooms & OPD Wards Management
  const [roomsList, setRoomsList] = useState([]);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomCategory, setNewRoomCategory] = useState("OPD");
  const [newRoomFloor, setNewRoomFloor] = useState("Ground Floor");
  const [newRoomUrgency, setNewRoomUrgency] = useState("GREEN");

  // Patient Records & Visits State
  const [allPatientsList, setAllPatientsList] = useState([]);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [patientRiskFilter, setPatientRiskFilter] = useState("ALL");
  const [patientStatusFilter, setPatientStatusFilter] = useState("ALL");
  const [selectedPatientModal, setSelectedPatientModal] = useState(null);



  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/hospital/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hospital login failed");

      localStorage.setItem("triaq_hospital_session", JSON.stringify(data));
      setSession(data);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Hospital Self-Registration
  const handleHospitalRegister = async (e) => {
    e.preventDefault();
    setRegError("");
    setLoading(true);
    const facilityPayload = {
      name: regName.trim(),
      type: regType,
      licenseNumber: regLicenseNumber.trim().toUpperCase(),
      state: regState.trim(),
      district: regDistrict.trim(),
      city: regCity.trim(),
      phone: cleanIndianPhone(regPhone),
      adminEmail: regEmail.trim().toLowerCase(),
      adminPassword: regPassword
    };
    try {
      const res = await fetch(`${API_BASE}/api/hospital/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(facilityPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hospital registration failed");

      setSubmittedPendingFacility(facilityPayload);
      setNotification(`✓ Registration submitted for "${facilityPayload.name}"! Awaiting Master clearance.`);
    } catch (err) {
      setRegError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("triaq_hospital_session");
    setSession(null);
    setStaffList([]);
    setPendingStaff([]);
    setFacilityQueue([]);
    setAllPatientsList([]);
  };

  // Fetch Facility Staff, Pending Approvals, and Queue
  const fetchFacilityData = useCallback(async () => {
    if (!session?.token) return;
    try {
      const headers = { Authorization: `Bearer ${session.token}` };
      const [staffRes, pendingRes, notesRes, roomsRes] = await Promise.all([
        fetch(`${API_BASE}/api/hospital/staff`, { headers }),
        fetch(`${API_BASE}/api/hospital/pending-staff`, { headers }),
        fetch(`${API_BASE}/api/triage-notes?status=ALL`, { headers }),
        fetch(`${API_BASE}/api/hospital/rooms`, { headers })
      ]);

      if (staffRes.ok) {
        setStaffList(await staffRes.json());
      }
      if (pendingRes.ok) {
        setPendingStaff(await pendingRes.json());
      }
      if (roomsRes && roomsRes.ok) {
        setRoomsList(await roomsRes.json());
      }
      if (notesRes.ok) {
        const allNotes = await notesRes.json();
        const facilityName = session.facility?.name || "";
        const facilityId = session.facility?.id || "";
        const matched = allNotes.filter(
          (n) =>
            (n.facilityId && n.facilityId === facilityId) ||
            (n.facility && n.facility.toLowerCase().includes(facilityName.toLowerCase()))
        );
        setFacilityQueue(matched.filter((n) => n.status === "PENDING"));
        setAllPatientsList(matched);
      }
    } catch (err) {
      console.error("Facility data fetch error:", err);
    }
  }, [session]);

  // HOD Approves Pending Doctor/Nurse Sign-up (Method B)
  const handleApproveStaff = async (staffId, staffName, role) => {
    try {
      const res = await fetch(`${API_BASE}/api/hospital/staff/${staffId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.token}`
        },
        body: JSON.stringify({ status: "APPROVED" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve staff");
      setNotification(`✓ ${role === "DOCTOR" ? "Dr." : "Nurse"} ${staffName} has been approved and authorized to access Staff Desk!`);
      fetchFacilityData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // HOD Rejects Pending Doctor/Nurse Sign-up (Method B)
  const handleRejectStaff = async (staffId, staffName, role) => {
    if (!confirm(`Are you sure you want to reject the registration of ${role === "DOCTOR" ? "Dr." : "Nurse"} ${staffName}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/hospital/staff/${staffId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.token}`
        },
        body: JSON.stringify({ status: "REJECTED" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject staff");
      setNotification(`Staff registration for ${staffName} was rejected.`);
      fetchFacilityData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Hospital Adds a Room or OPD Ward
  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/hospital/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.token}`
        },
        body: JSON.stringify({
          roomNumber: newRoomNumber.trim() || `Room 0${roomsList.length + 1}`,
          name: newRoomName.trim(),
          category: newRoomCategory,
          floor: newRoomFloor.trim() || "Ground Floor",
          urgency: newRoomUrgency
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add room");
      setNotification(`✓ ${newRoomName} successfully added to hospital layout!`);
      setShowAddRoomModal(false);
      setNewRoomNumber("");
      setNewRoomName("");
      fetchFacilityData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Hospital Removes a Room or OPD Ward
  const handleDeleteRoom = async (roomId, roomName) => {
    if (!confirm(`Are you sure you want to remove "${roomName}" from hospital layout?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/hospital/rooms/${roomId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove room");
      setNotification(`✓ "${roomName}" removed from layout.`);
      fetchFacilityData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // HOD Removes Staff from Roster
  const handleRemoveStaff = async (staffId, staffName) => {
    if (!confirm(`Are you sure you want to remove ${staffName} from this hospital's active roster?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/hospital/staff/${staffId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove staff");
      setNotification(`✓ ${staffName} removed from hospital roster.`);
      fetchFacilityData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  useEffect(() => {
    if (session) {
      fetchFacilityData();
      const interval = setInterval(fetchFacilityData, 4000);
      // Filtered patients for Patient Records & Visits tab
  const filteredPatients = useMemo(() => {
    return allPatientsList.filter((item) => {
      if (patientRiskFilter !== "ALL" && item.riskTag !== patientRiskFilter) {
        return false;
      }
      if (patientStatusFilter !== "ALL" && item.status !== patientStatusFilter) {
        return false;
      }
      if (patientSearchQuery.trim()) {
        const q = patientSearchQuery.toLowerCase().trim();
        const pName = (item.patient?.name || item.patientName || "").toLowerCase();
        const pPhone = (item.patient?.phone || "").toLowerCase();
        const token = (item.patient?.tokenId || item.tokenId || "").toLowerCase();
        const receipt = (item.receiptNumber || "").toLowerCase();
        const sym = (item.rawSymptomText || item.summary || "").toLowerCase();
        const disp = (item.disposition || "").toLowerCase();
        return (
          pName.includes(q) ||
          pPhone.includes(q) ||
          token.includes(q) ||
          receipt.includes(q) ||
          sym.includes(q) ||
          disp.includes(q)
        );
      }
      return true;
    });
  }, [allPatientsList, patientRiskFilter, patientStatusFilter, patientSearchQuery]);

  // Export Patient Registry to CSV
  const handleExportCSV = () => {
    if (!filteredPatients || filteredPatients.length === 0) {
      alert("No patient records available to export for the current filters.");
      return;
    }
    const headers = [
      "Receipt Number",
      "Token ID",
      "Patient Name",
      "Age",
      "Phone",
      "Date Time",
      "Risk Priority",
      "Status",
      "Reported Symptoms",
      "BP (Systolic/Diastolic)",
      "Pulse (bpm)",
      "SpO2 (%)",
      "Temp (F)",
      "Doctor Disposition",
      "Prescription (Rx)"
    ];

    const rows = filteredPatients.map((p) => [
      `"${p.receiptNumber || ""}"`,
      `"${p.patient?.tokenId || p.tokenId || ""}"`,
      `"${(p.patient?.name || "Patient").replace(/"/g, '""')}"`,
      `"${p.patient?.age || ""}"`,
      `"${p.patient?.phone || ""}"`,
      `"${new Date(p.createdAt).toLocaleString()}"`,
      `"${p.riskTag || "GREEN"}"`,
      `"${p.status || "PENDING"}"`,
      `"${(p.rawSymptomText || p.summary || "").replace(/"/g, '""')}"`,
      `"${p.vitals?.bpSystolic ? `${p.vitals.bpSystolic}/${p.vitals.bpDiastolic || ""}` : ""}"`,
      `"${p.vitals?.pulse || ""}"`,
      `"${p.vitals?.spo2 || ""}"`,
      `"${p.vitals?.temp || ""}"`,
      `"${(p.disposition || "").replace(/"/g, '""')}"`,
      `"${(p.prescription || "").replace(/"/g, '""')}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute(
      "download",
      `TriaQ_${session?.facility?.name ? session.facility.name.replace(/\s+/g, "_") : "Hospital"}_Patient_Registry_${dateStr}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return () => clearInterval(interval);
    }
  }, [session, fetchFacilityData]);



  // QR Standee URL
  const qrCheckInUrl = useMemo(() => {
    if (!session?.facility) return "";
    const base = window.location.origin;
    return `${base}/#patient?facility=${encodeURIComponent(session.facility.id)}&name=${encodeURIComponent(session.facility.name)}`;
  }, [session]);

  const qrImageUrl = useMemo(() => {
    if (!qrCheckInUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCheckInUrl)}&margin=10`;
  }, [qrCheckInUrl]);

  return (
    <div className="max-w-[1240px] mx-auto px-4 py-6 md:py-8 space-y-6">
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
          <span className="text-[12.5px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <IconHospital className="w-4 h-4 text-emerald-600 inline" />
            Hospital & Clinic Admin Portal
          </span>
        </div>

        {session && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase tracking-wider">
              {session.facility?.type || "HOSPITAL"}
            </span>
            <span className="text-[12.5px] font-bold text-slate-800">
              {session.facility?.name}
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

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-bold flex items-center justify-between animate-fade-in">
          <span>{notification}</span>
          <button
            type="button"
            onClick={() => setNotification("")}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer font-black"
          >
            ✕
          </button>
        </div>
      )}

      {/* LOGIN OR REGISTER VIEW IF NOT LOGGED IN */}
      {!session ? (
        <div className="max-w-xl mx-auto govt-panel border border-slate-300 rounded-md overflow-hidden shadow-xs space-y-0">
          {/* Official Government Header Ribbon */}
          <div className="bg-[#003366] text-white px-5 py-3 border-b border-[#002244] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🏥</span>
              <h3 className="font-bold text-[13px] tracking-wide uppercase">
                Health Facility &amp; Clinical Administration
              </h3>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#002244] text-amber-300 border border-amber-400/40">
              Official Portal
            </span>
          </div>

          <div className="p-6 space-y-5 bg-white">
            <div className="space-y-1 border-b border-slate-200 pb-3">
              <h2 className="text-xl font-bold text-[#003366] tracking-tight">
                Hospital &amp; Healthcare Center Portal
              </h2>
              <p className="text-[12.5px] text-slate-600 font-medium">
                Reception QR Standee generator, sequential OPD token dispatcher, and Doctor / Staff clearance roster.
              </p>
            </div>

            {/* Toggle Tabs: Login vs Register */}
            <div className="grid grid-cols-2 p-1 rounded bg-slate-100 border border-slate-300 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setLoginError("");
                  setRegError("");
                }}
                className={`py-2 px-3 rounded text-[13px] font-bold transition cursor-pointer ${
                  !isRegistering
                    ? "bg-[#003366] text-white shadow-xs"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                Facility Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setLoginError("");
                  setRegError("");
                }}
                className={`py-2 px-3 rounded text-[13px] font-bold transition cursor-pointer ${
                  isRegistering
                    ? "bg-[#003366] text-white shadow-xs"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                + Register Facility
              </button>
            </div>

            {!isRegistering ? (
              /* --- 1. LOGIN FORM --- */
              <div className="space-y-4">
                {loginError && (
                  loginError.toLowerCase().includes("pending") ? (
                    <div className="p-3.5 rounded bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-2 font-bold text-[13px] text-amber-900">
                        <span className="text-base">⚠️</span>
                        <span>NOTICE: Facility Registration Under Verification</span>
                      </div>
                      <p className="text-[12px] font-medium text-amber-900 leading-relaxed pl-5">
                        {loginError}
                      </p>
                      <p className="text-[11px] font-bold text-amber-800 pl-5">
                        Please await verification approval from the State Health Registry Administrator.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-rose-50 border border-rose-300 text-rose-800 text-[12.5px] font-bold text-center">
                      {loginError}
                    </div>
                  )
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1">
                      Facility Administrator Email
                    </label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="admin@hospital.org"
                      className="w-full p-2.5 rounded border border-slate-300 text-[13px] font-medium text-slate-900 outline-none focus:border-[#003366]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1">
                      Facility Password
                    </label>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-2.5 pr-10 rounded border border-slate-300 text-[13px] font-medium text-slate-900 outline-none focus:border-[#003366]"
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
                    className="btn-tactile w-full py-2.5 rounded font-bold text-[14px] text-white bg-[#003366] hover:bg-[#002855] transition cursor-pointer shadow-xs"
                  >
                    {loading ? "Authenticating..." : "Sign In to Hospital Portal →"}
                  </button>
                </form>
              </div>
          ) : (
            /* --- 2. REGISTER NEW HOSPITAL VIEW (WITH DEDICATED PENDING CAUTION SCREEN) --- */
            submittedPendingFacility ? (
              <div className="space-y-5 animate-fade-in">
                {/* Dedicated Amber Caution Banner */}
                <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/90 text-amber-950 space-y-2.5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    <h4 className="font-black text-[14px] uppercase tracking-wide text-amber-900">
                      CAUTION: Facility Registration Submitted — Master Verification Required
                    </h4>
                  </div>
                  <p className="text-[12.5px] leading-relaxed font-medium text-amber-900">
                    Your facility registration for <strong>{submittedPendingFacility.name}</strong> has been logged in the Master Registry.
                    <strong> To safeguard patient health records and prevent unauthorized access, hospital portal login remains strictly locked until identity verification is completed and approved by the State Master Administration.</strong>
                  </p>
                  <div className="p-2.5 rounded-lg bg-amber-100 border border-amber-200 text-[11.5px] font-bold text-amber-900 flex items-center gap-2">
                    <span>📌</span>
                    <span>Once approved by Master, your reception QR standee and sequential OPD token queue will unlock immediately.</span>
                  </div>
                </div>

                {/* Submitted Facility Details Summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      Application Summary
                    </span>
                    <span className="text-[10.5px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      ⏳ AWAITING MASTER APPROVAL
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[12.5px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Facility Name:</span>
                      <strong className="text-slate-900">{submittedPendingFacility.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Facility Type:</span>
                      <span className="font-bold text-emerald-800">{submittedPendingFacility.type}</span>
                    </div>
                    {submittedPendingFacility.licenseNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">License Number:</span>
                        <span className="font-mono text-slate-900 font-bold">{submittedPendingFacility.licenseNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Regional Location:</span>
                      <strong className="text-slate-900">
                        {submittedPendingFacility.city}, {submittedPendingFacility.district}, {submittedPendingFacility.state}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Admin Email:</span>
                      <span className="font-mono text-slate-900 text-[12px]">{submittedPendingFacility.adminEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contact Phone:</span>
                      <span className="font-mono text-slate-900 text-[12px]">+91 {submittedPendingFacility.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail(submittedPendingFacility.adminEmail);
                      setSubmittedPendingFacility(null);
                      setIsRegistering(false);
                      setLoginError("");
                    }}
                    className="btn-tactile w-full py-3 rounded-xl font-black text-[13.5px] text-white bg-slate-900 hover:bg-slate-800 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceed to Hospital Login Desk →</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedPendingFacility(null);
                      setRegName("");
                      setRegLicenseNumber("");
                      setRegState("");
                      setRegDistrict("");
                      setRegCity("");
                      setRegPhone("");
                      setRegEmail("");
                      setRegPassword("");
                    }}
                    className="w-full py-2.5 rounded-xl font-bold text-[12.5px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Register Another Hospital / Clinic
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[12px] font-medium leading-relaxed">
                  <strong>🛡️ Master Verification:</strong> Newly registered healthcare facilities require verification & approval by the State Master Administration before logging in.
                </div>

                {regError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12.5px] font-bold text-center">
                    {regError}
                  </div>
                )}

              <form onSubmit={handleHospitalRegister} className="space-y-3.5">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Hospital / Clinic Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. City General Hospital or LifeCare Clinic"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Hospital / Medical License Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regLicenseNumber}
                    onChange={(e) => setRegLicenseNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. CEA/OD/2024/774 or MH/HOSP/8892"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 tracking-wider"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Official registration number under the Clinical Establishments Act or State Health Dept.
                  </p>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Facility Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["HOSPITAL", "CLINIC"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRegType(t)}
                        className={`py-2 px-3 rounded-xl text-[12px] font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          regType === t
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {t === "HOSPITAL" ? <IconHospital className="w-4 h-4 text-emerald-600" /> : <IconClinic className="w-4 h-4 text-teal-600" />}
                        <span>{t === "HOSPITAL" ? "Hospital" : "Clinic / PHC"}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* State, District, City (Mandatory) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      State <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regState}
                      onChange={(e) => setRegState(e.target.value)}
                      placeholder="e.g. Odisha"
                      className="w-full p-2 rounded-xl border border-slate-200 text-[12.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      District <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regDistrict}
                      onChange={(e) => setRegDistrict(e.target.value)}
                      placeholder="e.g. Khordha"
                      className="w-full p-2 rounded-xl border border-slate-200 text-[12.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      placeholder="e.g. Bhubaneswar"
                      className="w-full p-2 rounded-xl border border-slate-200 text-[12.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Contact Number (10 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-600">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="9876543210"
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Administrator Official Email (ID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="admin@hospital.org"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Create Password (PASS) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full p-2.5 pr-10 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    >
                      {showRegPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-tactile w-full py-2.5 rounded font-bold text-[14px] text-white bg-[#003366] hover:bg-[#002855] transition cursor-pointer shadow-xs"
                >
                  {loading ? "Submitting Facility..." : "Submit Facility for Master Verification →"}
                </button>
              </form>
            </div>
            )
          )}
          </div>
        </div>
      ) : (
        /* LOGGED IN DASHBOARD */
        <div className="space-y-6">
          {/* Facility Banner Card */}
          <div className="govt-panel bg-white text-slate-900 rounded-md p-6 shadow-sm flex flex-wrap items-center justify-between gap-4 border border-slate-300">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 font-extrabold shadow-2xs">
                  {session.facility?.type || "HEALTHCARE CLINIC"}
                </span>
                <span className="text-[12px] font-mono font-bold text-slate-800">
                  <strong className="font-extrabold text-slate-900">HFR Code:</strong> <span className="font-black text-[#003366]">{session.facility?.code || session.facility?.id}</span>
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded bg-emerald-800 text-white border border-emerald-700 font-black shadow-2xs">
                  ✓ Verified Facility
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#003366]">
                {session.facility?.name}
              </h1>
              <p className="text-[13px] text-slate-800 font-bold leading-relaxed">
                <span className="text-rose-600 font-bold">📍</span> <strong className="font-black text-slate-900">{session.facility?.address || "Registered Clinical Location"}</strong> • <span className="font-bold text-slate-700">Nodal Officer Email:</span> <strong className="font-black text-[#003366]">{session.facility?.adminEmail || "Healthcare Admin"}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-[#003366] text-white rounded p-3 text-center border border-[#0B2545] min-w-[120px] shadow-2xs">
                <span className="block text-[11px] font-black text-amber-300 uppercase tracking-wide">Live Queue</span>
                <span className="text-2xl font-black text-white">{facilityQueue.length}</span>
                <span className="block text-[10px] text-slate-200 font-bold">Tokens Waiting</span>
              </div>
              <div className="bg-[#003366] text-white rounded p-3 text-center border border-[#0B2545] min-w-[120px] shadow-2xs">
                <span className="block text-[11px] font-black text-amber-300 uppercase tracking-wide">Pending Staff</span>
                <span className={`text-2xl font-black ${pendingStaff.length > 0 ? "text-amber-400" : "text-white"}`}>
                  {pendingStaff.length}
                </span>
                <span className="block text-[10px] text-slate-200 font-bold">Needs Clearance</span>
              </div>
              <div className="bg-[#003366] text-white rounded p-3 text-center border border-[#0B2545] min-w-[120px] shadow-2xs">
                <span className="block text-[11px] font-black text-amber-300 uppercase tracking-wide">Medical Roster</span>
                <span className="text-2xl font-black text-white">{staffList.length}</span>
                <span className="block text-[10px] text-slate-200 font-bold">Doctors & Nurses</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
            {[
              { id: "qr", label: "Facility QR Standee", icon: IconQRCode },
              {
                id: "approvals",
                label: `Staff Approvals (${pendingStaff.length})`,
                icon: IconShield,
                hasBadge: pendingStaff.length > 0
              },
              { id: "rooms", label: `Rooms & OPD Wards (${roomsList.length})`, icon: IconHospital },
              { id: "staff", label: `Active Roster (${staffList.length})`, icon: IconDoctor },
              { id: "queue", label: `Live OPD Queue (${facilityQueue.length})`, icon: IconPatient },
              { id: "patients", label: `Patient Records & Visits (${allPatientsList.length})`, icon: IconClipboard }
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`btn-tactile px-4 py-2 rounded font-bold text-[13px] transition flex items-center gap-2 cursor-pointer relative ${
                    activeTab === tab.id
                      ? "bg-[#003366] text-white shadow-xs"
                      : tab.hasBadge
                      ? "bg-amber-50 text-amber-900 border border-amber-400 hover:bg-amber-100"
                      : "bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-300"
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.hasBadge && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: FACILITY QR STANDEE */}
          {activeTab === "qr" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Standee Printable Card */}
              <div className="md:col-span-5 bg-white rounded-md p-6 border-2 border-emerald-500/40 shadow-sm text-center space-y-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-black uppercase tracking-wider">
                    <IconHospital className="w-3.5 h-3.5" />
                    <span>Official OPD Check-In Standee</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    {session.facility?.name}
                  </h3>
                  <p className="text-[12px] text-slate-500 font-medium">
                    Scan with any smartphone camera to lock in this hospital and generate your sequential OPD token.
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="bg-slate-50 p-4 rounded-md border border-slate-200 inline-block shadow-inner">
                  {qrImageUrl ? (
                    <img
                      src={qrImageUrl}
                      alt="Facility QR Code"
                      className="w-56 h-56 mx-auto rounded-lg shadow-xs"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                      Generating QR...
                    </div>
                  )}
                  <p className="text-[11px] font-mono text-slate-500 mt-2 font-bold">
                    Target: {session.facility?.name}
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn-tactile w-full py-2.5 px-4 rounded-xl font-black text-[13px] text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>🖨️ Print Reception Standee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(qrCheckInUrl);
                      setNotification("✓ Direct check-in link copied to clipboard!");
                    }}
                    className="btn-tactile w-full py-2 px-4 rounded-xl font-bold text-[12px] text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>📋 Copy Patient Check-In URL</span>
                  </button>
                </div>
              </div>

              {/* Sequential Token Guarantee & Instructions */}
              <div className="md:col-span-7 space-y-4">
                <div className="bg-white rounded-md p-6 border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <IconCheckCircle className="w-5 h-5 text-emerald-600" />
                    <span>How Live Sequential Tokens Work</span>
                  </h3>
                  <div className="space-y-3 text-[13px] text-slate-600 leading-relaxed font-medium">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <strong className="text-slate-900 block font-black">
                        1. Scan at Hospital Reception or Clinic Entrance
                      </strong>
                      <p>
                        When a walk-in patient scans the QR standee, they are instantly redirected to the Patient Portal with <strong className="text-emerald-800">{session.facility?.name}</strong> automatically locked in.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <strong className="text-slate-900 block font-black">
                        2. Shared Counter for Walk-ins & Remote Bookings
                      </strong>
                      <p>
                        Tokens are strictly sequential for today: if a clinic walk-in takes <span className="font-mono font-bold text-slate-900">TOKEN NUMBER 01</span>, an online remote patient booking next will automatically receive <span className="font-mono font-bold text-slate-900">TOKEN NUMBER 02</span>. No numbers are ever skipped or duplicated!
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <strong className="text-slate-900 block font-black">
                        3. Real-Time Sync on Doctor Station
                      </strong>
                      <p>
                        Doctors and nurses logged in under this hospital see tokens appear live on their workstation queue. When reviewing, they can approve or reject with smooth tactile controls.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-md p-5 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider">
                      Direct Web Check-in URL
                    </span>
                    <p className="font-mono text-[12px] text-emerald-950 font-bold break-all mt-0.5">
                      {qrCheckInUrl}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STAFF APPROVALS DESK (METHOD B) */}
          {activeTab === "approvals" && (
            <div className="bg-white rounded-md p-6 border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <IconShield className="w-5 h-5 text-amber-600" />
                    <span>Doctor & Nurse Sign-Up Approvals (HOD Desk)</span>
                  </h3>
                  <p className="text-[12.5px] text-slate-500 font-medium">
                    Review and authorize medical staff who have registered under <strong>{session.facility?.name}</strong>. Only HOD-approved staff are granted access to the Staff Station.
                  </p>
                </div>
                <span className="text-[12px] font-black px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {pendingStaff.length} Pending Clearance
                </span>
              </div>

              {pendingStaff.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <IconCheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
                  <p className="font-bold text-slate-700">All Medical Staff Registrations Cleared</p>
                  <p className="text-xs text-slate-400">
                    No pending Doctor or Nurse verification requests for this facility at this time.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingStaff.map((s) => {
                    const isDoc = s.role === "DOCTOR";
                    return (
                      <div
                        key={s.id}
                        className="p-4 rounded-xl border-2 border-amber-300/80 bg-amber-50/30 shadow-xs space-y-3 transition hover:border-amber-400"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10.5px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                              isDoc
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                : "bg-teal-100 text-teal-900 border border-teal-300"
                            }`}
                          >
                            {isDoc ? <IconDoctor className="w-3 h-3" /> : <IconNurse className="w-3 h-3" />}
                            <span>{isDoc ? "Doctor" : "Staff Nurse"}</span>
                          </span>
                          <span className="text-[11px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                            Pending HOD Verification
                          </span>
                        </div>

                        <div>
                          <h4 className="font-black text-slate-900 text-base">
                            {s.name}
                          </h4>
                          <p className="text-[12.5px] text-slate-600 font-medium">
                            ✉️ {s.email}
                          </p>
                          {s.phone && (
                            <p className="text-[12px] font-mono text-slate-500">
                              📞 +91 {s.phone}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-400 font-medium mt-1">
                            Registered on: {new Date(s.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-amber-200/70 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveStaff(s.id, s.name, s.role)}
                            className="btn-tactile py-2 px-3 rounded-xl font-black text-[12.5px] text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>✓ Approve Staff</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectStaff(s.id, s.name, s.role)}
                            className="btn-tactile py-2 px-3 rounded-xl font-bold text-[12.5px] text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>✕ Reject</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DOCTORS & NURSES ACTIVE ROSTER */}
          {activeTab === "staff" && (
            <div className="bg-white rounded-md p-6 border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Hospital Doctors & Nurses Roster
                  </h3>
                  <p className="text-[12.5px] text-slate-500 font-medium">
                    Active certified doctors and staff nurses authorized to conduct triage and consultations at {session.facility?.name}.
                  </p>
                </div>

              </div>

              {staffList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <IconDoctor className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">No Active Medical Staff on Roster</p>
                  <p className="text-xs text-slate-400">
                    When Doctors or Nurses self-register under this hospital, verify and approve them in the "Staff Approvals" tab to grant access.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staffList.map((s) => {
                    const isDoc = s.role === "DOCTOR";
                    return (
                      <div
                        key={s.id}
                        className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white hover:shadow-xs transition space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              isDoc
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                : "bg-teal-100 text-teal-900 border border-teal-300"
                            }`}
                          >
                            {isDoc ? <IconDoctor className="w-3 h-3" /> : <IconNurse className="w-3 h-3" />}
                            <span>{s.role}</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {s.department || "OPD"}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-black text-slate-900 text-[14px]">
                            {s.name}
                          </h4>
                          <p className="text-[12px] text-slate-500 font-medium">
                            {s.email}
                          </p>
                          {s.phone && (
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                              📞 +91 {s.phone}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                          <span className="text-emerald-700 font-bold">✓ Authorized Staff</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveStaff(s.id, s.name)}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                          >
                            Remove Staff
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: ROOMS & OPD WARDS MANAGEMENT */}
          {activeTab === "rooms" && (
            <div className="bg-white rounded-md p-6 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <IconHospital className="w-5 h-5 text-emerald-600" />
                    <span>Hospital Rooms & OPD Wards Layout</span>
                  </h3>
                  <p className="text-[12.5px] text-slate-500 font-medium">
                    Configure Emergency Wards, OPD consultation suites, and specialized clinics. These rooms sync live to the Staff Desk so clinicians can route patients by urgency.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(true)}
                  className="btn-tactile px-4 py-2.5 rounded-xl font-black text-[13px] text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>➕ Add Room / OPD Ward</span>
                </button>
              </div>

              {/* Add Room Modal / Inline Form */}
              {showAddRoomModal && (
                <div className="p-5 rounded-md border-2 border-emerald-400 bg-emerald-50/40 shadow-xs space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5 uppercase tracking-wide">
                      <span>🏥</span> Add New Room or Ward
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddRoomModal(false)}
                      className="text-slate-400 hover:text-slate-700 font-black cursor-pointer"
                    >
                      ✕ Cancel
                    </button>
                  </div>

                  <form onSubmit={handleAddRoom} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Room Number / Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newRoomNumber}
                        onChange={(e) => setNewRoomNumber(e.target.value)}
                        placeholder="e.g. Room 01, Ward A"
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium bg-white outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Room / Ward Designation <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder="e.g. Emergency Ward, General OPD"
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium bg-white outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Ward Category
                      </label>
                      <select
                        value={newRoomCategory}
                        onChange={(e) => setNewRoomCategory(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-bold bg-white outline-none focus:border-emerald-600 cursor-pointer"
                      >
                        <option value="EMERGENCY">🔴 Emergency Ward (Severe)</option>
                        <option value="OPD">🟢 OPD Consultation (Routine)</option>
                        <option value="SPECIALIST">🩺 Specialist Clinic</option>
                        <option value="ICU">🟣 ICU / Critical Care</option>
                        <option value="TRIAGE">🟡 Secondary Triage Desk</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Floor / Location
                      </label>
                      <input
                        type="text"
                        value={newRoomFloor}
                        onChange={(e) => setNewRoomFloor(e.target.value)}
                        placeholder="Ground Floor, Wing A"
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium bg-white outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="sm:col-span-2 md:col-span-4 flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddRoomModal(false)}
                        className="px-4 py-2 rounded-xl text-[12.5px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-tactile px-5 py-2 rounded-xl text-[12.5px] font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer"
                      >
                        Save Room to Layout →
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Rooms List */}
              {roomsList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <IconHospital className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">No Custom Rooms Configured</p>
                  <p className="text-xs text-slate-400">
                    Click "+ Add Room / OPD Ward" above to define your hospital's emergency wards and OPD consultation rooms.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roomsList.map((room) => {
                    const isEmerg = room.category === "EMERGENCY" || room.urgency === "RED";
                    const isOpd = room.category === "OPD" || room.urgency === "GREEN";
                    return (
                      <div
                        key={room.id || room.roomNumber}
                        className={`p-4 rounded-xl border transition shadow-2xs space-y-3 ${
                          isEmerg
                            ? "bg-rose-50/40 border-rose-200 hover:border-rose-400"
                            : isOpd
                            ? "bg-emerald-50/40 border-emerald-200 hover:border-emerald-400"
                            : "bg-white border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-[13px] px-2.5 py-0.5 rounded bg-white border border-slate-200 text-slate-900 shadow-2xs">
                            {room.roomNumber}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                              isEmerg
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : isOpd
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                : "bg-teal-100 text-teal-900 border border-teal-300"
                            }`}
                          >
                            {room.category || "OPD"}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-black text-slate-900 text-base">
                            {room.name}
                          </h4>
                          <p className="text-[12px] text-slate-500 font-medium">
                            📍 {room.floor || "Ground Floor"}
                          </p>
                          <p className="text-[11px] font-bold mt-1 text-slate-600">
                            {isEmerg
                              ? "⚠️ Priority: High / Immediate (Emergency Ward)"
                              : "✓ Priority: Routine OPD (Walk-in Consult)"}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-700">
                            Live on Staff Desk
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(room.id, room.name)}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIVE FACILITY QUEUE */}
          {activeTab === "queue" && (
            <div className="bg-white rounded-md p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-black text-slate-900">
                  Live Patient Intake Queue ({facilityQueue.length})
                </h3>
                <span className="text-[11px] font-bold text-slate-400">
                  Refreshed live every 4 seconds
                </span>
              </div>

              {facilityQueue.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <IconPatient className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">No Patients in Waiting Queue</p>
                  <p className="text-xs text-slate-400">
                    Patients scanning the QR code or booking for {session.facility?.name} will appear here sequentially.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {facilityQueue.map((item) => (
                    <div key={item.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">
                            {item.patient?.tokenId || item.tokenId || "Token"}
                          </span>
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
                          <span className="text-[11px] font-mono text-slate-400">
                            Receipt: {item.receiptNumber || "N/A"}
                          </span>
                        </div>
                        <p className="text-[12.5px] text-slate-600 max-w-xl line-clamp-1 font-medium">
                          {item.summary || item.rawSymptomText}
                        </p>
                      </div>

                      <div className="text-right text-[11.5px] text-slate-400 font-medium">
                        <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="block text-emerald-700 font-bold uppercase text-[10px]">Pending Review</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PATIENT RECORDS & VISITS */}
          {activeTab === "patients" && (
            <div className="bg-white rounded-md p-6 border border-slate-200 shadow-xs space-y-6">
              {/* Top Title & Export Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📋</span>
                    <h3 className="text-lg font-black text-slate-900">
                      Patient Records &amp; Clinical Visits Registry
                    </h3>
                  </div>
                  <p className="text-[12.5px] text-slate-500 font-medium mt-0.5">
                    Total ${allPatientsList.length} patient visit(s) logged for ${session?.facility?.name || "this hospital"}. Complete record of reported symptoms, vitals, triage risk, and doctor dispositions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={allPatientsList.length === 0}
                  className="btn-tactile px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-black text-[12.5px] transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  title="Export filtered records as a CSV spreadsheet"
                >
                  <span>📥</span>
                  <span>Export Registry (CSV)</span>
                </button>
              </div>

              {/* Metrics Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Visits</span>
                  <span className="text-xl font-black text-slate-900">${allPatientsList.length}</span>
                  <span className="text-[10px] text-slate-400 block">All-time OPD cases</span>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[11px] font-bold text-blue-700 uppercase block">In Queue (Pending)</span>
                  <span className="text-xl font-black text-blue-900">
                    ${allPatientsList.filter((p) => p.status === "PENDING").length}
                  </span>
                  <span className="text-[10px] text-blue-600 block">Awaiting doctor review</span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase block">Consulted / Done</span>
                  <span className="text-xl font-black text-emerald-900">
                    ${allPatientsList.filter((p) => p.status === "APPROVED" || p.status === "EDITED").length}
                  </span>
                  <span className="text-[10px] text-emerald-600 block">Completed consultations</span>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[11px] font-bold text-rose-700 uppercase block">Critical (RED)</span>
                  <span className="text-xl font-black text-rose-900">
                    ${allPatientsList.filter((p) => p.riskTag === "RED").length}
                  </span>
                  <span className="text-[10px] text-rose-600 block">High urgency triage</span>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[11px] font-bold text-amber-800 uppercase block">Urgent (YELLOW)</span>
                  <span className="text-xl font-black text-amber-900">
                    ${allPatientsList.filter((p) => p.riskTag === "YELLOW" || p.riskTag === "AMBER").length}
                  </span>
                  <span className="text-[10px] text-amber-700 block">Priority clinical cases</span>
                </div>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                {/* Search Bar */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={patientSearchQuery}
                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                    placeholder="Search by patient name, phone, token (e.g. 01), receipt, or symptom keyword..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 focus:border-[#003366] focus:outline-none text-[13px] font-medium text-slate-800 bg-white placeholder:text-slate-400 shadow-2xs"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
                  {patientSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPatientSearchQuery("")}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 font-bold text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Risk Tag Filter */}
                <div className="w-full sm:w-auto flex items-center gap-1.5">
                  <label className="text-[11.5px] font-bold text-slate-500 whitespace-nowrap">Risk:</label>
                  <select
                    value={patientRiskFilter}
                    onChange={(e) => setPatientRiskFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] font-bold text-slate-800 bg-white focus:outline-none"
                  >
                    <option value="ALL">All Triage Tiers</option>
                    <option value="RED">🔴 RED (Critical)</option>
                    <option value="YELLOW">🟡 YELLOW (Urgent)</option>
                    <option value="GREEN">🟢 GREEN (Routine)</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="w-full sm:w-auto flex items-center gap-1.5">
                  <label className="text-[11.5px] font-bold text-slate-500 whitespace-nowrap">Status:</label>
                  <select
                    value={patientStatusFilter}
                    onChange={(e) => setPatientStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] font-bold text-slate-800 bg-white focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">⏳ PENDING (Waiting)</option>
                    <option value="APPROVED">✓ APPROVED / DONE</option>
                    <option value="EDITED">✓ EDITED BY DOCTOR</option>
                    <option value="REFERRED">🚨 REFERRED OUT</option>
                    <option value="REJECTED">✕ REJECTED</option>
                  </select>
                </div>
              </div>

              {/* Records List / Table */}
              {filteredPatients.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-xl">
                  <span className="text-3xl block">📋</span>
                  <p className="font-bold text-slate-700 text-sm">No Patient Visits Match Criteria</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {allPatientsList.length === 0
                      ? "Patients scanning this hospital's QR standee or booking via citizen portal will automatically appear in this registry."
                      : "Try clearing your search query or reset the risk/status filters to see all visits."}
                  </p>
                  {(patientSearchQuery || patientRiskFilter !== "ALL" || patientStatusFilter !== "ALL") && (
                    <button
                      type="button"
                      onClick={() => {
                        setPatientSearchQuery("");
                        setPatientRiskFilter("ALL");
                        setPatientStatusFilter("ALL");
                      }}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Token &amp; Time</th>
                        <th className="py-3 px-4">Patient Particulars</th>
                        <th className="py-3 px-4">Symptoms &amp; Clinical Summary</th>
                        <th className="py-3 px-4">Triage Tier</th>
                        <th className="py-3 px-4">OPD Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[12.5px]">
                      {filteredPatients.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          {/* Token & Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-black text-slate-900 text-[13.5px] block font-mono">
                              ${item.patient?.tokenId || item.tokenId || "Token"}
                            </span>
                            <span className="text-[11px] text-slate-400 block font-medium">
                              ${new Date(item.createdAt).toLocaleDateString()} • ${new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block">
                              ${item.receiptNumber || ""}
                            </span>
                          </td>

                          {/* Patient Particulars */}
                          <td className="py-3.5 px-4">
                            <strong className="text-slate-900 block text-[13px]">
                              ${item.patient?.name || item.patientName || "Patient"}
                            </strong>
                            <div className="text-[11.5px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              {item.patient?.age && <span>${item.patient.age} yrs</span>}
                              {item.patient?.gender && <span>• ${item.patient.gender}</span>}
                              {item.patient?.phone && (
                                <span className="font-mono text-slate-600">• ${item.patient.phone}</span>
                              )}
                            </div>
                          </td>

                          {/* Symptoms & Vitals */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="text-slate-800 line-clamp-2 font-medium leading-relaxed">
                              ${item.rawSymptomText || item.summary || "Symptoms logged in triage."}
                            </p>
                            {item.vitals && Object.keys(item.vitals).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.vitals.bpSystolic && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                    BP: ${item.vitals.bpSystolic}/${item.vitals.bpDiastolic || "80"}
                                  </span>
                                )}
                                {item.vitals.spo2 && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                    SpO2: ${item.vitals.spo2}%
                                  </span>
                                )}
                                {item.vitals.pulse && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                    Pulse: ${item.vitals.pulse}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Risk Tier */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`text-[10.5px] font-black px-2.5 py-1 rounded-full inline-block ${
                                item.riskTag === "RED"
                                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                                  : item.riskTag === "YELLOW" || item.riskTag === "AMBER"
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              }`}
                            >
                              ${item.riskTag === "RED" ? "🔴 RED Priority" : item.riskTag === "YELLOW" || item.riskTag === "AMBER" ? "🟡 YELLOW Urgent" : "🟢 GREEN Routine"}
                            </span>
                          </td>

                          {/* OPD Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`text-[11px] font-black px-2 py-0.5 rounded ${
                                item.status === "APPROVED" || item.status === "EDITED"
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : item.status === "REFERRED"
                                  ? "bg-teal-50 text-teal-900 border border-teal-200"
                                  : item.status === "REJECTED"
                                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                                  : "bg-amber-50 text-amber-900 border border-amber-200"
                              }`}
                            >
                              ${item.status === "APPROVED" ? "✓ Approved" : item.status === "EDITED" ? "✓ Edited" : item.status === "REFERRED" ? "🚨 Referred" : item.status === "REJECTED" ? "✕ Rejected" : "⏳ Pending"}
                            </span>
                            {item.disposition && (
                              <span className="block text-[10.5px] text-slate-500 font-medium max-w-[130px] truncate mt-0.5" title={item.disposition}>
                                ${item.disposition}
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPatientModal(item)}
                              className="btn-tactile px-3 py-1.5 rounded-lg bg-[#003366] hover:bg-[#002244] text-white font-bold text-[11.5px] transition cursor-pointer shadow-2xs inline-flex items-center gap-1"
                            >
                              <span>🔍</span>
                              <span>Details</span>
                            </button>
                            {item.receiptNumber && (
                              <a
                                href={`${API_BASE}/api/patients/receipt/${item.receiptNumber}/pdf`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11.5px] transition inline-flex items-center gap-1 border border-slate-300"
                                title="Download Slip PDF"
                              >
                                <span>📄</span>
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}


          {/* PATIENT DETAILS MODAL */}
          {selectedPatientModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-300 animate-scale-up">
                {/* Modal Header */}
                <div className="bg-[#003366] text-white p-4 sm:p-5 flex items-center justify-between sticky top-0 z-10">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📋</span>
                    <div>
                      <h4 className="font-black text-[15px] leading-tight text-white">
                        OPD Patient Clinical Details
                      </h4>
                      <p className="text-[11px] text-amber-300 font-semibold">
                        Receipt: ${selectedPatientModal.receiptNumber || "N/A"} • Token: ${selectedPatientModal.patient?.tokenId || selectedPatientModal.tokenId || "N/A"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPatientModal(null)}
                    className="text-white hover:text-amber-300 font-black text-lg px-2 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 sm:p-6 space-y-5 text-left">
                  {/* Demographics */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12.5px]">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">Patient Name</span>
                      <strong className="text-slate-900 text-sm">
                        ${selectedPatientModal.patient?.name || selectedPatientModal.patientName || "Patient"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">Age / Gender</span>
                      <span className="text-slate-800 font-semibold">
                        ${selectedPatientModal.patient?.age ? `${selectedPatientModal.patient.age} yrs` : "N/A"} ${selectedPatientModal.patient?.gender ? `/ ${selectedPatientModal.patient.gender}` : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">Contact Phone</span>
                      <span className="font-mono text-slate-800 font-semibold">
                        ${selectedPatientModal.patient?.phone ? `+91 ${selectedPatientModal.patient.phone}` : "N/A"}
                      </span>
                    </div>
                    {selectedPatientModal.patient?.address && (
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-[11px] font-bold text-slate-400 block uppercase">Address</span>
                        <span className="text-slate-800 font-medium">${selectedPatientModal.patient.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Triage Priority Banner */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                    selectedPatientModal.riskTag === "RED"
                      ? "bg-rose-50 border-rose-300 text-rose-950"
                      : selectedPatientModal.riskTag === "YELLOW" || selectedPatientModal.riskTag === "AMBER"
                      ? "bg-amber-50 border-amber-300 text-amber-950"
                      : "bg-emerald-50 border-emerald-300 text-emerald-950"
                  }`}>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider block opacity-80">Triage Priority Assessment</span>
                      <strong className="text-base font-black">
                        ${selectedPatientModal.riskTag === "RED" ? "🔴 RED Priority (Critical Attention)" : selectedPatientModal.riskTag === "YELLOW" || selectedPatientModal.riskTag === "AMBER" ? "🟡 YELLOW Urgent" : "🟢 GREEN Routine Priority"}
                      </strong>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-slate-300 font-mono">
                      Status: ${selectedPatientModal.status}
                    </span>
                  </div>

                  {/* Symptoms & Vitals */}
                  <div className="space-y-3">
                    <h5 className="font-black text-[13px] text-slate-800 uppercase tracking-wide">
                      Chief Complaint &amp; Reported Symptoms
                    </h5>
                    <div className="p-4 rounded-xl border border-slate-200 bg-white">
                      <p className="text-[13px] text-slate-800 leading-relaxed font-medium">
                        ${selectedPatientModal.rawSymptomText || selectedPatientModal.summary || "Symptoms logged in triage."}
                      </p>

                      {/* Vitals */}
                      {selectedPatientModal.vitals && Object.keys(selectedPatientModal.vitals).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
                          {selectedPatientModal.vitals.bpSystolic && (
                            <div className="p-2 rounded bg-slate-50 border border-slate-200">
                              <span className="text-[10px] text-slate-400 block font-bold">Blood Pressure</span>
                              <strong className="text-slate-800">${selectedPatientModal.vitals.bpSystolic}/${selectedPatientModal.vitals.bpDiastolic || "80"} mmHg</strong>
                            </div>
                          )}
                          {selectedPatientModal.vitals.spo2 && (
                            <div className="p-2 rounded bg-slate-50 border border-slate-200">
                              <span className="text-[10px] text-slate-400 block font-bold">SpO2 Oxygen</span>
                              <strong className="text-slate-800">${selectedPatientModal.vitals.spo2}%</strong>
                            </div>
                          )}
                          {selectedPatientModal.vitals.pulse && (
                            <div className="p-2 rounded bg-slate-50 border border-slate-200">
                              <span className="text-[10px] text-slate-400 block font-bold">Pulse Rate</span>
                              <strong className="text-slate-800">${selectedPatientModal.vitals.pulse} bpm</strong>
                            </div>
                          )}
                          {selectedPatientModal.vitals.temp && (
                            <div className="p-2 rounded bg-slate-50 border border-slate-200">
                              <span className="text-[10px] text-slate-400 block font-bold">Body Temp</span>
                              <strong className="text-slate-800">${selectedPatientModal.vitals.temp}°F</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Doctor Disposition & Advice */}
                  {selectedPatientModal.disposition && (
                    <div className="space-y-2">
                      <h5 className="font-black text-[13px] text-slate-800 uppercase tracking-wide">
                        Doctor Clinical Disposition
                      </h5>
                      <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/70 text-[13px] font-bold text-slate-900 leading-relaxed">
                        ${selectedPatientModal.disposition}
                      </div>
                    </div>
                  )}

                  {/* Doctor Prescription (Rx) */}
                  {selectedPatientModal.prescription && (
                    <div className="space-y-2">
                      <h5 className="font-black text-[13px] text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <span>💊</span> Doctor's Prescription (Rx)
                      </h5>
                      <div className="p-4 rounded-xl border-2 border-emerald-400 bg-white text-[13px] font-semibold text-slate-800 whitespace-pre-line leading-relaxed shadow-xs">
                        ${selectedPatientModal.prescription}
                      </div>
                    </div>
                  )}

                  {/* Referral Details if any */}
                  {selectedPatientModal.referral && (
                    <div className="p-4 rounded-xl border-2 border-teal-600 bg-teal-50 space-y-2 text-[13px]">
                      <span className="font-black uppercase text-teal-950 block text-[12px]">
                        🚨 Case Referred / Escalated
                      </span>
                      <p className="text-slate-800">
                        Target Facility: <strong>🏥 ${selectedPatientModal.referral.targetFacility}</strong>
                      </p>
                      <p className="text-slate-700 text-xs">
                        Reason: ${selectedPatientModal.referral.referralReason}
                      </p>
                    </div>
                  )}

                  {/* Modal Footer Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-200">
                    {selectedPatientModal.receiptNumber && (
                      <a
                        href={`${API_BASE}/api/patients/receipt/${selectedPatientModal.receiptNumber}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-tactile flex-1 py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <span>📄</span>
                        <span>Open Official OPD Slip (PDF)</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedPatientModal(null)}
                      className="px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer border border-slate-300"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
