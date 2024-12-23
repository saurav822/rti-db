import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import SearchBar from "./SearchBar.jsx";

const navLinks = [
  { to: "/", label: "होम", end: true },
  { to: "/browse", label: "Browse" },
  { to: "/check", label: "Duplicate Check" },
  { to: "/upload", label: "Upload RTI" },
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  function handleSearch(query, mode) {
    navigate(`/search?q=${encodeURIComponent(query)}&mode=${mode}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* Top Navigation */}
      {/* ------------------------------------------------------------------ */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 gap-4">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-saffron-500 to-india-green flex items-center justify-center text-white font-bold text-sm">
                RTI
              </div>
              <span className="font-semibold text-gray-900 hidden sm:block">
                RTI Commons
              </span>
            </NavLink>

            {/* Search bar — hidden on very small screens */}
            <div className="flex-1 max-w-xl hidden sm:block">
              <SearchBar onSearch={handleSearch} compact />
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-saffron-50 text-saffron-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
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

          {/* Mobile search */}
          <div className="sm:hidden pb-3">
            <SearchBar onSearch={handleSearch} compact />
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-saffron-50 text-saffron-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Page content */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Footer */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-saffron-500 to-india-green flex items-center justify-center text-white font-bold text-xs">
              RTI
            </div>
            <span>RTI Commons — सूचना का अधिकार ज्ञानकोश</span>
          </div>
          <div className="flex gap-4">
            <NavLink to="/upload" className="hover:text-gray-700">Upload</NavLink>
            <NavLink to="/check" className="hover:text-gray-700">Duplicate Check</NavLink>
            <NavLink to="/browse" className="hover:text-gray-700">Browse</NavLink>
          </div>
          <p>Open civic tool for India. RTI Act 2005.</p>
        </div>
      </footer>
    </div>
  );
}
