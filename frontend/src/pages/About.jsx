import React from "react";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT } from "../lib/i18n.js";

const VALUES = ["Transparency", "Impartiality", "Participation", "Accountability"];
const VALUES_HI = ["पारदर्शिता", "निष्पक्षता", "भागीदारी", "जवाबदेही"];

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
            RTIgram · Right to Information Act 2005
          </span>
          <h1
            className="text-4xl sm:text-5xl font-bold mb-6"
            style={{ color: "var(--ink)", lineHeight: 1.15 }}
          >
            {lang === "hi" ? (
              <>RTI<span style={{ color: "var(--accent)" }}>gram</span> के बारे में</>
            ) : (
              <>About RTI<span style={{ color: "var(--accent)" }}>gram</span></>
            )}
          </h1>
          <p
            className="text-lg leading-relaxed mx-auto"
            style={{ color: "var(--ink-2)", maxWidth: "38rem" }}
          >
            {t("about_hero_desc")}
          </p>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div style={{ borderTop: "1px solid var(--rule-strong)" }} />

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
                  href="https://www.rtigram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium transition-colors"
                  style={{ color: "var(--accent)" }}
                >
                  rtigram.com ↗
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
                  href="mailto:connect.charchagram@gmail.com"
                  className="text-sm font-medium transition-colors"
                  style={{ color: "var(--accent)" }}
                >
                  connect.charchagram@gmail.com
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
                    ? "फ्लैट नं. 304, पॉकेट 8, सेक्टर 12, द्वारका, N.S.I.T. द्वारका, नई दिल्ली – 110078"
                    : "Flat No. 304, Pocket 8, Sector 12, Dwarka, N.S.I.T. Dwarka, New Delhi – 110078"}
                </span>
              </ContactRow>
            </div>

            {/* CTA card */}
            <div className="card p-7 flex flex-col justify-center gap-4">
              <div
                className="rounded-[var(--r-md)] p-6"
                style={{ background: "var(--accent-glass)", border: "1px solid var(--accent-glow)" }}
              >
                <p className="text-base leading-relaxed mb-1 font-semibold" style={{ color: "var(--ink)" }}>
                  {lang === "hi" ? "हमसे जुड़ें" : "Get in touch"}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {lang === "hi"
                    ? "कोई सुझाव, बग रिपोर्ट या सहयोग के लिए ईमेल करें।"
                    : "For suggestions, bug reports, or collaboration — reach out over email."}
                </p>
                <a
                  href="mailto:connect.charchagram@gmail.com"
                  className="btn-primary inline-block mt-4 text-sm px-5 py-2"
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
