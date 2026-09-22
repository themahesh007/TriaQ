import { initializeApp, getApps } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

// Read Firebase config from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

export const isFirebaseConfigured = () => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.includes("YOUR_")
  );
};

let app = null;
let auth = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
  } catch (err) {
    console.warn("[Firebase] Initialization error:", err);
  }
}

/**
 * Initialize invisible or visible reCAPTCHA on the provided button/element ID
 */
export const initRecaptcha = (buttonElementId = "recaptcha-container") => {
  if (!auth) return null;
  try {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, buttonElementId, {
      size: "invisible",
      callback: () => {
        // reCAPTCHA solved
      },
      "expired-callback": () => {
        console.warn("[Firebase] reCAPTCHA expired, please retry.");
      }
    });
    return window.recaptchaVerifier;
  } catch (err) {
    console.error("[Firebase] Recaptcha setup error:", err);
    return null;
  }
};

/**
 * Send real SMS verification code via Firebase
 * @param {string} fullIndianPhone - E.164 format e.g. "+919876543210"
 * @param {RecaptchaVerifier} verifier
 */
export const sendFirebasePhoneOTP = async (fullIndianPhone, verifier) => {
  if (!auth) {
    throw new Error("Firebase Auth is not configured. Please supply Firebase credentials.");
  }
  return await signInWithPhoneNumber(auth, fullIndianPhone, verifier);
};

export { auth };
