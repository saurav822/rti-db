import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT } from "../lib/i18n.js";

export default function Login() {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = useT(lang);

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [user, loading, navigate]);

  async function handleGoogleSignIn() {
    try {
      await signIn();
    } catch (err) {
      console.error("Sign in error:", err);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card p-8 text-center">
        <img src="/logo.png" alt="OpenRTI" className="w-16 h-16 mx-auto mb-5 rounded-[var(--r-lg)]" style={{ objectFit: "contain" }} />
        <h1 className="text-xl font-semibold text-[var(--ink)] mb-2">{t("login_title")}</h1>
        <p className="text-sm text-[var(--ink-3)] mb-8">{t("login_subtitle")}</p>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 font-medium transition-colors shadow-sm"
          style={{
            border: "1px solid var(--rule-strong)",
            background: "var(--surface)",
            color: "var(--ink)",
            borderRadius: "var(--r-md)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface)"; }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t("login_google")}
        </button>

        <div className="mt-6">
          <Link to="/" className="text-sm transition-colors" style={{ color: "var(--ink-3)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-3)"; }}
          >
            {t("login_back")}
          </Link>
        </div>
      </div>
    </div>
  );
}
