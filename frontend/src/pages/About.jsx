import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT } from "../lib/i18n.js";

const VALUES = ["Transparency", "Impartiality", "Participation", "Accountability"];
const VALUES_HI = ["पारदर्शिता", "निष्पक्षता", "भागीदारी", "जवाबदेही"];

const SOCIALS = [
  { label: "Facebook", href: "https://facebook.com/charchagram/" },
  { label: "X (Twitter)", href: "https://x.com/Charchagram_" },
  { label: "Instagram", href: "https://instagram.com/__charchagram__/" },
  { label: "YouTube", href: "https://youtube.com/@CharchagramCollective" },
];

const STEPS = [
  { n: "01", key_title: "about_step1_title", key_desc: "about_step1_desc", icon: "↑" },
  { n: "02", key_title: "about_step2_title", key_desc: "about_step2_desc", icon: "✦" },
  { n: "03", key_title: "about_step3_title", key_desc: "about_step3_desc", icon: "⌕" },
];

export default function About() {
  const { lang } = useLanguage();
  const t = useT(lang);
  const values = lang === "hi" ? VALUES_HI : VALUES;

  return (
    <div style={{ background: "var(--canvas)" }}>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden py-20 px-4">
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 50% 0%, var(--accent-glow) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <span
            className="mono-text uppercase inline-block mb-4"
            style={{ color: "var(--accent)", fontSize: "0.6875rem", letterSpacing: "0.1em" }}
          >
            OpenRTI · Right to Information Act 2005
          </span>
          <h1
            className="text-4xl sm:text-5xl font-bold mb-6"
            style={{ color: "var(--ink)", lineHeight: 1.15 }}
          >
            {t("about_title")}
          </h1>
          <p
            className="text-lg leading-relaxed mx-auto"
            style={{ color: "var(--ink-2)", maxWidth: "38rem" }}
          >
            {t("about_hero_desc")}
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link to="/search" className="btn-primary px-6 py-2.5 text-sm">
              Search RTIs →
            </Link>
            <Link to="/upload" className="btn-secondary px-6 py-2.5 text-sm">
              {lang === "hi" ? "RTI अपलोड करें" : "Upload an RTI"}
            </Link>
          </div>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div style={{ borderTop: "1px solid var(--rule-strong)" }} />

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="section-label">{t("about_how_title")}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map(({ n, key_title, key_desc, icon }) => (
              <div key={n} className="card p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold flex-shrink-0"
                    style={{
                      background: "var(--accent-glass)",
                      border: "1px solid var(--accent-glow)",
                      color: "var(--accent)",
                    }}
                  >
                    {icon}
                  </div>
                  <span className="mono-text" style={{ color: "var(--ink-4)", fontSize: "0.6875rem" }}>
                    {n}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1" style={{ color: "var(--ink)" }}>
                    {t(key_title)}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--ink-3)" }}>
                    {t(key_desc)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div style={{ borderTop: "1px solid var(--rule)" }} />

      {/* ── CHARCHA FOUNDATION ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-[var(--r-xl)] p-8 sm:p-10">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg"
                style={{ background: "var(--accent-glass)", border: "1px solid var(--accent-glow)", color: "var(--accent)" }}
              >
                च
              </div>
              <div>
                <span className="section-label block mb-0.5">{t("about_org_title")}</span>
                <a
                  href="https://www.charchagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium transition-colors"
                  style={{ color: "var(--accent)" }}
                >
                  charchagram.com ↗
                </a>
              </div>
            </div>

            <p className="text-base leading-relaxed mb-8" style={{ color: "var(--ink-2)" }}>
              {t("about_org_desc")}
            </p>

            {/* Core values */}
            <div className="mb-8">
              <span className="section-label block mb-3">{t("about_org_values")}</span>
              <div className="flex flex-wrap gap-2">
                {values.map((v) => (
                  <span
                    key={v}
                    className="status-pill text-xs px-3 py-1"
                    style={{
                      background: "var(--accent-glass)",
                      color: "var(--accent)",
                      border: "1px solid var(--accent-glow)",
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>

            {/* CharchaGram callout */}
            <div
              className="rounded-[var(--r-md)] p-5"
              style={{ background: "var(--glass)", border: "1px solid var(--rule)" }}
            >
              <span className="section-label block mb-2">{t("about_initiative_label")}</span>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="font-semibold text-base" style={{ color: "var(--ink)" }}>
                    CharchaGram
                  </span>
                  <span className="mx-2" style={{ color: "var(--rule-strong)" }}>—</span>
                  <span className="text-sm italic" style={{ color: "var(--ink-3)" }}>
                    "Discussions into Accountability"
                  </span>
                  <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
                    {lang === "hi"
                      ? "चुनाव पारदर्शिता के लिए नागरिक जुड़ाव मंच — उम्मीदवार जानकारी और जन-संवाद"
                      : "Electoral transparency platform — candidate information and civic Q&A for informed voters"}
                  </p>
                </div>
                <a
                  href="https://www.charchagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm px-4 py-1.5 whitespace-nowrap flex-shrink-0"
                >
                  Visit ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div style={{ borderTop: "1px solid var(--rule)" }} />

      {/* ── CONTACT ── */}
      <section className="py-16 px-4" style={{ background: "var(--surface)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="section-label">{t("about_contact_title")}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Contact details card */}
            <div className="card p-7 flex flex-col gap-5">
              <ContactRow label={t("about_contact_email")} icon="✉">
                <a
                  href="mailto:connect@charchagram.com"
                  className="text-sm font-medium transition-colors"
                  style={{ color: "var(--accent)" }}
                >
                  connect@charchagram.com
                </a>
              </ContactRow>

              <ContactRow label={t("about_contact_phone")} icon="☎">
                <a
                  href="tel:+918287509616"
                  className="text-sm font-medium"
                  style={{ color: "var(--ink-2)" }}
                >
                  +91 82875 09616
                </a>
              </ContactRow>

              <ContactRow label={t("about_contact_hours")} icon="◷">
                <span className="text-sm" style={{ color: "var(--ink-2)" }}>
                  {lang === "hi" ? "सोम–शनि, सुबह 11 – शाम 6" : "Mon–Sat, 11 AM – 6 PM"}
                </span>
              </ContactRow>

              <ContactRow label={t("about_contact_address")} icon="⌖">
                <span className="text-sm leading-snug" style={{ color: "var(--ink-2)" }}>
                  {lang === "hi"
                    ? "चर्चा फाउंडेशन, 136बी, सनसिटी फ़्लोर्स, रोहतक, हरियाणा – 124001"
                    : "Charcha Foundation, 136B, Sun City Floors, Rohtak, Haryana – 124001"}
                </span>
              </ContactRow>
            </div>

            {/* Social + CTA card */}
            <div className="card p-7 flex flex-col gap-6">
              <div>
                <span className="section-label block mb-3">{t("about_contact_follow")}</span>
                <div className="flex flex-col gap-2">
                  {SOCIALS.map(({ label, href }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-medium transition-colors hover:underline"
                      style={{ color: "var(--ink-2)" }}
                    >
                      <span style={{ color: "var(--accent)" }}>↗</span>
                      {label}
                    </a>
                  ))}
                </div>
              </div>

              <div
                className="rounded-[var(--r-md)] p-4 mt-auto"
                style={{ background: "var(--accent-glass)", border: "1px solid var(--accent-glow)" }}
              >
                <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {lang === "hi"
                    ? "कोई सुझाव, रिपोर्ट या सहयोग के लिए ईमेल करें।"
                    : "For suggestions, bug reports, or collaboration — reach out over email."}
                </p>
                <a
                  href="mailto:connect@charchagram.com"
                  className="btn-primary inline-block mt-3 text-sm px-4 py-1.5"
                >
                  {lang === "hi" ? "ईमेल भेजें →" : "Send an email →"}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactRow({ label, icon, children }) {
  return (
    <div className="flex gap-3">
      <span
        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-sm"
        style={{ background: "var(--accent-glass)", color: "var(--accent)" }}
      >
        {icon}
      </span>
      <div>
        <div className="mono-text mb-0.5" style={{ color: "var(--ink-4)", fontSize: "0.625rem", letterSpacing: "0.08em" }}>
          {label}
        </div>
        {children}
      </div>
    </div>
  );
}
