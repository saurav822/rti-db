import { createClient } from "@supabase/supabase-js";

// Use the service role key on the backend so RLS doesn't block server writes
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default supabase;
