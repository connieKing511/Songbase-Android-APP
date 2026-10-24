import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { NotificationItem } from "../lib/types";
import { useAuth } from "../lib/auth";

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!cancelled) setItems((data as NotificationItem[]) ?? []);
    }

    load();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setItems((prev) => [payload.new as NotificationItem, ...prev]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  async function markAllRead() {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function openItem(item: NotificationItem) {
    if (!item.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", item.id);
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    }
    setOpen(false);
    if (item.type === "review_needed") navigate("/admin");
    else if (item.song_id) navigate(`/songs/${item.song_id}`);
  }

  if (!user) return null;

  return (
    <div className="relative">
      <button className="app-nav-btn relative" onClick={() => setOpen((v) => !v)} aria-label="通知">
        通知
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[1.1rem] rounded-full bg-black px-1 text-center text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 z-30 mt-2 w-80 overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 text-sm">
            <span className="font-semibold">消息</span>
            <button className="text-black underline" onClick={markAllRead}>
              全部已读
            </button>
          </div>
          <div className="max-h-80 overflow-auto">
            {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-neutral-500">暂无通知</p>}
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => openItem(item)}
                className="block w-full border-b border-neutral-100 px-3 py-2.5 text-left hover:bg-neutral-50"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {!item.read && <span className="h-2 w-2 rounded-full bg-black" />}
                  {item.title}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{item.body}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin, signOut, user } = useAuth();

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-3 pb-10 text-sm">
      <header className="app-header">
        <Link to="/" className="app-brand shrink-0 text-lg font-semibold tracking-tight text-black">
          Songbase
        </Link>
        <nav className="app-nav">
          <Link className="app-nav-btn" to="/">
            曲库
          </Link>
          {user && (
            <>
              <Link className="app-nav-btn" to="/upload">
                上传
              </Link>
              <Link className="app-nav-btn" to="/mine">
                我的投稿
              </Link>
              <Link className="app-nav-btn" to="/account">
                账号
              </Link>
            </>
          )}
          {isAdmin && (
            <Link className="app-nav-btn" to="/admin">
              审核
            </Link>
          )}
          <NotificationBell />
          {user ? (
            <button className="app-nav-btn" onClick={() => signOut()}>
              {profile?.username ?? "退出"}
            </button>
          ) : (
            <Link className="btn-primary app-nav-login" to="/login">
              登录
            </Link>
          )}
        </nav>
      </header>
      {children}
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);
  if (loading) return <p className="py-20 text-center text-neutral-500">加载中…</p>;
  if (!user) return null;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user && !isAdmin) navigate("/");
  }, [loading, isAdmin, user, navigate]);
  if (loading) return <p className="py-20 text-center text-neutral-500">加载中…</p>;
  if (!isAdmin) return null;
  return <>{children}</>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "border border-neutral-300 bg-neutral-100 text-neutral-800",
    approved: "border border-neutral-800 bg-black text-white",
    rejected: "border border-neutral-300 bg-white text-neutral-600",
  };
  const label: Record<string, string> = {
    pending: "待审核",
    approved: "已入库",
    rejected: "未通过",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? "border border-neutral-200"}`}>
      {label[status] ?? status}
    </span>
  );
}
