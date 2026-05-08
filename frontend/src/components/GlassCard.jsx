import React from "react";

export default function GlassCard({ children, className = "", float = true, padding = "p-5", as: Tag = "div" }) {
  return (
    <Tag className={`${float ? "card" : "glass"} ${padding} ${className}`}>
      {children}
    </Tag>
  );
}
