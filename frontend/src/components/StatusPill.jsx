import React from "react";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT } from "../lib/i18n.js";

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="5.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="0.75" />
      <path d="M3.5 6.25l2 1.75 3-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="5.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="0.75" />
      <path d="M3.75 6h4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="5.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="0.75" />
      <path d="M4 4l4 4M8 4L4 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const STATUS_CONFIG = {
  full_response: {
    key: "status_pill_full",
    style: { background: "rgba(74,122,58,0.12)", color: "#3a6e2a", border: "1px solid rgba(74,122,58,0.22)" },
    Icon: CheckIcon,
  },
  partial_response: {
    key: "status_pill_partial",
    style: { background: "rgba(3,105,161,0.10)", color: "#0369a1", border: "1px solid rgba(3,105,161,0.22)" },
    Icon: MinusIcon,
  },
  no_response: {
    key: "status_pill_none",
    style: { background: "rgba(155,44,44,0.11)", color: "#9b2c2c", border: "1px solid rgba(155,44,44,0.22)" },
    Icon: CrossIcon,
  },
};

export default function StatusPill({ status }) {
  const { lang } = useLanguage();
  const t = useT(lang);
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.no_response;
  const { Icon } = config;
  return (
    <span
      className="status-pill gap-1.5"
      style={config.style}
    >
      <Icon />
      {t(config.key)}
    </span>
  );
}

export { STATUS_CONFIG };
