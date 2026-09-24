/**
 * Dynamically resolves the API Base URL.
 * Automatically handles mobile phone QR code scans, production Render URLs, and local development.
 */
export const API_BASE = (() => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  if (!envUrl) return "";
  
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    if (envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
      return "";
    }
  }
  return envUrl;
})();

export default API_BASE;
