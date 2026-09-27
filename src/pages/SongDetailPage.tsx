import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Song } from "../lib/types";
import { StatusBadge } from "../components/Layout";
import { TaxonomyBadges } from "../components/TaxonomyBadges";
import { songFamiliarity } from "../lib/taxonomy";
import { useAuth } from "../lib/auth";

export function SongDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [song, setSong] = useState<Song | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("songs")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        setSong((data as Song | null) ?? null);
      });
  }, [id]);

  async function deleteApproved() {
    if (!song || song.status !== "approved") return;
    const ok = window.confirm(`确定从曲库删除《${song.title}》？此操作不可恢复。`);
    if (!ok) return;
    setBusy(true);
    const { error: err } = await supabase.from("songs").delete().eq("id", song.id);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate("/");
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!song) return <p className="text-neutral-500">加载中或无权查看…</p>;

  return (
    <article className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{song.title}</h1>
          <p className="mt-1 text-base text-neutral-700">
            {song.artist}
            {song.album ? ` · ${song.album}` : ""}
          </p>
        </div>
        <StatusBadge status={song.status} />
      </div>
      <TaxonomyBadges song={song} />
      <dl className="mt-6 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
          <dt className="text-neutral-500">已带次数</dt>
          <dd>{song.times_led ?? 0}</dd>
        </div>
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
          <dt className="text-neutral-500">熟悉度</dt>
          <dd>{songFamiliarity(song)}</dd>
        </div>
      </dl>
      <div className="mt-8">
        <p className="mb-2 text-sm text-neutral-500">音频地址</p>
        <p className="break-all rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-black">{song.audio_url}</p>
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-semibold">歌词</h2>
        <pre className="mt-3 whitespace-pre-wrap font-sans leading-8 text-neutral-800">{song.lyrics || "暂无歌词"}</pre>
      </div>
      {isAdmin && song.status === "approved" && (
        <div className="mt-8">
          <button
            className="btn-ghost border-red-600 text-red-600 hover:bg-red-50"
            disabled={busy}
            onClick={deleteApproved}
          >
            {busy ? "删除中…" : "从曲库删除"}
          </button>
        </div>
      )}
    </article>
  );
}
