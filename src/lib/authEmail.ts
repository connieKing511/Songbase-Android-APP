import { supabase } from "./supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SYNTHETIC_EMAIL_DOMAIN = "users.songbase.local";

export function looksLikeEmail(value: string) {
  return EMAIL_RE.test(value.trim());
}

export function isSyntheticEmail(email: string | undefined | null) {
  if (!email) return true;
  return email.toLowerCase().endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`);
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function usernameToAuthEmail(username: string) {
  const value = username.trim();
  if (looksLikeEmail(value)) return value.toLowerCase();
  const data = new TextEncoder().encode(value.toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return `${toHex(digest).slice(0, 40)}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export async function resolveLoginEmail(login: string) {
  const value = login.trim();
  const { data } = await supabase.rpc("resolve_login_email", { p_login: value });
  if (typeof data === "string" && data) return data;
  return usernameToAuthEmail(value);
}
