import React from "react";

export default function SectionHead({ children, className = "", mono = false, right }) {
  const label = mono
    ? <p className={`section-label ${className}`}>{children}</p>
    : <h2 className={`text-sm font-semibold text-[var(--ink-2)] ${className}`}>{children}</h2>;

  if (!right) return label;
  return (
    <div className="flex items-center justify-between mb-3">
      {label}
      {right}
    </div>
  );
}
