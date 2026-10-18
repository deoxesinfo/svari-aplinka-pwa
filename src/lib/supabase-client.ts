
import { createClient } from "@supabase/supabase-js";

/** Public project URL and PUBLISHABLE key only. NEVER put secret/service_role keys into PWA. */
const PROJECT_URL="https://mbinhbascpeupnxrvidk.supabase.co";
const PUBLISHABLE_KEY="sb_publishable_PtfE1p4mDM2vGLZI6i5X7w_MiOKwsys";
export const supabase=createClient(PROJECT_URL,PUBLISHABLE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"pkce"},
});

/** Fail closed: do not gate a real production app until the admin account and cloud data flow are ready. */
export const AUTH_ENFORCED=import.meta.env.VITE_SA_AUTH_ENFORCED === "true";
