import supabase from "../lib/supabase.js";

// Only the account whose email matches ADMIN_EMAIL may call admin routes.
// Expects a Supabase access token: Authorization: Bearer <token>
export default async function adminAuth(req, res, next) {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    if (!adminEmail) {
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

    if (data.user.email.toLowerCase() !== adminEmail) {
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
