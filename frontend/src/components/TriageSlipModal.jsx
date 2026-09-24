import React, { useState, useEffect } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export default function TriageSlipModal({ note, onClose }) {
  if (!note) return null;

  const [facilityInfo, setFacilityInfo] = useState(null);
  const facilityName = note.facility || note.patient?.facility || "Healthcare Centre";

  useEffect(() => {
    fetch(`${API_BASE}/api/facilities`)
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list)) {
          const match = list.find((f) =>
            f.id === note.facilityId ||
            f.name.toLowerCase() === facilityName.toLowerCase() ||
            facilityName.toLowerCase().includes(f.name.toLowerCase())
          );
          if (match) setFacilityInfo(match);
        }
      })
      .catch(() => {});
  }, [note, facilityName]);

  const handlePrint = () => {
    window.print();
  };

  const tokenId = note.patient?.tokenId || note.tokenId || "01";
  const dateStr = new Date(note.createdAt || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  const timeStr = new Date(note.createdAt || Date.now()).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const getPriorityInfo = (tag) => {
    switch (tag) {
      case "RED":
        return {
          category: "CATEGORY 1 • IMMEDIATE EMERGENCY CARE",
          subtext: "Critical baseline presentation • Direct admission to Emergency Ward / Resus",
          borderColor: "border-rose-600",
          bgColor: "bg-rose-50",
          textColor: "text-rose-900",
          pillBg: "bg-rose-600 text-white"
        };
      case "AMBER":
      case "YELLOW":
        return {
          category: "CATEGORY 2 • PRIORITY CLINICAL CONSULTATION",
          subtext: "Elevated clinical presentation • Priority Outpatient Doctor Review",
          borderColor: "border-amber-600",
          bgColor: "bg-amber-50",
          textColor: "text-amber-900",
          pillBg: "bg-amber-600 text-white"
        };
      case "GREEN":
      default:
        return {
          category: "CATEGORY 3 • ROUTINE OUTPATIENT CONSULTATION",
          subtext: "Stable baseline presentation • General OPD Physician Queue",
          borderColor: "border-emerald-600",
          bgColor: "bg-emerald-50",
          textColor: "text-emerald-900",
          pillBg: "bg-emerald-700 text-white"
        };
    }
  };

  const priority = getPriorityInfo(note.riskTag);
  const vitals = note.vitals;
  const pName = note.patient?.name || "Outpatient Case";
  const pAge = note.patient?.age ? `${note.patient.age} Yrs` : "--";
  const pPhone = note.patient?.phone ? `+91 ${note.patient.phone}` : "--";
  const assignedRoom = note.assignedRoom || note.patient?.assignedRoom || note.disposition || "Room 02 - General OPD";
  const receiptNo = note.receiptNumber || `TRQ-${note.id ? note.id.slice(0, 8).toUpperCase() : "2026-OPD"}`;
  const addressStr = facilityInfo?.address || 
    (facilityInfo?.city ? `${facilityInfo.city}, ${facilityInfo.district || ""}, ${facilityInfo.state || ""}` : "Main Medical Campus");
  const phoneStr = facilityInfo?.phone ? `+91 ${facilityInfo.phone}` : "+91-1800-TRIAQ";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-300 shadow-2xl overflow-hidden print-area-wrapper flex flex-col max-h-[94vh]">
        
        {/* Modal Action Bar (Hidden on print) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span className="text-[13.5px] font-bold text-slate-800">
              Official Outpatient Triage & Consultation Slip
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl font-bold text-[13px] text-white bg-slate-900 hover:bg-slate-800 transition shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* PRINTABLE OFFICIAL HOSPITAL SLIP CONTENT */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-4 font-sans text-slate-900 bg-white">
          
          {/* 1. Official Hospital / Clinic Letterhead Header */}
          <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="w-6 h-6 rounded bg-emerald-700 text-white font-black text-xs flex items-center justify-center">
                ✚
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Department of Outpatient Services (OPD) • Clinical Triage
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight">
              {facilityInfo?.name || facilityName}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-slate-600 pt-0.5">
              <span>Reg / License No: <strong className="font-mono text-slate-900">{facilityInfo?.licenseNumber || "MED-TRQ-2024-REG"}</strong></span>
              <span>•</span>
              <span>OPD Consultation Slip</span>
              <span>•</span>
              <span className="text-emerald-800 font-bold">Authorized Healthcare Facility</span>
            </div>
          </div>

          {/* 2. Structured Token & Patient Demographics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl border border-slate-300 bg-slate-50/80">
            {/* Token Callout Box */}
            <div className="sm:col-span-5 bg-white p-3.5 rounded-lg border-2 border-slate-900 text-center flex flex-col justify-center shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">
                TOKEN NUMBER
              </span>
              <span className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight my-0.5 font-mono">
                {tokenId}
              </span>
              <div className="text-[11px] font-bold text-slate-600 pt-0.5 border-t border-slate-100 flex items-center justify-between px-1">
                <span>{dateStr}</span>
                <span className="font-mono">{timeStr}</span>
              </div>
            </div>

            {/* Patient Meta Details */}
            <div className="sm:col-span-7 flex flex-col justify-center space-y-1.5 pl-0 sm:pl-2 text-[12.5px]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-medium">Patient Name:</span>
                <strong className="text-slate-900 font-bold text-[13px]">{pName}</strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-medium">Age / Gender:</span>
                <strong className="text-slate-900 font-bold">{pAge}</strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-medium">Contact Phone:</span>
                <strong className="text-slate-900 font-bold font-mono">{pPhone}</strong>
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-slate-500 font-medium">Pass Ref No:</span>
                <span className="font-mono text-[11px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {receiptNo}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Clinical Priority & Assigned Room Location */}
          <div className={`p-3.5 rounded-xl border-2 ${priority.borderColor} ${priority.bgColor} space-y-2`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${priority.pillBg}`}>
                Triage Classification
              </span>
              <span className="text-[11px] font-bold text-slate-600">
                Initial Nurse Assessment
              </span>
            </div>
            <div>
              <span className={`text-[14.5px] font-black tracking-tight block ${priority.textColor}`}>
                {priority.category}
              </span>
              <p className="text-[11.5px] font-medium text-slate-700 leading-snug">
                {priority.subtext}
              </p>
            </div>
          </div>

          {/* 4. Assigned Doctor / Consultation Room */}
          <div className="p-3.5 rounded-xl border border-slate-300 bg-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                Assigned Consultation Room / Counter
              </span>
              <span className="text-[16px] font-black text-slate-900 block mt-0.5">
                {assignedRoom}
              </span>
            </div>
            <span className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wide">
              Proceed Here
            </span>
          </div>

          {/* 5. Baseline Vitals Table (if recorded) */}
          {vitals && (vitals.bpSystolic || vitals.pulse || vitals.spo2 || vitals.temp) && (
            <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 space-y-1.5">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 block">
                Recorded Baseline Vital Signs
              </span>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Blood Pressure</span>
                  <span className="text-[12.5px] font-black text-slate-900">
                    {vitals.bpSystolic ? `${vitals.bpSystolic}/${vitals.bpDiastolic || '-'}` : "-"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Pulse Rate</span>
                  <span className="text-[12.5px] font-black text-slate-900">
                    {vitals.pulse ? `${vitals.pulse} bpm` : "-"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">SpO2 Oxygen</span>
                  <span className={`text-[12.5px] font-black ${Number(vitals.spo2) < 90 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {vitals.spo2 ? `${vitals.spo2}%` : "-"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Temperature</span>
                  <span className="text-[12.5px] font-black text-slate-900">
                    {vitals.temp ? `${vitals.temp}°F` : "-"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 6. Chief Complaints & Presentation */}
          <div className="border border-slate-300 rounded-xl p-3.5 bg-white space-y-1">
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 block">
              Chief Complaints & Intake Observations
            </span>
            <p className="text-[12.5px] font-medium leading-relaxed text-slate-800 whitespace-pre-line">
              {note.summary || note.rawSymptomText || "Standard outpatient check-in."}
            </p>
          </div>

          {/* 7. Doctor's Clinical Advice & Attending Signature Block */}
          <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 block">
              Attending Physician Review & Advice (Rx)
            </span>
            {note.prescription ? (
              <p className="text-[12.5px] font-medium text-slate-800 whitespace-pre-line bg-white p-2.5 rounded border border-slate-200">
                {note.prescription}
              </p>
            ) : (
              <div className="space-y-2 py-1">
                <div className="border-b border-dashed border-slate-300 h-4"></div>
                <div className="border-b border-dashed border-slate-300 h-4"></div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-4 text-[11px] text-slate-500">
              <div>
                <span className="block font-bold text-slate-700">Triage Desk:</span>
                <span>Verified by Duty Nurse</span>
              </div>
              <div className="text-right">
                <span className="block font-bold text-slate-700">Attending Medical Officer:</span>
                <span className="block text-slate-400 mt-2">Signature & Stamp</span>
              </div>
            </div>
          </div>

          {/* 8. Hospital Name, Full Address, Contact Details & Patient Instructions (Bottom) */}
          <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200 pb-2">
              <div>
                <span className="text-[12.5px] font-black uppercase tracking-wider text-slate-900 block">
                  {facilityInfo?.name || facilityName}
                </span>
                <span className="text-[11px] text-slate-600 block">
                  {addressStr}
                </span>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Hospital Helpline</span>
                <span className="text-[12.5px] font-mono font-bold text-slate-900 block">
                  {phoneStr}
                </span>
              </div>
            </div>

            <div className="text-[10.5px] text-slate-600 leading-snug space-y-0.5">
              <p className="font-bold text-slate-700">Instructions for Patient:</p>
              <p>• Please wait in the waiting lounge opposite your assigned room. Your token will be announced and displayed.</p>
              <p>• Please retain this token slip until your doctor consultation, lab tests, and pharmacy dispense are completed.</p>
            </div>
          </div>

          {/* 9. Barcode & Validation Footer */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[10px] font-mono text-slate-500">
              Pass ID: {note.id ? note.id.slice(0, 16) : "TRQ-OPD-REF"} • Valid for Date of Issue
            </div>
            <div className="text-right">
              <svg className="w-28 h-6 inline-block opacity-85" viewBox="0 0 100 25" preserveAspectRatio="none">
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
              <span className="block text-[9px] font-mono tracking-wider text-slate-500">
                TOKEN {tokenId}
              </span>
            </div>
          </div>

        </div>

        {/* Modal Bottom Buttons (Hidden on print) */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between no-print">
          <span className="text-[12px] font-medium text-slate-500">
            Click <strong>Print Slip</strong> to print directly on thermal roll or standard A4 paper.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[12.5px] font-bold border border-slate-300 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl text-[12.5px] font-black text-white bg-slate-900 hover:bg-slate-800 transition shadow-xs cursor-pointer active:scale-95"
            >
              Print Slip
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
