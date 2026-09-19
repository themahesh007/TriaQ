import React from "react";

export default function Banner() {
  return (
    <div className="w-full bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-b border-amber-200/80 text-amber-900 text-[12px] md:text-[13px] py-2 px-4 text-center font-medium shadow-2xs flex items-center justify-center gap-2">
      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse"></span>
      <span>
        <strong className="font-bold">Educational Prototype:</strong> Organizes patient intake for a qualified medical reviewer only. Strictly non-diagnostic and not medical advice.
      </span>
    </div>
  );
}
