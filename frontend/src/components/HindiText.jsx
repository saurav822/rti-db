import React from "react";

/**
 * Wrapper for any Hindi / Devanagari content.
 * Applies Noto Sans Devanagari and prevents mid-word line breaks.
 */
export default function HindiText({ children, className = "", as: Tag = "span" }) {
  return (
    <Tag className={`hindi-text ${className}`}>
      {children}
    </Tag>
  );
}
