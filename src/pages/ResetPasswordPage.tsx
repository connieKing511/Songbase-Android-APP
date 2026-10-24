import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { isSyntheticEmail } from "../lib/authEmail";

export function recoveryRedirectUrl() {
  const path = window.location.pathname.endsWith("/")
    ? window.location.pathname
    : `${window.location.pathname}/`;
  return `${window.location.origin}${path}`;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [readyToSet, setReadyToSet] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) setReadyToSet(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) setReadyToSet(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function sendReset(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    const { data: target, error: resolveErr } = await supabase.rpc("resolve_login_email", { p_login: login.trim() });
    if (resolveErr) {
      setBusy(false);
      setError(resolveErr.message);
      return;
    }
    if (!target) {
      setBusy(false);
      setError("找不到该用户名或邮箱");
      return;
    }
    if (isSyntheticEmail(target)) {
      setBusy(false);
      setError("该账号未用真实邮箱认证，无法找回密码。请登录后在「账号」中绑定邮箱，或请管理员协助改密。");
      return;
    }
    const { error: err } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: recoveryRedirectUrl(),
    });
    setBusy(false);
    if (err) {
      const msg = err.message.toLowerCase();
      setError(
        msg.includes("rate limit")
          ? "重置邮件发送太频繁，请过一段时间再试。现在可以到 Supabase → Authentication → Users 里直接给该账号设置新密码，不必等邮件。"
          : err.message
      );
      return;
    }
    setInfo("如果该邮箱已注册，你会收到重置邮件。请在电脑浏览器打开链接，并先运行 npm run dev。");
  }

  async function setNewPassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate("/login");
  }

  return (
    <div className="card mx-auto mt-10 max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">{readyToSet ? "设置新密码" : "找回密码"}</h1>
      {readyToSet ? (
        <form onSubmit={setNewPassword} className="space-y-4">
          <p className="text-sm text-neutral-600">链接已验证，请输入新密码。</p>
          <label className="block text-sm">
            新密码
            <input className="field mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>
          <label className="block text-sm">
            再输入一次
            <input className="field mt-1" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "保存中…" : "保存新密码"}
          </button>
        </form>
      ) : (
        <form onSubmit={sendReset} className="space-y-4">
          <p className="text-sm text-neutral-600">
            邮件里的链接默认会跳到电脑上的本地网页。请在电脑打开，并保持 <code>npm run dev</code> 正在运行。手机上打不开 localhost 是正常的。
          </p>
          <label className="block text-sm">
            用户名或已绑定的邮箱
            <input className="field mt-1" value={login} onChange={(e) => setLogin(e.target.value)} required />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-neutral-700">{info}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "发送中…" : "发送重置邮件"}
          </button>
        </form>
      )}
      <p className="text-center text-sm text-neutral-500">
        <Link className="text-black underline" to="/login">
          返回登录
        </Link>
      </p>
    </div>
  );
}
