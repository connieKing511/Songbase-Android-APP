import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  console.warn("缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY，请复制 .env.example 为 .env 并填入项目密钥。");
}

export const supabase = createClient(url || "https://placeholder.supabase.co", anon || "placeholder", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function isSupabaseConfigured() {
  return Boolean(url && anon);
}
