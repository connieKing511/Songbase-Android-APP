import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { SongComment, SongStatus } from "../lib/types";
import { useAuth } from "../lib/auth";

const COMMENT_SELECT = "id, song_id, user_id, body, created_at, author:profiles!user_id(username)";
const MAX_LEN = 2000;

function normalizeComments(rows: unknown): SongComment[] {
  return ((rows as SongComment[]) ?? []).map((row) => {
    const author = Array.isArray(row.author) ? row.author[0] : row.author;
    return { ...row, author: author ?? null };
  });
}

type Props = {
  songId: string;
  songStatus: SongStatus;
};

export function SongComments({ songId, songStatus }: Props) {
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<SongComment[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const canComment = songStatus === "approved";

  async function load() {
    const { data, error: err } = await supabase
      .from("comments")
      .select(COMMENT_SELECT)
      .eq("song_id", songId)
      .order("created_at", { ascending: true });
    if (err) {
      setError(err.message);
      setComments([]);
    } else {
      setError("");
      setComments(normalizeComments(data));
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    const channel = supabase
      .channel(`song-comments-${songId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `song_id=eq.${songId}` },
        () => {
          load();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [songId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !canComment) return;
    const text = body.trim();
    if (!text) {
      setError("请填写评论内容");
      return;
    }
    if (text.length > MAX_LEN) {
      setError(`评论不能超过 ${MAX_LEN} 字`);
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.from("comments").insert({
      song_id: songId,
      user_id: user.id,
      body: text,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setBody("");
    await load();
  }

  async function remove(comment: SongComment) {
    const ok = window.confirm("确定删除这条评论？");
    if (!ok) return;
    const { error: err } = await supabase.from("comments").delete().eq("id", comment.id);
    if (err) {
      setError(err.message);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
  }

  return (
    <section className="mt-8 border-t border-neutral-200 pt-8">
      <h2 className="text-lg font-semibold">评论</h2>
      {loading ? (
        <p className="mt-3 text-sm text-neutral-500">加载评论…</p>
      ) : comments.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">还没有评论。</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {comments.map((comment) => {
            const canDelete = user?.id === comment.user_id || isAdmin;
            return (
              <li key={comment.id} className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{comment.author?.username ?? "用户"}</p>
                    <p className="text-xs text-neutral-500">
                      {new Date(comment.created_at).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      className="shrink-0 text-xs text-red-600 hover:underline"
                      onClick={() => remove(comment)}
                    >
                      删除
                    </button>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{comment.body}</p>
              </li>
            );
          })}
        </ul>
      )}

      {canComment ? (
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block text-sm">
            发表评论
            <textarea
              className="field mt-1 min-h-[6rem]"
              value={body}
              maxLength={MAX_LEN}
              onChange={(e) => setBody(e.target.value)}
              placeholder="写下你的想法…"
              required
            />
          </label>
          <p className="text-xs text-neutral-500">
            {body.trim().length}/{MAX_LEN}
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary" disabled={busy}>
            {busy ? "提交中…" : "提交评论"}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-neutral-500">歌曲审核通过并入库后即可评论。</p>
      )}
    </section>
  );
}
