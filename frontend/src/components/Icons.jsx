import React from "react";

export function IconStethoscope({ className = "w-5 h-5", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4.5 3v5a3.5 3.5 0 0 0 7 0V3" />
      <path d="M8 11.5v4.5a3.5 3.5 0 0 0 7 0v-1.5" />
      <circle cx="18" cy="14" r="3" fill="currentColor" fillOpacity="0.15" />
      <circle cx="18" cy="14" r="1.5" fill="currentColor" />
      <path d="M3 3h3" />
      <path d="M10 3h3" />
    </svg>
  );
}

export function IconHospital({ className = "w-5 h-5", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
      <path d="M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4" />
      <path d="M12 7v4" />
      <path d="M10 9h4" />
      <path d="M9 14h.01" />
      <path d="M15 14h.01" />
    </svg>
  );
}

export function IconClinic({ className = "w-5 h-5", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 21h18" />
      <path d="M4 21V9l8-6 8 6v12" />
      <path d="M12 11v4" />
      <path d="M10 13h4" />
    </svg>
  );
}

export function IconDoctor({ className = "w-5 h-5", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  );
}

export function IconNurse({ className = "w-5 h-5", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="8" r="4" />
      <path d="M6 3h8l1 2H5l1-2z" fill="currentColor" fillOpacity="0.2" />
      <path d="M10 4v2" />
      <path d="M9 5h2" />
    </svg>
  );
}

export function IconPatient({ className = "w-5 h-5", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
      <rect x="17" y="14" width="5" height="7" rx="1" fill="currentColor" fillOpacity="0.1" />
      <path d="M19.5 16.5v2" />
      <path d="M18.5 17.5h2" />
    </svg>
  );
}

export function IconHome({ className = "w-5 h-5", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

export function IconQRCode({ className = "w-5 h-5", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="5" y="5" width="3" height="3" fill="currentColor" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="16" y="5" width="3" height="3" fill="currentColor" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="5" y="16" width="3" height="3" fill="currentColor" />
      <path d="M14 14h3v3h-3z" fill="currentColor" />
      <path d="M20 14v3h-3" />
      <path d="M14 20h3" />
      <path d="M20 20h.01" />
    </svg>
  );
}

export function IconEye({ className = "w-4 h-4", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff({ className = "w-4 h-4", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function IconClipboard({ className = "w-5 h-5", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}

export function IconShield({ className = "w-5 h-5", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function IconArrowRight({ className = "w-4 h-4", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

export function IconCheckCircle({ className = "w-5 h-5", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function IconXCircle({ className = "w-5 h-5", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

export function IconGovtEmblem({ className = "w-10 h-10", ...props }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="currentColor" {...props}>
      {/* Authentic Ashoka Lion Capital Motif */}
      <path d="M32 4c-1.5 0-3 1.2-3 2.8 0 .8.3 1.5.8 2-.6.7-1 1.6-1 2.6 0 .5.1 1 .3 1.4-.9.5-1.5 1.5-1.5 2.6 0 1.2.7 2.2 1.7 2.7-.2.6-.3 1.2-.3 1.9 0 2.8 2 5.1 4.7 5.7-.3.7-.7 1.5-1.2 2.3-1.8.3-3.5 1.3-4.5 2.8-1.5 2.2-1.7 5.1-1.7 8.2h15.4c0-3.1-.2-6-1.7-8.2-1-1.5-2.7-2.5-4.5-2.8-.5-.8-.9-1.6-1.2-2.3 2.7-.6 4.7-2.9 4.7-5.7 0-.7-.1-1.3-.3-1.9 1-.5 1.7-1.5 1.7-2.7 0-1.1-.6-2.1-1.5-2.6.2-.4.3-.9.3-1.4 0-1-.4-1.9-1-2.6.5-.5.8-1.2.8-2C35 5.2 33.5 4 32 4z" />
      <path d="M19 12c-1.2 0-2.3 1-2.3 2.2 0 .6.2 1.2.6 1.6-.5.6-.8 1.3-.8 2.1 0 .4.1.8.2 1.1-.7.4-1.2 1.2-1.2 2.1 0 1 .6 1.8 1.4 2.2-.2.5-.3 1-.3 1.5 0 2.2 1.6 4.1 3.8 4.6-.2.6-.6 1.2-1 1.8-1.4.2-2.8 1-3.6 2.2-1.2 1.8-1.4 4.1-1.4 6.6h12.3c0-2.5-.2-4.8-1.4-6.6-.8-1.2-2.2-2-3.6-2.2-.4-.6-.8-1.2-1-1.8 2.2-.5 3.8-2.4 3.8-4.6 0-.5-.1-1-.3-1.5.8-.4 1.4-1.2 1.4-2.2 0-.9-.5-1.7-1.2-2.1.1-.3.2-.7.2-1.1 0-.8-.3-1.5-.8-2.1.4-.4.6-1 .6-1.6 0-1.2-1.1-2.2-2.3-2.2z" opacity="0.9" />
      <path d="M45 12c-1.2 0-2.3 1-2.3 2.2 0 .6.2 1.2.6 1.6-.5.6-.8 1.3-.8 2.1 0 .4.1.8.2 1.1-.7.4-1.2 1.2-1.2 2.1 0 1 .6 1.8 1.4 2.2-.2.5-.3 1-.3 1.5 0 2.2 1.6 4.1 3.8 4.6-.2.6-.6 1.2-1 1.8-1.4.2-2.8 1-3.6 2.2-1.2 1.8-1.4 4.1-1.4 6.6h12.3c0-2.5-.2-4.8-1.4-6.6-.8-1.2-2.2-2-3.6-2.2-.4-.6-.8-1.2-1-1.8 2.2-.5 3.8-2.4 3.8-4.6 0-.5-.1-1-.3-1.5.8-.4 1.4-1.2 1.4-2.2 0-.9-.5-1.7-1.2-2.1.1-.3.2-.7.2-1.1 0-.8-.3-1.5-.8-2.1.4-.4.6-1 .6-1.6 0-1.2-1.1-2.2-2.3-2.2z" opacity="0.9" />
      {/* Abacus & Ashoka Chakra Base */}
      <rect x="10" y="40" width="44" height="4" rx="1" />
      <circle cx="32" cy="48" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="32" cy="48" r="1.5" />
      <line x1="16" y1="48" x2="26" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="48" x2="48" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="8" y="54" width="48" height="4" rx="1" />
      {/* Satyameva Jayate Banner */}
      <rect x="14" y="59" width="36" height="2" rx="0.5" opacity="0.75" />
    </svg>
  );
}

export function IconIndianFlag({ className = "w-5 h-3.5", ...props }) {
  return (
    <svg className={className} viewBox="0 0 27 18" fill="none" {...props}>
      <rect width="27" height="6" fill="#FF9933" />
      <rect y="6" width="27" height="6" fill="#FFFFFF" />
      <rect y="12" width="27" height="6" fill="#138808" />
      <circle cx="13.5" cy="9" r="2.2" stroke="#000080" strokeWidth="0.5" fill="none" />
      <circle cx="13.5" cy="9" r="0.6" fill="#000080" />
    </svg>
  );
}

