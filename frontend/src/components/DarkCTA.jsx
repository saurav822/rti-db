import React from "react";

export default function DarkCTA({ children }) {
  return (
    <section
      className="py-14 px-4 relative overflow-hidden"
      style={{ background: "var(--ink)", borderRadius: "var(--r-xl)", margin: "0 16px 32px" }}
    >
      {/* Radial accent glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(184,134,11,0.22), transparent)," +
            "radial-gradient(ellipse 40% 40% at 100% 100%, rgba(184,134,11,0.14), transparent)",
        }}
      />
      <div className="max-w-3xl mx-auto text-center relative">{children}</div>
    </section>
  );
}
