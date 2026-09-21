import React, { useState, useEffect } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export default function PatientPortal({ onNavigateHome }) {
  // Session & navigation states
  const [patientSession, setPatientSession] = useState(() => {
    try {
      const saved = localStorage.getItem("triaq_patient_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentStep, setCurrentStep] = useState("auth"); // auth | intake | symptoms | confirmation | status
  const [authTab, setAuthTab] = useState("otp"); // otp | password
  const [isSignup, setIsSignup] = useState(false);

  // Auth Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("9876543210");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtpCode, setDemoOtpCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  // Intake Profile Inputs (persisted to localStorage draft)
  const [fullName, setFullName] = useState(() => localStorage.getItem("triaq_draft_name") || "");
  const [age, setAge] = useState(() => localStorage.getItem("triaq_draft_age") || "");
  const [contactPhone, setContactPhone] = useState(() => localStorage.getItem("triaq_draft_phone") || "");
  const [address, setAddress] = useState(() => localStorage.getItem("triaq_draft_address") || "");
  const [conditions, setConditions] = useState(() => localStorage.getItem("triaq_draft_conditions") || "");
  const [medications, setMedications] = useState(() => localStorage.getItem("triaq_draft_meds") || "");
  const [intakeSavedNotice, setIntakeSavedNotice] = useState("");

  // Symptoms & Vitals Inputs
  const [symptomText, setSymptomText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [reportImageBase64, setReportImageBase64] = useState(null);
  const [reportFileName, setReportFileName] = useState("");

  // Vitals
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [spo2, setSpo2] = useState("");
  const [temp, setTemp] = useState("");

  // Submission / Receipt Data
  const [receiptData, setReceiptData] = useState(null);
  const [statusData, setStatusData] = useState(null);

  // Auto-save draft on changes
  useEffect(() => {
    localStorage.setItem("triaq_draft_name", fullName);
    localStorage.setItem("triaq_draft_age", age);
    localStorage.setItem("triaq_draft_phone", contactPhone);
    localStorage.setItem("triaq_draft_address", address);
    localStorage.setItem("triaq_draft_conditions", conditions);
    localStorage.setItem("triaq_draft_meds", medications);
  }, [fullName, age, contactPhone, address, conditions, medications]);

  // Initial step determination if logged in
  useEffect(() => {
    if (patientSession) {
      if (receiptData) {
        setCurrentStep("confirmation");
      } else {
        setCurrentStep("intake");
      }
    } else {
      setCurrentStep("auth");
    }
  }, [patientSession]);

  // --- AUTH HANDLERS ---
  const handleSendOTP = async () => {
    setAuthError("");
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      setAuthError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/patients/login/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setDemoOtpCode(data.demoOtp || "123456");
        setOtp(data.demoOtp || "123456"); // Auto-fill demo OTP for convenience
      } else {
        setAuthError(data.error || "Failed to send OTP.");
      }
    } catch {
      // Offline fallback demo OTP
      setOtpSent(true);
      setDemoOtpCode("123456");
      setOtp("123456");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginOTP = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/patients/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      localStorage.setItem("triaq_patient_session", JSON.stringify(data));
      setPatientSession(data);
      if (!contactPhone) setContactPhone(phone);
      setCurrentStep("intake");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    const endpoint = isSignup ? "/api/patients/register" : "/api/patients/login";
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, phone, name: fullName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      localStorage.setItem("triaq_patient_session", JSON.stringify(data));
      setPatientSession(data);
      setCurrentStep("intake");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("triaq_patient_session");
    setPatientSession(null);
    setReceiptData(null);
    setStatusData(null);
    setCurrentStep("auth");
  };

  // --- INTAKE & PROFILE ---
  const handleSaveProfileAndProceed = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !age.trim()) {
      setIntakeSavedNotice("Please enter your name and age to proceed.");
      return;
    }

    setLoading(true);
    setIntakeSavedNotice("");

    try {
      if (patientSession?.token) {
        await fetch(`${API_BASE}/api/patients/profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${patientSession.token}`
          },
          body: JSON.stringify({
            name: fullName.trim(),
            age: age.trim(),
            phone: contactPhone.trim() || phone,
            address: address.trim(),
            conditions: conditions.trim(),
            medications: medications.trim()
          })
        });
      }
    } catch (err) {
      console.warn("Offline profile draft saved locally:", err);
    } finally {
      setLoading(false);
      setCurrentStep("symptoms");
    }
  };

  // --- VOICE INPUT ---
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please type your symptoms.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSymptomText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // --- REPORT ATTACHMENT ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReportFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setReportImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // --- SYMPTOMS SUBMIT ---
  const handleSubmitTriage = async (e) => {
    e.preventDefault();
    if (symptomText.trim().length < 15) {
      alert("Please describe your symptoms with at least 15 characters so doctors can properly evaluate your case.");
      return;
    }

    setLoading(true);
    try {
      const pId = patientSession?.patient?.id || patientSession?.id || "temp-patient";

      const vitalsObj = {
        bpSystolic: bpSystolic ? Number(bpSystolic) : null,
        bpDiastolic: bpDiastolic ? Number(bpDiastolic) : null,
        pulse: pulse ? Number(pulse) : null,
        spo2: spo2 ? Number(spo2) : null,
        temp: temp ? Number(temp) : null
      };

      const res = await fetch(`${API_BASE}/api/triage-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: pId,
          symptomText: symptomText.trim(),
          vitals: vitalsObj,
          reportImageBase64: reportImageBase64 || undefined
        })
      });

      const note = await res.json();
      if (!res.ok) throw new Error(note.error || "Failed to submit triage case");

      setReceiptData({
        ...note,
        fullName: fullName || "Patient",
        age,
        phone: contactPhone || phone,
        address
      });
      setCurrentStep("confirmation");
    } catch (err) {
      alert("Error submitting symptoms: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- CHECK STATUS ---
  const handleCheckStatus = async () => {
    setLoading(true);
    try {
      const pId = patientSession?.patient?.id || patientSession?.id;
      const res = await fetch(`${API_BASE}/api/patients/status?patientId=${pId}`);
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
        setCurrentStep("status");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[760px] mx-auto px-4 py-6 md:py-10 space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateHome}
            className="text-[12px] font-bold text-slate-500 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
          >
            ← Home
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-[12.5px] font-black text-emerald-800 uppercase tracking-wider">
            Patient Portal
          </span>
        </div>

        {patientSession && (
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-slate-600">
              Token: {patientSession.patient?.tokenId || "Active"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer ml-1"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: AUTHENTICATION (PHONE/OTP or EMAIL/PASSWORD)                      */}
      {/* ========================================================================= */}
      {currentStep === "auth" && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <span className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl mx-auto mb-2">
              📱
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Patient Check-In
            </h2>
            <p className="text-[13px] text-slate-500 font-medium max-w-sm mx-auto">
              Fast, free & lightweight check-in for OPD triage consultation. Works on 2G & 3G networks.
            </p>
          </div>

          {/* Auth Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => {
                setAuthTab("otp");
                setAuthError("");
              }}
              className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition cursor-pointer ${
                authTab === "otp" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              📱 Mobile & OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab("password");
                setAuthError("");
              }}
              className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition cursor-pointer ${
                authTab === "password" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ✉️ Email & Password
            </button>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12.5px] font-bold text-center">
              {authError}
            </div>
          )}

          {/* Tab 1: Phone + OTP */}
          {authTab === "otp" && (
            <form onSubmit={handleLoginOTP} className="space-y-4 max-w-sm mx-auto">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Mobile Number (India)
                </label>
                <div className="flex gap-2">
                  <span className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-bold text-slate-600 flex items-center">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="9876543210"
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 text-[13.5px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={loading}
                    className="px-3.5 py-2.5 rounded-xl text-[12px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                  >
                    {otpSent ? "Resend" : "Send OTP"}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-bold text-slate-700">
                      Enter 6-Digit OTP Code
                    </label>
                    {demoOtpCode && (
                      <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Demo Code: <strong>{demoOtpCode}</strong>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full p-3 rounded-xl border border-slate-200 text-center font-mono text-xl tracking-widest text-slate-900 font-black outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-slate-50/50"
                  />
                  <p className="text-[11px] text-slate-400 text-center font-medium">
                    (In demo mode, code is automatically pre-filled above)
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !otpSent}
                className="w-full py-3 rounded-xl font-black text-[14px] text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 transition cursor-pointer disabled:opacity-40 shadow-xs"
              >
                {loading ? "Verifying..." : "Verify & Continue →"}
              </button>
            </form>
          )}

          {/* Tab 2: Email + Password */}
          {authTab === "password" && (
            <form onSubmit={handleEmailAuth} className="space-y-4 max-w-sm mx-auto">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@example.com"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Password (min 8 chars)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {isSignup && (
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Contact Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setIsSignup(!isSignup)}
                  className="text-[12px] font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  {isSignup ? "Already have an account? Login" : "Don't have account? Sign up"}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-black text-[14px] text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 transition cursor-pointer disabled:opacity-40 shadow-xs"
              >
                {loading ? "Please wait..." : isSignup ? "Create Account & Check In →" : "Login & Continue →"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: INTAKE DEMOGRAPHICS (OFFLINE-SAFE DRAFT)                         */}
      {/* ========================================================================= */}
      {currentStep === "intake" && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10.5px] font-black uppercase text-emerald-700 tracking-wider">
                Step 1 of 2 • Offline-Safe
              </span>
              <h2 className="text-xl font-black text-slate-900">
                Tell us about yourself
              </h2>
            </div>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              Draft saved locally
            </span>
          </div>

          {intakeSavedNotice && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[12.5px] font-bold">
              {intakeSavedNotice}
            </div>
          )}

          <form onSubmit={handleSaveProfileAndProceed} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[13.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Age (in years) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={125}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[13.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={contactPhone || phone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[13.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Ward / Village / Address (Optional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Ward 4, Sector 12"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[13.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Existing Conditions (Optional)
              </label>
              <input
                type="text"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="e.g. Diabetes, Asthma, High Blood Pressure, None"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-[13.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Current Medications (Optional)
              </label>
              <input
                type="text"
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                placeholder="e.g. Metformin 500mg, Inhaler, None"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-[13.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCheckStatus}
                className="text-[12px] font-bold text-slate-500 hover:text-slate-800"
              >
                Check past status →
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl font-black text-[13.5px] text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 transition cursor-pointer shadow-xs active:scale-98"
              >
                Next: Describe Symptoms →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: SYMPTOMS & VITALS COLLECTION                                      */}
      {/* ========================================================================= */}
      {currentStep === "symptoms" && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10.5px] font-black uppercase text-emerald-700 tracking-wider">
                Step 2 of 2 • Clinical Symptoms
              </span>
              <h2 className="text-xl font-black text-slate-900">
                Describe your symptoms
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep("intake")}
              className="text-[12px] font-bold text-slate-500 hover:underline cursor-pointer"
            >
              ← Edit details
            </button>
          </div>

          <form onSubmit={handleSubmitTriage} className="space-y-5">
            {/* Symptoms Input Area + Voice Mic */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[12.5px] font-bold text-slate-800">
                  What is bothering you? When did it start? <span className="text-rose-600">*</span>
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {symptomText.length} chars (min 15)
                </span>
              </div>

              <div className="relative">
                <textarea
                  rows={4}
                  required
                  value={symptomText}
                  onChange={(e) => setSymptomText(e.target.value)}
                  placeholder="e.g. Mild fever, dry cough and body ache for the past 2 days. No breathing difficulty..."
                  className="w-full p-3.5 pr-14 rounded-xl border border-slate-200 text-[13.5px] text-slate-900 font-medium leading-relaxed outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-slate-50/40 focus:bg-white transition"
                />

                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`absolute right-3 bottom-4 p-2.5 rounded-xl text-lg transition shadow-xs cursor-pointer ${
                    isRecording
                      ? "bg-rose-600 text-white animate-pulse"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300"
                  }`}
                  title={isRecording ? "Listening... click to stop" : "Speak symptoms in microphone"}
                >
                  🎙️
                </button>
              </div>

              {isRecording && (
                <p className="text-[11.5px] font-bold text-rose-600 animate-pulse flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                  Listening... speak clearly into your microphone
                </p>
              )}
            </div>

            {/* Patient Vitals Tracker Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>🩺</span> Patient Vital Signs (Optional Triage Tracker)
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Auto-emergency alerts</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">Blood Pressure</span>
                  <div className="flex gap-1 items-center">
                    <input
                      type="number"
                      value={bpSystolic}
                      onChange={(e) => setBpSystolic(e.target.value)}
                      placeholder="Sys (120)"
                      className="w-full p-2 text-[12.5px] rounded-lg border border-slate-200 bg-white text-center font-bold"
                    />
                    <span className="text-slate-400">/</span>
                    <input
                      type="number"
                      value={bpDiastolic}
                      onChange={(e) => setBpDiastolic(e.target.value)}
                      placeholder="Dia (80)"
                      className="w-full p-2 text-[12.5px] rounded-lg border border-slate-200 bg-white text-center font-bold"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">Pulse (bpm)</span>
                  <input
                    type="number"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    placeholder="e.g. 76"
                    className="w-full p-2 text-[12.5px] rounded-lg border border-slate-200 bg-white text-center font-bold"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">SpO2 Oxygen (%)</span>
                  <input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder="e.g. 98"
                    className="w-full p-2 text-[12.5px] rounded-lg border border-slate-200 bg-white text-center font-bold"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">Temperature (°F)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    placeholder="e.g. 98.6"
                    className="w-full p-2 text-[12.5px] rounded-lg border border-slate-200 bg-white text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Optional Lab Report Photo */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-700 block">
                Do you have a lab report or prescription photo? (Optional)
              </label>
              <div className="flex items-center gap-3">
                <label className="px-4 py-2 rounded-xl border border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 transition cursor-pointer text-[12.5px] font-bold text-slate-700 flex items-center gap-2">
                  <span>📄</span>
                  <span>{reportFileName ? reportFileName : "Choose photo..."}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                {reportImageBase64 && (
                  <div className="relative">
                    <img
                      src={reportImageBase64}
                      alt="Report preview"
                      className="h-12 w-12 object-cover rounded-lg border border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setReportImageBase64(null);
                        setReportFileName("");
                      }}
                      className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-black text-[14.5px] text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 transition cursor-pointer disabled:opacity-50 shadow-sm active:scale-98"
            >
              {loading ? "Evaluating & Generating Token..." : "Submit Case & Generate PDF Receipt →"}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: CONFIRMATION & PDF TOKEN RECEIPT                                  */}
      {/* ========================================================================= */}
      {currentStep === "confirmation" && receiptData && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-3xl mx-auto shadow-2xs">
            ✓
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
              Triage Intake Complete
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              Your Case Has Been Submitted
            </h2>
            <p className="text-[13px] text-slate-500 font-medium max-w-sm mx-auto">
              Your clinical triage receipt has been generated. Doctors are reviewing cases in clinical priority order.
            </p>
          </div>

          {/* Receipt Monospace Card */}
          <div className="p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 space-y-3 max-w-md mx-auto">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Official Token Receipt Number
            </span>
            <div className="font-mono text-xl sm:text-2xl font-black text-slate-900 tracking-wider select-all">
              {receiptData.receiptNumber || `TRIAQ-${new Date().toISOString().slice(0, 10)}-00142`}
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <span
                className={`px-3 py-1 rounded-full text-[12px] font-black ${
                  receiptData.riskTag === "RED"
                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                    : receiptData.riskTag === "YELLOW" || receiptData.riskTag === "AMBER"
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                }`}
              >
                {receiptData.riskTag === "RED"
                  ? "🔴 Urgent (RED)"
                  : receiptData.riskTag === "YELLOW" || receiptData.riskTag === "AMBER"
                  ? "🟡 Moderate (YELLOW)"
                  : "🟢 Normal Priority (GREEN)"}
              </span>

              <span className="px-3 py-1 rounded-full text-[11.5px] font-bold bg-white text-slate-600 border border-slate-200">
                Awaiting Review
              </span>
            </div>
          </div>

          {/* PDF Download Button & Action Buttons */}
          <div className="space-y-3 max-w-md mx-auto pt-2">
            <a
              href={`${API_BASE}/api/patients/receipt/${receiptData.receiptNumber}/pdf`}
              download={`${receiptData.receiptNumber}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-xl font-black text-[14px] text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-sm flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
            >
              <span>📄</span>
              <span>Download Medical PDF Token Pass</span>
            </a>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCheckStatus}
                className="flex-1 py-2.5 rounded-xl font-bold text-[12.5px] border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 cursor-pointer shadow-2xs"
              >
                Check Live Status →
              </button>
              <button
                type="button"
                onClick={() => {
                  setSymptomText("");
                  setCurrentStep("symptoms");
                }}
                className="flex-1 py-2.5 rounded-xl font-bold text-[12.5px] border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 cursor-pointer shadow-2xs"
              >
                Submit Another Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: PATIENT LIVE STATUS TRACKER                                       */}
      {/* ========================================================================= */}
      {currentStep === "status" && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10.5px] font-black uppercase text-emerald-700 tracking-wider">
                Live Case Status
              </span>
              <h2 className="text-xl font-black text-slate-900">
                Patient OPD Status
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep("intake")}
              className="text-[12px] font-bold text-slate-500 hover:underline cursor-pointer"
            >
              ← Back
            </button>
          </div>

          {statusData && statusData.hasNote ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">Token Receipt</span>
                  <span className="font-mono text-base font-black text-slate-900">{statusData.receiptNumber}</span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[12px] font-black ${
                    statusData.status === "APPROVED" || statusData.status === "EDITED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : statusData.status === "REJECTED"
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : "bg-amber-100 text-amber-900 border border-amber-300"
                  }`}
                >
                  {statusData.status === "APPROVED"
                    ? "✓ Approved by Doctor"
                    : statusData.status === "EDITED"
                    ? "✓ Reviewed & Edited by Doctor"
                    : statusData.status === "REJECTED"
                    ? "✕ Rejected (Please see Emergency Desk)"
                    : "⏳ Awaiting Doctor Review"}
                </span>
              </div>

              {statusData.disposition && (
                <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/70 space-y-1">
                  <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider block">
                    Doctor Clinical Disposition
                  </span>
                  <p className="text-[13.5px] font-bold text-slate-900">{statusData.disposition}</p>
                </div>
              )}

              {statusData.prescription && (
                <div className="p-4 rounded-xl border border-emerald-300 bg-white space-y-1 shadow-2xs">
                  <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider block">
                    Doctor Prescription & Instructions (Rx)
                  </span>
                  <p className="text-[13px] font-medium text-slate-800 whitespace-pre-line leading-relaxed">
                    {statusData.prescription}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <a
                  href={`${API_BASE}/api/patients/receipt/${statusData.receiptNumber}/pdf`}
                  download={`${statusData.receiptNumber}.pdf`}
                  className="w-full py-3 px-4 rounded-xl font-black text-[13.5px] text-white bg-slate-900 hover:bg-slate-800 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>📄</span>
                  <span>Download Receipt Again (PDF)</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <span className="text-3xl block">📋</span>
              <p className="text-[14.5px] font-bold text-slate-800">No active triage submission found.</p>
              <p className="text-[12.5px] text-slate-500 max-w-xs mx-auto">
                Submit your symptoms through the intake desk to generate a triage pass.
              </p>
              <button
                type="button"
                onClick={() => setCurrentStep("symptoms")}
                className="mt-2 px-5 py-2 rounded-xl text-[12.5px] font-black text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
              >
                Submit Symptoms Now →
              </button>
            </div>
          )}

          {/* Hospital Helpline Banner */}
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-[12px] text-rose-900 flex items-center justify-between">
            <div>
              <strong>Emergency Helpline:</strong> If your condition worsens, call <strong>+91-11-2338-9000</strong> or alert hospital triage immediately.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
