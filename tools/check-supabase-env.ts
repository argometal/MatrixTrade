/** One-off: check whether Vercel env vars are non-empty (no secret output). */
const keys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "TRADES_STORE"];
for (const key of keys) {
  const v = process.env[key];
  console.log(`${key}: ${v && v.trim() ? `set (len=${v.length})` : "EMPTY"}`);
}
