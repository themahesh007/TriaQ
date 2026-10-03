import React, { useState, useEffect } from "react";
import { IconAlertCircle, IconCheckCircle, IconLock, IconRefresh, IconPhone } from "./Icons";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  initialEmail = "",
  portalName = "Patient Portal",
  onSuccess
}) {
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Enter OTP, 3: New Password, 4: Done
  const [identifier, setIdentifier] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [demoOtp, setDemoOtp] = useState(null);
  const [liveEmailSent, setLiveEmailSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Sync initialEmail when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIdentifier(initialEmail || "");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setInfoMessage("");
      setDemoOtp(null);
      setLiveEmailSent(false);
      setResendTimer(0);
    }
  }, [isOpen, initialEmail]);

  // Resend countdown timer
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  if (!isOpen) return null;

  // STEP 1: Send OTP
  const handleSendOTP = async (e) => {
    e?.preventDefault();
    if (!identifier || !identifier.trim()) {
      setError("Please enter your registered email address or contact number.");
      return;
    }

    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const isEmail = identifier.includes("@");
      const payload = isEmail
        ? { email: identifier.trim().toLowerCase() }
        : { phone: identifier.trim() };

      const res = await fetch(`${API_BASE}/api/auth/forgot-password/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch verification code.");
      }

      setLiveEmailSent(Boolean(data.liveEmailSent));
      setDemoOtp(data.demoOtp || null);
      setInfoMessage(data.message || "Verification code dispatched successfully!");
      setStep(2);
      setResendTimer(45); // 45 seconds countdown
    } catch (err) {
      setError(err.message || "Failed to send verification code. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Validate OTP Code input
  const handleVerifyOTP = (e) => {
    e?.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    setError("");
    setStep(3);
  };

  // STEP 3: Submit New Password
  const handleResetPassword = async (e) => {
    e?.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp: otp.trim(),
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Password reset failed. Invalid or expired OTP.");
      }

      setStep(4);
      if (onSuccess) {
        onSuccess({ identifier: identifier.trim(), newPassword });
      }
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-md shadow-2xl border border-slate-300 overflow-hidden govt-panel">
        {/* Modal Top Header - Official Govt Header */}
        <div className="bg-[#003366] p-5 text-white text-center relative border-b border-[#002244]">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded w-7 h-7 flex items-center justify-center transition cursor-pointer text-sm font-bold"
            aria-label="Close modal"
          >
            ✕
          </button>
          <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center mx-auto mb-2 border border-white/20">
            <span className="text-xl"></span>
          </div>
          <h3 className="text-base font-bold tracking-wide uppercase">Identity Verification & Recovery</h3>
          <p className="text-xs text-amber-200 mt-0.5">
            Credential Reset for {portalName}
          </p>

          {/* Stepper Dots */}
          <div className="flex justify-center items-center gap-2 mt-3">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === s
                    ? "w-8 bg-amber-400"
                    : step > s
                    ? "w-4 bg-emerald-400"
                    : "w-3 bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-start gap-2">
              <IconAlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Verification Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* STEP 1: ENTER EMAIL OR PHONE */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registered Email Address or Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <IconPhone className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. yourname@hospital.org or 9876543210"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#003366] focus:border-[#003366] transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                  <span>•</span> An official 6-digit OTP will be dispatched to your registered contact.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center gap-2.5 text-xs text-slate-600">
                <IconLock className="w-4 h-4 text-slate-500" />
                <span>Secure Authentication Protocol.</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-tactile flex-1 py-2 border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-tactile flex-1 py-2 bg-[#003366] hover:bg-[#002855] text-white rounded text-xs font-bold shadow-xs transition disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <IconRefresh className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                    </>
                  ) : (
                    <>Send Security Code →</>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: ENTER 6-DIGIT OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              {liveEmailSent ? (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-900 flex items-start gap-2">
                  <span className="text-base shrink-0"></span>
                  <div>
                    <p className="font-bold">Official Verification Dispatched</p>
                    <p className="mt-0.5">
                      A 6-digit security code was dispatched to <strong className="underline">{identifier}</strong>. Please check your inbox or message notifications.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900">
                  <p className="font-bold flex items-center gap-1">
                    <span></span> Security Code Preview:
                  </p>
                  <p className="mt-1 font-mono text-base font-extrabold text-amber-950 tracking-wider">
                    [ {demoOtp || "123456"} ]
                  </p>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Enter this 6-digit code below to reset your password.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Enter 6-Digit Security OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full py-2.5 text-center text-2xl font-mono font-bold tracking-[0.5em] bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#003366] focus:border-[#003366] transition"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                <span>Didn't receive code?</span>
                <button
                  type="button"
                  disabled={resendTimer > 0 || loading}
                  onClick={handleSendOTP}
                  className="font-bold text-[#003366] hover:underline disabled:opacity-40 transition cursor-pointer"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-tactile flex-1 py-2 border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={otp.length !== 6}
                  className="btn-tactile flex-1 py-2 bg-[#003366] hover:bg-[#002855] text-white rounded text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  Verify Code →
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SET NEW PASSWORD */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password (min 8 characters)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">
                    
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Enter new strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-white border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#003366] focus:border-[#003366] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">
                    
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-white border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#003366] focus:border-[#003366] transition"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-tactile flex-1 py-2 border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading || newPassword.length < 8}
                  className="btn-tactile flex-1 py-2 bg-[#003366] hover:bg-[#002855] text-white rounded text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <IconRefresh className="w-3.5 h-3.5 animate-spin" /> Updating...
                    </>
                  ) : (
                    <>Save New Password ✓</>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 4 && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto border border-emerald-300">
                <IconCheckCircle className="w-8 h-8 text-emerald-700" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Password Updated Successfully
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Your credentials have been securely stored in the system registry. You may now sign in.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn-tactile w-full py-2.5 bg-[#003366] hover:bg-[#002855] text-white rounded text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Proceed to Login →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
