import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Song } from "../lib/types";
import { StatusBadge } from "../components/Layout";
import { familiarityFromTimes, songFamiliarity } from "../lib/taxonomy";

export function AdminPage() {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [note, setNote] = useState<Record<string, string>>({});
  const [timesLed, setTimesLed] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    let query = supabase.from("songs").select("*").order("created_at", { ascending: false });
    if (filter === "pending") query = query.eq("status", "pending");
    if (filter === "approved") query = query.eq("status", "approved");
    const { data } = await query;
    const list = (data as Song[]) ?? [];
    setSongs(list);
    setTimesLed((prev) => {
      const next = { ...prev };
      for (const song of list) {
        if (next[song.id] === undefined) next[song.id] = String(song.times_led ?? 0);
      }
      return next;
    });
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-songs")
      .on("postgres_changes", { event: "*", schema: "public", table: "songs" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  async function review(song: Song, status: "approved" | "rejected") {
    if (!user) return;
    setBusy(song.id);
    const { error } = await supabase
      .from("songs")
      .update({
        status,
        review_note: note[song.id] || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", song.id);
    setBusy(null);
    if (error) alert(error.message);
    else load();
  }

  async function deleteApproved(song: Song) {
    if (song.status !== "approved") return;
    const ok = window.confirm(`确定从曲库删除《${song.title}》？此操作不可恢复。`);
    if (!ok) return;
    setBusy(song.id);
    const { error } = await supabase.from("songs").delete().eq("id", song.id);
    setBusy(null);
    if (error) alert(error.message);
    else load();
  }

  async function saveTimesLed(song: Song) {
    const value = Number.parseInt(timesLed[song.id] ?? "0", 10);
    if (!Number.isInteger(value) || value < 0) {
      alert("已带次数必须是大于等于 0 的整数");
      return;
    }
    setBusy(song.id);
    const { error } = await supabase.from("songs").update({ times_led: value }).eq("id", song.id);
    setBusy(null);
    if (error) alert(error.message);
    else load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">审核队列</h1>
          <p className="mt-1 text-neutral-600">通过后歌曲入库。管理员可修改已带次数，也可删除已入库歌曲。</p>
        </div>
        <div className="flex gap-2">
          <button className={filter === "pending" ? "btn-primary" : "btn-ghost"} onClick={() => setFilter("pending")}>
            待审核
          </button>
          <button className={filter === "approved" ? "btn-primary" : "btn-ghost"} onClick={() => setFilter("approved")}>
            已入库
          </button>
          <button className={filter === "all" ? "btn-primary" : "btn-ghost"} onClick={() => setFilter("all")}>
            全部
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {songs.length === 0 && <p className="text-neutral-500">没有记录。</p>}
        {songs.map((song) => {
          const led = Number.parseInt(timesLed[song.id] ?? String(song.times_led ?? 0), 10);
          const preview = Number.isInteger(led) && led >= 0 ? familiarityFromTimes(led) : songFamiliarity(song);
          return (
            <div key={song.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{song.title}</h2>
                  <p className="text-neutral-600">
                    {song.artist}
                    {song.album ? ` · ${song.album}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {[song.content_nature, song.tempo, song.era].filter(Boolean).join(" · ") || "未分类"}
                  </p>
                </div>
                <StatusBadge status={song.status} />
              </div>
              <p className="mt-4 break-all text-sm text-neutral-600">音频地址：{song.audio_url}</p>
              {song.lyrics && (
                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-sm text-neutral-600">{song.lyrics}</pre>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="text-sm">
                  已带次数（管理员可改，≥0 整数）
                  <input
                    className="field mt-1"
                    type="number"
                    min={0}
                    step={1}
                    value={timesLed[song.id] ?? "0"}
                    onChange={(e) => setTimesLed((p) => ({ ...p, [song.id]: e.target.value }))}
                  />
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-black">{preview}</span>
                  <button className="btn-ghost" disabled={busy === song.id} onClick={() => saveTimesLed(song)}>
                    保存次数
                  </button>
                </div>
              </div>
              {song.status === "pending" && (
                <div className="mt-4 space-y-3">
                  <input
                    className="field"
                    placeholder="审核备注（拒绝时建议填写）"
                    value={note[song.id] || ""}
                    onChange={(e) => setNote((p) => ({ ...p, [song.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <button className="btn-primary" disabled={busy === song.id} onClick={() => review(song, "approved")}>
                      通过入库
                    </button>
                  <button className="btn-ghost" disabled={busy === song.id} onClick={() => review(song, "rejected")}>
                    拒绝
                  </button>
                </div>
              </div>
            )}
            {song.status === "approved" && (
              <div className="mt-4">
                <button
                  className="btn-ghost border-red-600 text-red-600 hover:bg-red-50"
                  disabled={busy === song.id}
                  onClick={() => deleteApproved(song)}
                >
                  从曲库删除
                </button>
              </div>
            )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
