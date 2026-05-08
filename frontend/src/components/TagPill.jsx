import React from "react";
import { Link } from "react-router-dom";

const base =
  "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium hindi-text transition-all duration-150 " +
  "text-[var(--ink-2)]";

const style = {
  background: "rgba(28,26,36,0.07)",
  border: "1px solid rgba(28,26,36,0.12)",
};

function hoverOn(e) {
  e.currentTarget.style.background = "rgba(28,26,36,0.11)";
  e.currentTarget.style.borderColor = "var(--accent)";
  e.currentTarget.style.color = "var(--accent)";
}
function hoverOff(e) {
  e.currentTarget.style.background = "rgba(28,26,36,0.07)";
  e.currentTarget.style.borderColor = "rgba(28,26,36,0.12)";
  e.currentTarget.style.color = "var(--ink-2)";
}

export default function TagPill({ children, onClick, to, className = "" }) {
  const cls = `${base} ${className}`;
  if (to)
    return (
      <Link to={to} className={cls} style={style} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
        {children}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls} style={style} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
        {children}
      </button>
    );
  return <span className={cls} style={style}>{children}</span>;
}
