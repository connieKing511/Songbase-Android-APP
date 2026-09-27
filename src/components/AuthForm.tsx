import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: username.trim() } },
        });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
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
      <p className="text-sm text-neutral-600">使用邮箱和密码。上传后需管理员审核才会入库。</p>
      {mode === "register" && (
        <label className="block text-sm">
          用户名
          <input className="field mt-1" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={2} />
        </label>
      )}
      <label className="block text-sm">
        邮箱
        <input className="field mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
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
