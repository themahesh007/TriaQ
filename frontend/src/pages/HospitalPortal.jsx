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

export default function HospitalPortal({ onNavigateHome }) {
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

  // Active Dashboard Tab: "qr" | "staff" | "queue"
  const [activeTab, setActiveTab] = useState("qr");

  // Facility Data
  const [staffList, setStaffList] = useState([]);
  const [facilityQueue, setFacilityQueue] = useState([]);
  const [notification, setNotification] = useState("");

  // Add Staff Modal / Form
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffRole, setStaffRole] = useState("DOCTOR"); // DOCTOR | NURSE
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [staffDepartment, setStaffDepartment] = useState("General Medicine");
  const [staffPhone, setStaffPhone] = useState("");
  const [addStaffError, setAddStaffError] = useState("");

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

  const handleLogout = () => {
    localStorage.removeItem("triaq_hospital_session");
    setSession(null);
    setStaffList([]);
    setFacilityQueue([]);
  };

  // Fetch Facility Staff and Queue
  const fetchFacilityData = useCallback(async () => {
    if (!session?.token) return;
    try {
      const headers = { Authorization: `Bearer ${session.token}` };
      const staffRes = await fetch(`${API_BASE}/api/hospital/staff`, { headers });
      if (staffRes.ok) {
        setStaffList(await staffRes.json());
      }

      // Fetch pending notes for this facility
      const notesRes = await fetch(`${API_BASE}/api/triage-notes?status=PENDING`, { headers });
      if (notesRes.ok) {
        const allNotes = await notesRes.json();
        const facilityName = session.facility?.name || "";
        const facilityId = session.facility?.id || "";
        const matched = allNotes.filter(
          (n) =>
            (n.facilityId && n.facilityId === facilityId) ||
            (n.facility && n.facility.toLowerCase().includes(facilityName.toLowerCase()))
        );
        setFacilityQueue(matched);
      }
    } catch (err) {
      console.error("Facility data fetch error:", err);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchFacilityData();
      const interval = setInterval(fetchFacilityData, 4000);
      return () => clearInterval(interval);
    }
  }, [session, fetchFacilityData]);

  // Handle Add Doctor / Nurse
  const handleAddStaff = async (e) => {
    e.preventDefault();
    setAddStaffError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/hospital/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.token}`
        },
        body: JSON.stringify({
          name: staffName.trim(),
          email: staffEmail.trim(),
          password: staffPassword,
          role: staffRole,
          department: staffDepartment,
          phone: cleanIndianPhone(staffPhone)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add medical staff");

      setNotification(`✓ ${staffRole === "DOCTOR" ? "Dr." : "Nurse"} ${staffName} successfully added to hospital roster!`);
      setShowAddStaffModal(false);
      setStaffName("");
      setStaffEmail("");
      setStaffPassword("");
      setStaffPhone("");
      await fetchFacilityData();
    } catch (err) {
      setAddStaffError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

      {/* LOGIN VIEW IF NOT LOGGED IN */}
      {!session ? (
        <div className="max-w-md mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <span className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center mx-auto mb-2 shadow-xs">
              <IconHospital className="w-6 h-6 text-emerald-600" />
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Hospital Admin Login
            </h2>
            <p className="text-[13px] text-slate-500 font-medium">
              Manage facility QR standees, sequential OPD tokens, and your hospital's Doctors & Nurses roster.
            </p>
          </div>

          {/* Quick Fill Demo */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <span className="text-[10.5px] font-black uppercase text-slate-500 tracking-wider block text-center">
              Quick Facility Demo Credentials:
            </span>
            <button
              type="button"
              onClick={() => {
                setLoginEmail("admin@apollo.org");
                setLoginPassword("Apollo@123");
              }}
              className="btn-tactile w-full py-2 px-3 rounded-lg bg-white hover:bg-emerald-50 text-[12px] font-bold text-emerald-800 border border-slate-200 hover:border-emerald-300 transition cursor-pointer shadow-2xs flex items-center justify-center gap-2"
            >
              <IconHospital className="w-4 h-4 text-emerald-600" />
              <span>Apollo PHC Hub (admin@apollo.org / Apollo@123)</span>
            </button>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12.5px] font-bold text-center">
              {loginError}
            </div>
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
                placeholder="admin@apollo.org"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
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
              className="btn-tactile w-full py-3 rounded-xl font-black text-[14px] text-white bg-slate-900 hover:bg-slate-800 transition cursor-pointer shadow-xs active:scale-98"
            >
              {loading ? "Authenticating..." : "Sign In to Hospital Portal →"}
            </button>
          </form>
        </div>
      ) : (
        /* LOGGED IN DASHBOARD */
        <div className="space-y-6">
          {/* Facility Banner Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {session.facility?.type || "HOSPITAL"}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Code: {session.facility?.code || "APOLLO-01"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {session.facility?.name}
              </h1>
              <p className="text-[13px] text-slate-300 font-medium">
                📍 {session.facility?.address || "Main Medical Enclave, New Delhi"} • Admin: {session.facility?.adminEmail}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/10 min-w-[130px]">
                <span className="block text-[11px] font-bold text-slate-300 uppercase">Live Queue</span>
                <span className="text-2xl font-black text-emerald-400">{facilityQueue.length}</span>
                <span className="block text-[10px] text-slate-400">Tokens Waiting</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/10 min-w-[130px]">
                <span className="block text-[11px] font-bold text-slate-300 uppercase">Medical Roster</span>
                <span className="text-2xl font-black text-teal-300">{staffList.length}</span>
                <span className="block text-[10px] text-slate-400">Doctors & Nurses</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
            {[
              { id: "qr", label: "Facility QR Standee", icon: IconQRCode },
              { id: "staff", label: `Doctors & Nurses (${staffList.length})`, icon: IconDoctor },
              { id: "queue", label: `Live OPD Queue (${facilityQueue.length})`, icon: IconPatient }
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`btn-tactile px-4 py-2 rounded-xl font-black text-[13px] transition flex items-center gap-2 cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: FACILITY QR STANDEE */}
          {activeTab === "qr" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Standee Printable Card */}
              <div className="md:col-span-5 bg-white rounded-2xl p-6 border-2 border-emerald-500/40 shadow-sm text-center space-y-4">
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
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-inner">
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
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
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

                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 flex items-center justify-between">
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

          {/* TAB 2: DOCTORS & NURSES MANAGEMENT */}
          {activeTab === "staff" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Hospital Doctors & Nurses Roster
                  </h3>
                  <p className="text-[12.5px] text-slate-500 font-medium">
                    Add certified doctors and staff nurses authorized to conduct triage and consultations at {session.facility?.name}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(true)}
                  className="btn-tactile py-2.5 px-4 rounded-xl font-black text-[13px] text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>+ Add Doctor / Nurse</span>
                </button>
              </div>

              {staffList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <IconDoctor className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">No Medical Staff Registered Yet</p>
                  <p className="text-xs text-slate-400">
                    Click "+ Add Doctor / Nurse" above to onboard your medical team.
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
                          <span>Status: Active</span>
                          <span className="text-emerald-700 font-bold">Authorized</span>
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
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
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
        </div>
      )}

      {/* ADD DOCTOR / NURSE MODAL */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <IconDoctor className="w-5 h-5 text-emerald-600" />
                <span>Add Medical Staff</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer font-black"
              >
                ✕
              </button>
            </div>

            {addStaffError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12.5px] font-bold">
                {addStaffError}
              </div>
            )}

            <form onSubmit={handleAddStaff} className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Medical Role <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "DOCTOR", label: "Doctor", desc: "MD / MBBS" },
                    { id: "NURSE", label: "Nurse", desc: "Staff RN" }
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setStaffRole(r.id)}
                      className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer transition ${
                        staffRole === r.id
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="block text-sm font-black">{r.label}</span>
                      <span className={`block text-[10px] ${staffRole === r.id ? "text-slate-300" : "text-slate-400"}`}>
                        {r.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder={staffRole === "DOCTOR" ? "Dr. Anita Desai" : "Nurse Rajesh Kumar"}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Department
                </label>
                <select
                  value={staffDepartment}
                  onChange={(e) => setStaffDepartment(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="General Medicine">General Medicine</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Emergency & Trauma">Emergency & Trauma</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="ENT">ENT</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Official Email <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="anita.desai@hospital.org"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Password (min 8 characters) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showStaffPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-2.5 pr-10 rounded-xl border border-slate-200 text-[13px] font-medium outline-none focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStaffPassword(!showStaffPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                  >
                    {showStaffPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Contact Mobile (10 digits)
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(cleanIndianPhone(e.target.value))}
                  placeholder="9876543210"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-mono outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-tactile px-5 py-2 rounded-xl text-[13px] font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer"
                >
                  {loading ? "Adding..." : "Confirm & Add to Roster"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
