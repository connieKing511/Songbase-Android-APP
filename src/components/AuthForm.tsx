import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { resolveLoginEmail, usernameToAuthEmail } from "../lib/authEmail";

function registerErrorMessage(message: string) {
  const msg = message.toLowerCase();
  if (
    msg.includes("already registered") ||
    msg.includes("already exists") ||
    msg.includes("duplicate") ||
    msg.includes("unique") ||
    msg.includes("username")
  ) {
    return "该用户名已被注册，请换一个";
  }
  return message;
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const name = username.trim();
      if (mode === "register") {
        const { data: taken, error: takenErr } = await supabase.rpc("username_taken", { p_username: name });
        if (takenErr) throw takenErr;
        if (taken) {
          setError("该用户名已被注册，请换一个");
          return;
        }
        const email = await usernameToAuthEmail(name);
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: name } },
        });
        if (err) throw new Error(registerErrorMessage(err.message));
      } else {
        const email = await resolveLoginEmail(name);
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
      }
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto mt-10 max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">{mode === "login" ? "登录" : "注册"}</h1>
      <p className="text-sm text-neutral-600">
        {mode === "register"
          ? "只需用户名和密码，用户名不可重复。不必填真实邮箱；只有绑定邮箱后才能找回密码。"
          : "用用户名和密码登录。若已绑定邮箱，也可以填邮箱。"}
      </p>
      <label className="block text-sm">
        用户名{mode === "login" ? "或邮箱" : ""}
        <input
          className="field mt-1"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={2}
          autoComplete="username"
        />
      </label>
      <label className="block text-sm">
        密码
        <input
          className="field mt-1"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? "请稍候…" : mode === "login" ? "登录" : "创建账号"}
      </button>
      {mode === "login" && (
        <p className="text-center text-sm">
          <Link className="text-black underline" to="/reset-password">
            忘记密码
          </Link>
        </p>
      )}
      <p className="text-center text-sm text-neutral-500">
        {mode === "login" ? (
          <>
            还没有账号？{" "}
            <Link className="text-black underline" to="/register">
              去注册
            </Link>
          </>
        ) : (
          <>
            已有账号？{" "}
            <Link className="text-black underline" to="/login">
              去登录
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
