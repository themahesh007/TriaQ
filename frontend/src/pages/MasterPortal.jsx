import React, { useState, useEffect, useCallback } from "react";

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
  const [email, setEmail] = useState("master@triaq.org");
  const [password, setPassword] = useState("Master@123");
  const [totpCode, setTotpCode] = useState("123456");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState("analytics"); // analytics | patients | staff | override | audit

  // Data states
  const [analytics, setAnalytics] = useState(null);
  const [allPatients, setAllPatients] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [notification, setNotification] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // Override modal states
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("APPROVED");
  const [overrideReason, setOverrideReason] = useState("");

  const fetchMasterData = useCallback(async () => {
    if (!masterSession?.token) return;
    try {
      const headers = { Authorization: `Bearer ${masterSession.token}` };

      // 1. Analytics
      const aRes = await fetch(`${API_BASE}/api/master/analytics`, { headers });
      if (aRes.ok) setAnalytics(await aRes.json());

      // 2. All Patients
      const pRes = await fetch(`${API_BASE}/api/master/all-patients`, { headers });
      if (pRes.ok) setAllPatients(await pRes.json());

      // 3. All Staff
      const sRes = await fetch(`${API_BASE}/api/master/all-staff`, { headers });
      if (sRes.ok) setAllStaff(await sRes.json());

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
  const handleSuspendStaff = async (staffId) => {
    const reason = prompt("Enter suspension reason:");
    if (!reason) return;
    try {
      const res = await fetch(`${API_BASE}/api/master/suspend-staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${masterSession.token}`
        },
        body: JSON.stringify({ staffId, reason })
      });
      if (res.ok) {
        setNotification(`Staff account ${staffId} suspended.`);
        fetchMasterData();
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Submit Decision Override
  const handleExecuteOverride = async (e) => {
    e.preventDefault();
    if (!selectedNoteId.trim() || !overrideReason.trim()) {
      alert("Note ID and mandatory clinical rationale are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/master/override-decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${masterSession.token}`
        },
        body: JSON.stringify({
          triageNoteId: selectedNoteId.trim(),
          newStatus: overrideStatus,
          reason: overrideReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Override failed");

      setNotification(`✓ Override executed: Note ${selectedNoteId} updated to ${overrideStatus}. Logged to audit trail.`);
      setSelectedNoteId("");
      setOverrideReason("");
      fetchMasterData();
    } catch (err) {
      alert("Error executing override: " + err.message);
    } finally {
      setLoading(false);
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
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
              />
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
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap">
              {[
                { id: "analytics", label: "📊 Global Analytics" },
                { id: "patients", label: `👥 All Patients (${allPatients.length})` },
                { id: "staff", label: `👨‍⚕️ All Staff (${allStaff.length})` },
                { id: "override", label: "⚡ Decision Override" },
                { id: "audit", label: `📜 System Audit (${auditLogs.length})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition cursor-pointer ${
                    activeTab === tab.id ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
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

          {/* TAB 2: ALL PATIENTS (CROSS-FACILITY UNMASKED) */}
          {activeTab === "patients" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">All Patients Across Facilities (Decrypted)</h3>
                <span className="text-[11.5px] font-bold text-slate-400">Total: {allPatients.length}</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {allPatients.map((p) => (
                  <div key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900">{p.tokenId}</span>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {p.facility}
                        </span>
                      </div>
                      <div className="text-slate-700 font-medium mt-0.5">
                        {p.name} • Age: {p.age} • Phone: {p.phone}
                      </div>
                      {p.address && <span className="text-[11.5px] text-slate-400">Address: {p.address}</span>}
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: STAFF GOVERNANCE */}
          {activeTab === "staff" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Staff Account Governance</h3>
                <span className="text-[11.5px] font-bold text-slate-400">Total Staff: {allStaff.length}</span>
              </div>

              <div className="divide-y divide-slate-100">
                {allStaff.map((s) => (
                  <div key={s.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-[14px] text-slate-900 block">{s.name}</span>
                      <span className="text-[12px] text-slate-500 font-medium">
                        {s.email} • {s.facility} • Role: <strong>{s.role}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${s.isActive ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                        {s.isActive ? "Active" : "Suspended"}
                      </span>
                      {s.role !== "MASTER" && s.isActive && (
                        <button
                          type="button"
                          onClick={() => handleSuspendStaff(s.id)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          Suspend Account
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: DECISION OVERRIDE */}
          {activeTab === "override" && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5 max-w-xl mx-auto">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase text-rose-700 tracking-wider">
                  Administrative Override Protocol
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Override Clinical Triage Decision
                </h3>
                <p className="text-[12.5px] text-slate-500 font-medium">
                  Overrides are strictly logged in the permanent audit trail with your Master ID and clinical explanation.
                </p>
              </div>

              <form onSubmit={handleExecuteOverride} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Triage Note ID or Receipt Number <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={selectedNoteId}
                    onChange={(e) => setSelectedNoteId(e.target.value)}
                    placeholder="Paste Triage Note ID (e.g. c2ualh55gjqmu8habc2)"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:border-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    New Decision Status
                  </label>
                  <select
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-900 outline-none focus:border-rose-600"
                  >
                    <option value="APPROVED">APPROVED (Force approve case)</option>
                    <option value="REJECTED">REJECTED (Direct to emergency desk)</option>
                    <option value="PENDING">PENDING (Re-open for doctor review)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Clinical Rationale & Explanation <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Describe clinical reason for override (e.g. Supervisor verified patient has acute symptoms requiring immediate admission)..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:border-rose-600 leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-black text-[13.5px] text-white bg-rose-700 hover:bg-rose-800 transition cursor-pointer shadow-xs active:scale-98"
                >
                  {loading ? "Executing..." : "Execute Override & Log to Audit Trail →"}
                </button>
              </form>
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
        </div>
      )}
    </div>
  );
}
