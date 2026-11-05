
import { createClient } from "@supabase/supabase-js";

/** Public project URL and PUBLISHABLE key only. NEVER put secret/service_role keys into PWA. */
const PROJECT_URL="https://mbinhbascpeupnxrvidk.supabase.co";
const PUBLISHABLE_KEY="sb_publishable_PtfE1p4mDM2vGLZI6i5X7w_MiOKwsys";
// Invitation links from Supabase Auth Admin use implicit tokens, not PKCE.
// Capture intent before the Auth client consumes/removes the URL fragment.
const incoming = typeof window!=="undefined" ? new URLSearchParams(window.location.search) : null;
const hasAuthTokens = typeof window!=="undefined" && window.location.hash.includes("access_token=");
export const SA_AUTH_LINK_INVITE=Boolean(incoming?.get("sa_auth")==="invite"&&hasAuthTokens);
export const SA_AUTH_LINK_RECOVERY=Boolean(incoming?.get("sa_auth")==="recovery"&&hasAuthTokens);
export const supabase=createClient(PROJECT_URL,PUBLISHABLE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"implicit"},
});

/** Fail closed: do not gate a real production app until the admin account and cloud data flow are ready. */
export const AUTH_ENFORCED=true; // V1.7: no unauthenticated access to business pages
