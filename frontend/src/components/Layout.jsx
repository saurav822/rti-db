import React, { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT } from "../lib/i18n.js";

const navLinks = [
  { to: "/", key: "nav_home", end: true },
  { to: "/browse", key: "nav_browse" },
  { to: "/departments", key: "nav_departments" },
  { to: "/check", key: "nav_duplicate_check" },
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { lang, setLang } = useLanguage();
  const t = useT(lang);
  const userMenuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email || "";

  const navLinkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-[var(--r-sm)] text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? "bg-[var(--accent-glass)] text-[var(--accent)]"
        : "text-[var(--ink-3)] hover:bg-[var(--rule)] hover:text-[var(--ink)]"
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="sticky top-0 z-50"
        style={{
          background: "rgba(237,234,222,0.92)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
          borderBottom: "1px solid var(--rule-strong)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 gap-4">

            {/* ── Logo ── */}
            <NavLink to="/" className="flex items-center gap-2 shrink-0">
              <img src="/logo.png" alt="OpenRTI" className="w-11 h-11 rounded-[var(--r-sm)]" style={{ objectFit: "contain" }} />
              <span className="font-semibold text-[var(--ink)] hidden sm:block" style={{ fontSize: 15 }}>
                OpenRTI
              </span>
            </NavLink>

            {/* ── Lang toggle (small, near logo) ── */}
            <div
              className="hidden sm:flex items-center p-0.5 rounded-md"
              style={{ background: "var(--rule)", gap: 1 }}
            >
              <button
                onClick={() => setLang("en")}
                className="rounded transition-all"
                style={{
                  fontSize: 10.5,
                  fontFamily: "DM Mono, monospace",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  padding: "2px 7px",
                  ...(lang === "en"
                    ? { background: "#fff", color: "var(--ink-2)", boxShadow: "0 1px 2px rgba(0,0,0,0.10)" }
                    : { background: "transparent", color: "var(--ink-4)" }),
                }}
              >
                EN
              </button>
              <button
                onClick={() => setLang("hi")}
                className="rounded transition-all"
                style={{
                  fontSize: 10.5,
                  fontFamily: "Noto Sans Devanagari, sans-serif",
                  fontWeight: 500,
                  padding: "2px 7px",
                  ...(lang === "hi"
                    ? { background: "#fff", color: "var(--ink-2)", boxShadow: "0 1px 2px rgba(0,0,0,0.10)" }
                    : { background: "transparent", color: "var(--ink-4)" }),
                }}
              >
                हि
              </button>
            </div>

            {/* ── Divider ── */}
            <div className="hidden md:block w-px h-5 shrink-0" style={{ background: "var(--rule-strong)" }} />

            {/* ── Center nav ── */}
            <nav className="hidden md:flex items-center gap-0.5 flex-1">
              {navLinks.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
                  {t(link.key)}
                </NavLink>
              ))}
            </nav>

            {/* ── Right cluster ── */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">

              {/* Compact search bar */}
              <form
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-[var(--r-sm)]"
                style={{ background: "rgba(255,253,245,0.55)", border: "1px solid var(--rule-strong)", width: 200 }}
                onSubmit={e => { e.preventDefault(); if (searchQuery.trim()) { navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}&mode=keyword`); setSearchQuery(""); } else { navigate("/search"); } }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--ink-4)", flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search RTIs..."
                  className="bg-transparent border-none outline-none w-full"
                  style={{ fontSize: 12.5, color: "var(--ink-2)", fontFamily: "Instrument Sans, sans-serif" }}
                />
              </form>

              {/* Upload CTA */}
              <NavLink
                to="/upload"
                className="hidden sm:flex btn-primary items-center gap-1.5 py-1.5 px-3.5 text-sm"
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4-4 4M12 4v12" />
                </svg>
                {t("nav_upload")}
              </NavLink>

              {/* User menu / Login */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((o) => !o)}
                    className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--r-sm)] transition-all"
                    style={{ background: "var(--glass)", border: "1px solid var(--rule-strong)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--glass-hover)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--glass)"; e.currentTarget.style.borderColor = "var(--rule-strong)"; }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: "var(--ink)", color: "#fff" }}
                    >
                      {displayName[0]?.toUpperCase()}
                    </span>
                    <span className="text-xs font-medium max-w-[72px] truncate" style={{ color: "var(--ink-2)" }}>
                      {displayName.split(" ")[0]}
                    </span>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ color: "var(--ink-4)", flexShrink: 0 }}>
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 glass rounded-[var(--r-md)] shadow-lg py-1 z-50">
                      <div className="px-4 py-2.5 border-b border-[var(--rule)]">
                        <p className="text-xs font-semibold text-[var(--ink)] truncate">{displayName.split(" ")[0]}</p>
                        <p className="text-xs text-[var(--ink-4)] truncate mt-0.5">{user.email}</p>
                      </div>
                      <NavLink to="/profile" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--accent-glass)]">
                        {t("nav_profile")}
                      </NavLink>
                      <button
                        onClick={() => { signOut(); setUserMenuOpen(false); }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-[var(--red-bg)]"
                        style={{ color: "var(--red)" }}
                      >
                        {t("nav_sign_out")}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  to="/login"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--r-sm)] text-xs font-medium transition-all"
                  style={{ background: "transparent", border: "1px solid var(--rule-strong)", color: "var(--ink-3)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ink)"; e.currentTarget.style.color = "var(--ink)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--rule-strong)"; e.currentTarget.style.color = "var(--ink-3)"; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                  </svg>
                  Sign In
                </NavLink>
              )}

              {/* Mobile: lang toggle — visible only on mobile, in top nav */}
              <div
                className="flex sm:hidden items-center p-0.5 rounded-md shrink-0"
                style={{ background: "var(--rule)", gap: 1 }}
              >
                <button
                  onClick={() => setLang("en")}
                  className="rounded transition-all"
                  style={{
                    fontSize: 10.5, fontFamily: "DM Mono, monospace", fontWeight: 500,
                    letterSpacing: "0.04em", padding: "2px 7px",
                    ...(lang === "en"
                      ? { background: "#fff", color: "var(--ink-2)", boxShadow: "0 1px 2px rgba(0,0,0,0.10)" }
                      : { background: "transparent", color: "var(--ink-4)" }),
                  }}
                >EN</button>
                <button
                  onClick={() => setLang("hi")}
                  className="rounded transition-all"
                  style={{
                    fontSize: 10.5, fontFamily: "Noto Sans Devanagari, sans-serif", fontWeight: 500,
                    padding: "2px 7px",
                    ...(lang === "hi"
                      ? { background: "#fff", color: "var(--ink-2)", boxShadow: "0 1px 2px rgba(0,0,0,0.10)" }
                      : { background: "transparent", color: "var(--ink-4)" }),
                  }}
                >हि</button>
              </div>

              {/* Mobile: upload button with label */}
              <NavLink
                to="/upload"
                className="flex sm:hidden items-center gap-1.5 px-3 py-1.5 rounded-[var(--r-sm)] shrink-0 text-xs font-semibold"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4-4 4M12 4v12" />
                </svg>
                Upload RTI
              </NavLink>

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 rounded-[var(--r-sm)] transition-colors"
                style={{ color: "var(--ink-3)" }}
                onClick={() => setMobileMenuOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--rule)] px-4 py-3 space-y-1" style={{ background: "var(--surface)" }}>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMobileMenuOpen(false)}
                className={navLinkClass}
              >
                {t(link.key)}
              </NavLink>
            ))}
            {!user && (
              <NavLink
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary w-full text-center mt-2 py-2 block"
              >
                {t("nav_login")}
              </NavLink>
            )}
            {user && (
              <div className="pt-2 border-t border-[var(--rule)] mt-2 space-y-1">
                <NavLink to="/profile" onClick={() => setMobileMenuOpen(false)} className={navLinkClass}>
                  {t("nav_profile")}
                </NavLink>
                <button
                  onClick={() => { signOut(); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 rounded-[var(--r-sm)] text-sm font-medium transition-colors"
                  style={{ color: "var(--red)" }}
                >
                  {t("nav_sign_out")}
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--rule)] py-5 px-8" style={{ background: "var(--surface)" }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="OpenRTI" className="w-5 h-5 rounded" style={{ objectFit: "contain" }} />
            <span className="mono-text text-[var(--ink-4)] uppercase" style={{ fontSize: 10, letterSpacing: "0.05em" }}>
              OpenRTI · Open data for every Indian citizen
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--ink-4)" }}>
            <a href="/about" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)] transition-colors" style={{ color: "var(--accent)" }}>About</a>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
