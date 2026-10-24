import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { isSyntheticEmail } from "../lib/authEmail";

export function AccountPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const bound = user?.email && !isSyntheticEmail(user.email);

  async function bindEmail(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({
      email: email.trim(),
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await refreshProfile();
    setInfo("已提交。若项目开启了邮箱确认，请到该邮箱点开认证链接；未开启则会直接绑定。之后也可用该邮箱登录。");
  }

  return (
    <div className="card mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-xl font-semibold">账号</h1>
      <p className="text-sm text-neutral-600">用户名：{profile?.username ?? "—"}</p>
      {bound ? (
        <p className="text-sm">
          已绑定邮箱：<span className="font-medium">{user?.email}</span>
        </p>
      ) : (
        <form onSubmit={bindEmail} className="space-y-3">
          <p className="text-sm text-neutral-600">邮箱认证可选。不绑定也能用曲库，但无法自行找回密码。绑定并认证后，才能用邮件重置密码。</p>
          <label className="block text-sm">
            邮箱
            <input className="field mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-neutral-700">{info}</p>}
          <button className="btn-primary" disabled={busy}>
            {busy ? "提交中…" : "绑定并认证邮箱"}
          </button>
        </form>
      )}
    </div>
  );
}
