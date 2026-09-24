import React, { useState, useEffect, useCallback } from "react";
import {
  IconHospital,
  IconClinic,
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

export default function MasterPortal({ onNavigateHome }) {
  const [masterSession, setMasterSession] = useState(() => {
    try {
      const saved = localStorage.getItem("triaq_master_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login inputs
  const [email, setEmail] = useState("triaqproject@gmail.com");
  const [password, setPassword] = useState("TriaQ@2026");
  const [showMasterPw, setShowMasterPw] = useState(false);
  const [totpCode, setTotpCode] = useState("123456");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  // Active view tab (Defaults to Hospital Approvals & Network)
  const [activeTab, setActiveTab] = useState("facilities"); // facilities | analytics | audit

  // Data states
  const [analytics, setAnalytics] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [pendingFacilities, setPendingFacilities] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [notification, setNotification] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // QR Standee modal state
  const [showQrModalFacility, setShowQrModalFacility] = useState(null);

  const fetchMasterData = useCallback(async () => {
    if (!masterSession?.token) return;
    try {
      const headers = { Authorization: `Bearer ${masterSession.token}` };

      // 1. Operational Analytics (High-level counts only, no patient records)
      const aRes = await fetch(`${API_BASE}/api/master/analytics`, { headers });
      if (aRes.ok) setAnalytics(await aRes.json());

      // 2. All Approved Facilities
      const fRes = await fetch(`${API_BASE}/api/facilities`);
      if (fRes.ok) setFacilities(await fRes.json());

      // 3. Pending Facilities Awaiting Master Approval
      const pfRes = await fetch(`${API_BASE}/api/master/pending-facilities`, { headers });
      if (pfRes.ok) setPendingFacilities(await pfRes.json());

      // 4. Audit Log
      const logRes = await fetch(`${API_BASE}/api/audit-log?limit=100`, { headers });
      if (logRes.ok) setAuditLogs(await logRes.json());

      setLastSyncTime(new Date());
    } catch (err) {
      console.error("Master data fetch error:", err);
    }
  }, [masterSession]);

  // Real-Time Live Auto-Polling (every 3 seconds)
  useEffect(() => {
    fetchMasterData();
    const interval = setInterval(() => {
      fetchMasterData();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchMasterData]);

  // Master Login with 2FA
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/master/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, totpCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "2FA verification failed");

      localStorage.setItem("triaq_master_session", JSON.stringify(data));
      setMasterSession(data);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("triaq_master_session");
    setMasterSession(null);
  };

  // Suspend Staff
  // Clear All Data (Fresh Start)
  const handleClearAllData = async () => {
    if (!window.confirm("⚠️ ARE YOU SURE?\n\nThis will completely wipe all patient tickets, triage history, and test logs from both the cloud database and local memory to give you a 100% clean, fresh start.\n\nContinue?")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/master/clear-all-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${masterSession.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clear data");
      alert("✨ All project data has been wiped! You now have a 100% fresh, clean system.");
      setNotification("All project data wiped clean.");
      fetchMasterData();
    } catch (err) {
      alert("Error clearing data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Master Approves Hospital Entity
  const handleApproveFacility = async (facId, facName) => {
    try {
      const res = await fetch(`${API_BASE}/api/master/facilities/${facId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${masterSession.token}`
        },
        body: JSON.stringify({ status: "APPROVED" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve hospital");
      setNotification(`✓ Hospital "${facName}" approved and cleared for live operations!`);
      fetchMasterData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Master Rejects Hospital Entity
  const handleRejectFacility = async (facId, facName) => {
    if (!confirm(`Are you sure you want to reject registration of "${facName}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/master/facilities/${facId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${masterSession.token}`
        },
        body: JSON.stringify({ status: "REJECTED" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject hospital");
      setNotification(`Hospital registration for "${facName}" was rejected.`);
      fetchMasterData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };



  const handleDeleteFacility = async (facilityId, facilityName) => {
    if (!window.confirm(`Are you sure you want to remove healthcare facility "${facilityName}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/master/facilities/${facilityId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${masterSession.token}` }
      });
      if (res.ok) {
        setNotification(`✓ Facility "${facilityName}" deleted.`);
        fetchMasterData();
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

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
          <span className="text-[12px] font-black text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <span>🔐</span> Master System Administration (2FA)
          </span>
        </div>

        {masterSession && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-rose-900 text-white uppercase tracking-wider">
              MASTER ACCESS
            </span>
            <span className="text-[12.5px] font-bold text-slate-800">
              {masterSession.master?.name}
            </span>
            <button
              type="button"
              onClick={handleClearAllData}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 transition cursor-pointer flex items-center gap-1"
              title="Wipe all patients and triage tickets for a clean slate"
            >
              <span>🧹</span> Reset Data
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-[11.5px] font-bold text-rose-600 hover:underline cursor-pointer"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* 2FA LOGIN SCREEN */}
      {!masterSession ? (
        <div className="max-w-md mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center text-2xl mx-auto mb-2 border border-rose-200 shadow-2xs">
              🔐
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Master System Access
            </h2>
            <p className="text-[12.5px] text-slate-500 font-medium">
              Requires 2FA authenticator verification. For authorized system administrators & developers only.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12.5px] font-bold text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="master@triaq.org"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showMasterPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 pr-10 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                />
                <button
                  type="button"
                  onClick={() => setShowMasterPw(!showMasterPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                  title={showMasterPw ? "Hide password" : "Show password"}
                >
                  {showMasterPw ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-black text-slate-800 flex items-center gap-1.5">
                  <span>📱</span> 2FA Authenticator Code
                </label>
                <span className="text-[10.5px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Demo Code: 123456
                </span>
              </div>
              <input
                type="text"
                maxLength={6}
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-center font-mono text-xl tracking-widest text-slate-900 font-black outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-black text-[14px] text-white bg-gradient-to-r from-rose-700 to-slate-900 hover:from-rose-800 hover:to-slate-950 transition cursor-pointer shadow-xs active:scale-98"
            >
              {loading ? "Authenticating..." : "Authorize Master Session →"}
            </button>
          </form>
        </div>
      ) : (
        /* MASTER DASHBOARD VIEW */
        <div className="space-y-6">
          {/* Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap gap-1">
              {[
                {
                  id: "facilities",
                  label: `Hospital Approvals & Network (${facilities.length})${pendingFacilities.length > 0 ? ` • ${pendingFacilities.length} PENDING` : ""}`,
                  icon: IconHospital
                },
                { id: "analytics", label: "Platform Overview", icon: IconShield },
                { id: "audit", label: `System Audit (${auditLogs.length})`, icon: IconClipboard }
              ].map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`btn-tactile px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === tab.id ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-[11px] font-bold text-emerald-800 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Live Real-Time Sync</span>
                <span className="text-emerald-400">•</span>
                <span className="font-mono text-[10.5px] text-emerald-700">
                  {lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>

              <button
                type="button"
                onClick={fetchMasterData}
                className="px-3.5 py-1.5 rounded-xl font-bold text-[12px] bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer shadow-2xs"
              >
                🔄 Sync Now
              </button>
            </div>
          </div>

          {notification && (
            <div className="p-3.5 rounded-xl text-[13px] font-bold bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between">
              <span>{notification}</span>
              <button onClick={() => setNotification("")} className="cursor-pointer font-black">✕</button>
            </div>
          )}

          {/* TAB 1: GLOBAL ANALYTICS */}
          {activeTab === "analytics" && analytics && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Total Patients</span>
                  <span className="text-2xl font-black text-slate-900 block">{analytics.totalPatients}</span>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-black uppercase text-rose-700 tracking-wider">🔴 Red Flags</span>
                  <span className="text-2xl font-black text-rose-700 block">{analytics.priorityDistribution.red} ({analytics.priorityDistribution.redPercentage}%)</span>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-black uppercase text-amber-800 tracking-wider">🟡 Yellow Flags</span>
                  <span className="text-2xl font-black text-amber-800 block">{analytics.priorityDistribution.yellow}</span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider">🟢 Green Flags</span>
                  <span className="text-2xl font-black text-emerald-800 block">{analytics.priorityDistribution.green}</span>
                </div>
              </div>

              {/* Performance Metrics & Facilities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-base font-black text-slate-900">Clinical Turnaround & Performance</h3>
                  <div className="space-y-2.5 text-[13px] font-medium">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Average Doctor Review Time</span>
                      <strong className="text-slate-900">{analytics.avgTurnaroundMinutes} minutes</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Active Medical Personnel</span>
                      <strong className="text-slate-900">{analytics.activeStaffCount} Doctors/Nurses</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Approved Triage Cases</span>
                      <strong className="text-emerald-700">{analytics.approvedCount}</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Rejected / Diverted to ER</span>
                      <strong className="text-rose-700">{analytics.rejectedCount}</strong>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-base font-black text-slate-900">Connected Healthcare Facilities</h3>
                  <div className="space-y-2 text-[12.5px]">
                    {(analytics.facilities || []).map((f) => (
                      <div key={f.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-900 block">{f.name}</span>
                          <span className="text-[11px] text-slate-400">{f.address} • {f.phone}</span>
                        </div>
                        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Online
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* TAB 5: SYSTEM AUDIT LOG */}
          {activeTab === "audit" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Immutable System Audit Trail</h3>
                <span className="text-[11.5px] font-bold text-slate-400">Total logged entries: {auditLogs.length}</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto text-[12.5px]">
                {auditLogs.map((entry) => (
                  <div key={entry.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900">[{entry.action}]</span>
                      <span className="text-slate-700 ml-1">Case: {entry.triageNote?.tokenId || entry.triageNoteId}</span>
                      <span className="text-slate-500 ml-1">— by <strong>{entry.reviewerId}</strong></span>
                      {entry.note && (
                        <span className="italic text-slate-500 ml-1 block text-[11.5px]">
                          "{entry.note}"
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: HEALTHCARE FACILITIES & CLINICS */}
          {activeTab === "facilities" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <IconHospital className="w-5 h-5 text-emerald-600" />
                    <span>Healthcare Facilities & Clinics ({facilities.length})</span>
                  </h3>
                  <p className="text-[12.5px] text-slate-500 font-medium">
                    Review and verify incoming hospital registrations with 1-click Approve or Reject, and monitor active reception QR standees.
                  </p>
                </div>
              </div>

              {/* HOSPITAL VERIFICATION & APPROVAL DESK */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                    <IconShield className="w-4 h-4 text-emerald-600" />
                    <span>Hospital Verification Queue ({pendingFacilities.length} Pending)</span>
                  </h4>
                  {pendingFacilities.length > 0 && (
                    <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                      Action Required ({pendingFacilities.length})
                    </span>
                  )}
                </div>

                {pendingFacilities.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingFacilities.map((pf) => (
                      <div key={pf.id} className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/30 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase">
                            {pf.type || "HOSPITAL"}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            ID: {pf.id}
                          </span>
                        </div>

                        <div>
                          <h5 className="font-black text-slate-900 text-base">{pf.name}</h5>
                          <p className="text-[12.5px] text-slate-700 font-medium">
                            📍 {pf.city ? `${pf.city}, ${pf.district}, ${pf.state}` : pf.address}
                          </p>
                          <p className="text-[12px] text-slate-600 font-medium mt-0.5">
                            ✉️ {pf.adminEmail} • 📞 +91 {pf.phone || "N/A"}
                          </p>
                          {pf.licenseNumber && (
                            <p className="text-[11.5px] font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                              <span className="text-slate-500 font-normal">License No:</span>
                              <span className="font-mono bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-200">
                                {pf.licenseNumber}
                              </span>
                            </p>
                          )}
                          <p className="text-[11px] text-slate-400 font-medium mt-1">
                            Registered on: {new Date(pf.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-amber-200 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveFacility(pf.id, pf.name)}
                            className="btn-tactile py-2.5 px-3 rounded-xl font-black text-[12.5px] text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>✓ Approve Hospital</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectFacility(pf.id, pf.name)}
                            className="btn-tactile py-2.5 px-3 rounded-xl font-bold text-[12.5px] text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>✕ Reject</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-2 text-emerald-900 font-black text-[13px]">
                      <IconCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>All Hospital Registrations Cleared — No Facilities Currently Pending Approval</span>
                    </div>
                    <p className="text-[12px] text-emerald-800 font-medium pl-6">
                      When a healthcare institution registers online via the Hospital Portal, their verification card will appear here instantly with 1-click Approve or Reject options.
                    </p>
                  </div>
                )}
              </div>

              {/* APPROVED ACTIVE FACILITIES */}
              <div>
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-3">
                  Approved & Active Facilities ({facilities.length})
                </h4>
              </div>

              {facilities.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <IconHospital className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">No Facilities Registered Yet</p>
                  <p className="text-xs text-slate-400">Click "+ Add Hospital / Clinic" to register your first facility.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {facilities.map((fac) => (
                    <div
                      key={fac.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white hover:shadow-xs transition space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            fac.type === "CLINIC"
                              ? "bg-teal-100 text-teal-900 border border-teal-300"
                              : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          }`}
                        >
                          {fac.type === "CLINIC" ? <IconClinic className="w-3 h-3" /> : <IconHospital className="w-3 h-3" />}
                          <span>{fac.type || "HOSPITAL"}</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 font-bold">
                          {fac.code || "FAC-01"}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-black text-slate-900 text-[14.5px]">
                          {fac.name}
                        </h4>
                        <p className="text-[12px] text-slate-500 font-medium line-clamp-1">
                          📍 {fac.address || "Main Medical Hub"}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-1">
                          Admin: {fac.adminEmail || "admin@facility.org"}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setShowQrModalFacility(fac)}
                          className="btn-tactile text-[11.5px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <IconQRCode className="w-3.5 h-3.5 text-emerald-700" />
                          <span>QR Standee</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteFacility(fac.id, fac.name)}
                          className="btn-tactile text-[11.5px] font-bold text-rose-700 hover:text-rose-900 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* QR STANDEE VIEW MODAL */}
      {showQrModalFacility && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border-2 border-emerald-500/40 shadow-xl space-y-4 text-center animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                Official Facility QR Standee
              </span>
              <button
                type="button"
                onClick={() => setShowQrModalFacility(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer font-black"
              >
                ✕
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">{showQrModalFacility.name}</h3>
              <p className="text-[12px] text-slate-500 font-medium">Scan to check in & obtain live sequential token</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                  `${window.location.origin}/#patient?facility=${encodeURIComponent(
                    showQrModalFacility.id
                  )}&name=${encodeURIComponent(showQrModalFacility.name)}`
                )}&margin=10`}
                alt="Facility QR Code"
                className="w-48 h-48 mx-auto rounded-lg"
              />
              <p className="text-[11px] font-mono text-slate-500 mt-2 font-bold">
                Target: {showQrModalFacility.name}
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-tactile w-full py-2.5 px-4 rounded-xl font-black text-[13px] text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer"
              >
                🖨️ Print Reception Standee
              </button>
              <button
                type="button"
                onClick={() => {
                  const checkInUrl = `${window.location.origin}/#patient?facility=${encodeURIComponent(
                    showQrModalFacility.id
                  )}&name=${encodeURIComponent(showQrModalFacility.name)}`;
                  navigator.clipboard.writeText(checkInUrl);
                  setNotification(`✓ Direct check-in link for ${showQrModalFacility.name} copied!`);
                  setShowQrModalFacility(null);
                }}
                className="btn-tactile w-full py-2 px-4 rounded-xl font-bold text-[12px] text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                📋 Copy Check-In Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
