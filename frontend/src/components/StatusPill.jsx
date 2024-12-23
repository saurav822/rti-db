import React from "react";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    labelHindi: "लंबित",
    className: "bg-yellow-100 text-yellow-800",
  },
  responded: {
    label: "Responded",
    labelHindi: "उत्तरित",
    className: "bg-green-100 text-green-800",
  },
  partial: {
    label: "Partial",
    labelHindi: "आंशिक",
    className: "bg-blue-100 text-blue-800",
  },
  rejected: {
    label: "Rejected",
    labelHindi: "अस्वीकृत",
    className: "bg-red-100 text-red-800",
  },
  appealed: {
    label: "Appealed",
    labelHindi: "अपील",
    className: "bg-purple-100 text-purple-800",
  },
};

export default function StatusPill({ status, showHindi = false }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`status-pill ${config.className}`}>
      {showHindi ? config.labelHindi : config.label}
    </span>
  );
}

export { STATUS_CONFIG };
