import supabase from "../lib/supabase.js";

// Only accounts whose email is listed in ADMIN_EMAIL may call admin routes.
// ADMIN_EMAIL accepts a single address or a comma-separated list.
// Expects a Supabase access token: Authorization: Bearer <token>
export default async function adminAuth(req, res, next) {
  try {
    const adminEmails = (process.env.ADMIN_EMAIL || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (adminEmails.length === 0) {
      return res.status(503).json({ error: "Admin access is not configured (ADMIN_EMAIL missing)" });
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Sign in required" });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.email) {
      console.warn("adminAuth: token rejected —", error?.message || "no email on user");
      return res.status(401).json({ error: "Session expired — please sign out and sign in again" });
    }

    if (!adminEmails.includes(data.user.email.toLowerCase())) {
      console.warn(`adminAuth: unauthorized email ${data.user.email}`);
      return res.status(403).json({ error: "This account is not authorized for admin access" });
    }

    req.adminUser = data.user;
    next();
  } catch (err) {
    console.error("adminAuth error:", err);
    return res.status(500).json({ error: "Auth check failed" });
  }
}
