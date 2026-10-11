import { connectionProblem } from "./logic.js";

let client = null;
let clientKey = "";

export function getSupabase({ detectSessionInUrl = false } = {}) {
  const config = (typeof window !== "undefined" && window.BIGFOOT_CONFIG) || {};
  const problem = connectionProblem(config);
  if (problem) return { client: null, problem, config };
  const url = String(config.SUPABASE_URL).trim();
  const key = String(config.SUPABASE_ANON_KEY).trim();
  const lib = typeof window !== "undefined" ? window.supabase : undefined;
  if (!lib || typeof lib.createClient !== "function") {
    return { client: null, problem: "library", config };
  }
  const stamp = `${url}|${key}|${detectSessionInUrl ? "1" : "0"}`;
  if (!client || clientKey !== stamp) {
    client = lib.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl,
        storageKey: "bigfoot-auth"
      }
    });
    clientKey = stamp;
  }
  return { client, problem: null, config };
}
