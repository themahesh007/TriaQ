import React from "react";

export default function Banner() {
  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 text-slate-300 text-[12px] md:text-[12.5px] py-2 px-4 text-center font-medium shadow-2xs flex items-center justify-center gap-2">
      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
      <span>
        <strong className="font-bold text-white">Clinical Care Notice:</strong> Patient intake and triage priorities are reviewed by qualified duty medical officers. In case of acute cardiac distress or severe trauma, report directly to the Emergency Room.
      </span>
    </div>
  );
}
