import React from "react";

export default function TriageSlipModal({ note, onClose }) {
  if (!note) return null;

  const handlePrint = () => {
    window.print();
  };

  const tokenId = note.patient?.tokenId || note.tokenId || "Token";
  const dateStr = new Date(note.createdAt || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  const timeStr = new Date(note.createdAt || Date.now()).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const getFlagDetails = (tag) => {
    switch (tag) {
      case "RED":
        return {
          label: "URGENT (RED)",
          sub: "Immediate Medical Resuscitation / Bed",
          border: "#B91C1C",
          bg: "#FEF2F2",
          text: "#991B1B"
        };
      case "AMBER":
      case "YELLOW":
        return {
          label: "MODERATE (YELLOW)",
          sub: "Priority OPD Consultation Queue",
          border: "#D97706",
          bg: "#FFFBEB",
          text: "#92400E"
        };
      case "GREEN":
      default:
        return {
          label: "NORMAL (GREEN)",
          sub: "Routine General OPD Queue",
          border: "#059669",
          bg: "#ECFDF5",
          text: "#065F46"
        };
    }
  };

  const flag = getFlagDetails(note.riskTag);
  const vitals = note.vitals;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden print-area-wrapper flex flex-col max-h-[92vh]">
        {/* Modal Top Bar (Hidden on print) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xl">🖨️</span>
            <span className="text-[14px] font-black text-slate-900">
              Printable Medical Triage Slip
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl font-black text-[13px] text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 transition shadow-xs cursor-pointer active:scale-95"
            >
              Print Now 🖨️
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer font-black"
            >
              ✕
            </button>
          </div>
        </div>

        {/* PRINTABLE SLIP CONTENT */}
        <div className="p-6 overflow-y-auto space-y-4 font-sans text-slate-900">
          {/* Slip Header */}
          <div className="text-center pb-3 border-b-2 border-slate-900 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">🏛️</span>
              <span className="text-[15px] font-black uppercase tracking-wider text-slate-900">
                PUBLIC HEALTH FACILITY • OPD TRIAGE
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Human-in-the-Loop Clinical Triage Token Slip
            </p>
          </div>

          {/* Token & Timestamp Highlight */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100 border border-slate-300">
            <div>
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 block">
                Patient Token Number
              </span>
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {tokenId}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-600 block">
                {dateStr}
              </span>
              <span className="text-[13px] font-black text-slate-900 block font-mono">
                {timeStr}
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-600 inline-block mt-0.5">
                {(note.language || "EN").toUpperCase()}
              </span>
            </div>
          </div>

          {/* Triage Urgency Banner */}
          <div 
            className="p-3.5 rounded-xl border-2 text-center space-y-0.5"
            style={{ borderColor: flag.border, backgroundColor: flag.bg, color: flag.text }}
          >
            <span className="text-[11px] font-black uppercase tracking-widest block opacity-90">
              TRIAGE STATUS / CLINICAL FLAG
            </span>
            <span className="text-2xl font-black tracking-tight block">
              {flag.label}
            </span>
            <p className="text-[12px] font-bold">
              {flag.sub}
            </p>
          </div>

          {/* Assigned Room / OPD Ward Destination */}
          {(note.assignedRoom || note.patient?.assignedRoom || note.disposition) && (
            <div className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-950 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <span>📍</span>
                  <span>ASSIGNED CLINICAL DESTINATION</span>
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 uppercase">
                  PROCEED HERE
                </span>
              </div>
              <div className="text-[15.5px] font-black text-slate-900">
                {note.assignedRoom || note.patient?.assignedRoom || note.disposition}
              </div>
            </div>
          )}

          {/* Vital Signs Table if Recorded */}
          {vitals && (vitals.bpSystolic || vitals.pulse || vitals.spo2 || vitals.temp) && (
            <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                Recorded Baseline Vitals
              </span>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">BP</span>
                  <span className="text-[13px] font-black text-slate-900">
                    {vitals.bpSystolic ? `${vitals.bpSystolic}/${vitals.bpDiastolic || '-'}` : "-"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Pulse</span>
                  <span className="text-[13px] font-black text-slate-900">
                    {vitals.pulse ? `${vitals.pulse} bpm` : "-"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">SpO2</span>
                  <span className={`text-[13px] font-black ${Number(vitals.spo2) < 90 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {vitals.spo2 ? `${vitals.spo2}%` : "-"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Temp</span>
                  <span className="text-[13px] font-black text-slate-900">
                    {vitals.temp ? `${vitals.temp}°F` : "-"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Symptoms & Notes Summary */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-1.5 bg-white">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
              Patient Presentation / Summary
            </span>
            <p className="text-[13px] font-medium leading-relaxed text-slate-800 whitespace-pre-line">
              {note.summary || note.rawSymptomText || "No symptoms recorded."}
            </p>
          </div>

          {/* Barcode & Verification Footer */}
          <div className="pt-2 border-t border-dashed border-slate-300 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 block">
                ID: {note.id?.slice(0, 16) || "TRIAQ-REF"}
              </span>
              <span className="text-[10px] font-bold text-slate-500 block">
                Educational prototype • Non-diagnostic triage slip
              </span>
            </div>

            {/* Pure SVG Barcode Representation */}
            <div className="text-right">
              <svg className="w-28 h-7 inline-block opacity-80" viewBox="0 0 100 25" preserveAspectRatio="none">
                <rect x="2" width="3" height="25" fill="#000" />
                <rect x="7" width="1" height="25" fill="#000" />
                <rect x="10" width="4" height="25" fill="#000" />
                <rect x="16" width="2" height="25" fill="#000" />
                <rect x="20" width="1" height="25" fill="#000" />
                <rect x="23" width="5" height="25" fill="#000" />
                <rect x="30" width="2" height="25" fill="#000" />
                <rect x="34" width="3" height="25" fill="#000" />
                <rect x="39" width="1" height="25" fill="#000" />
                <rect x="42" width="4" height="25" fill="#000" />
                <rect x="48" width="2" height="25" fill="#000" />
                <rect x="52" width="3" height="25" fill="#000" />
                <rect x="57" width="1" height="25" fill="#000" />
                <rect x="60" width="5" height="25" fill="#000" />
                <rect x="67" width="2" height="25" fill="#000" />
                <rect x="71" width="3" height="25" fill="#000" />
                <rect x="76" width="1" height="25" fill="#000" />
                <rect x="79" width="4" height="25" fill="#000" />
                <rect x="85" width="2" height="25" fill="#000" />
                <rect x="89" width="3" height="25" fill="#000" />
                <rect x="94" width="4" height="25" fill="#000" />
              </svg>
              <span className="block text-[9px] font-mono tracking-widest text-slate-400">
                {tokenId}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden on print) */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between no-print">
          <span className="text-[12px] font-medium text-slate-500">
            Click <strong>Print Now</strong> to print directly or save as PDF.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[12.5px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl text-[12.5px] font-black text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 transition shadow-xs cursor-pointer active:scale-95"
            >
              Print Slip 🖨️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
