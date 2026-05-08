import React from "react";

export default function StatCell({ value, label, icon, className = "" }) {
  return (
    <div className={`glass rounded-[var(--r-md)] p-5 relative overflow-hidden ${className}`}>
      {icon && <div className="text-xl mb-2 opacity-60">{icon}</div>}
      <div
        className="mono-text text-[var(--accent)] font-medium leading-none mb-1"
        style={{ fontSize: "2rem", letterSpacing: "-1px" }}
      >
        {value}
      </div>
      <div className="section-label mt-0.5">{label}</div>
      {/* accent underbar */}
      <div
        className="absolute bottom-0 left-5"
        style={{ width: 32, height: 2, background: "var(--accent)", borderRadius: 1 }}
      />
    </div>
  );
}
