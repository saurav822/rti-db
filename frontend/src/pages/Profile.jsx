import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT } from "../lib/i18n.js";
import RTICard from "../components/RTICard.jsx";
import { listEntries } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";

export default function Profile() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = useT(lang);
  const [uploads, setUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoadingUploads(true);
    supabase
      .from("rti_entries")
      .select("id, title, department, state, subject, response_status, tags, date_filed, language, upvotes, view_count, created_at")
      .eq("uploaded_by", user.id)
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data }) => setUploads(data || []))
      .catch(console.error)
      .finally(() => setLoadingUploads(false));
  }, [user]);

  if (loading || !user) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-[var(--ink-4)]">Loading...</div>;
  }

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email || "";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile header */}
      <div className="card p-6 mb-8 flex items-center gap-5">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
          style={{ background: "var(--ink)", color: "#fff", fontFamily: "DM Mono, monospace" }}
        >
          {displayName[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[var(--ink)]">{displayName}</h1>
          <p className="text-sm text-[var(--ink-3)] mt-0.5">{user.email}</p>
        </div>
        <button
          onClick={() => signOut().then(() => navigate("/"))}
          className="btn-secondary text-sm hindi-text"
          style={{ color: "var(--red)", borderColor: "rgba(155,44,44,0.30)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--red-bg)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
        >
          {t("profile_sign_out")}
        </button>
      </div>

      {/* My uploads */}
      <h2 className="text-base font-semibold text-[var(--ink)] mb-4">{t("profile_my_uploads")} ({uploads.length})</h2>
      {loadingUploads ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse space-y-3">
              <div className="h-4 rounded w-1/2" style={{ background: "var(--rule)" }} />
              <div className="h-5 rounded" style={{ background: "var(--rule)" }} />
            </div>
          ))}
        </div>
      ) : uploads.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploads.map((entry) => <RTICard key={entry.id} entry={entry} />)}
        </div>
      ) : (
        <div className="text-center py-12 text-[var(--ink-4)]">
          <p>No RTIs uploaded yet.</p>
          <Link to="/upload" className="btn-primary inline-block mt-4">{t("nav_upload")}</Link>
        </div>
      )}
    </div>
  );
}
