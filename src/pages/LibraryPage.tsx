import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Song } from "../lib/types";
import { SongCard } from "../components/SongCard";
import { useAuth } from "../lib/auth";
import { CONTENT_NATURES, ERAS, FAMILIARITIES, TEMPOS } from "../lib/taxonomy";

export function LibraryPage() {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [keyword, setKeyword] = useState("");
  const [contentNature, setContentNature] = useState("");
  const [tempo, setTempo] = useState("");
  const [era, setEra] = useState("");
  const [familiarity, setFamiliarity] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let query = supabase.from("songs").select("*").eq("status", "approved").order("created_at", { ascending: false });
    const q = keyword.trim().replace(/[,()]/g, " ");
    if (q) {
      query = query.or(`title.ilike.%${q}%,artist.ilike.%${q}%,album.ilike.%${q}%,lyrics.ilike.%${q}%`);
    }
    if (contentNature) query = query.eq("content_nature", contentNature);
    if (tempo) query = query.eq("tempo", tempo);
    if (era) query = query.eq("era", era);
    if (familiarity) query = query.eq("familiarity", familiarity);
    const { data } = await query;
    setSongs((data as Song[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("library-songs")
      .on("postgres_changes", { event: "*", schema: "public", table: "songs" }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [keyword, contentNature, tempo, era, familiarity]);

  return (
    <div>
      <section className="mb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">曲库</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">诗歌库</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          按内容性质、速度、年代、熟悉度筛选，或用关键词检索歌名、歌手、专辑与歌词。熟悉度由已带次数自动划分：0–15 不太熟悉，16–30 较熟悉，大于 30 熟悉。
        </p>
      </section>

      {!user && (
        <p className="mb-6 rounded-md border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm">
          请先登录后浏览曲库、上传歌曲并接收同步通知。
        </p>
      )}

      <form
        className="card mb-8 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          className="field lg:col-span-2"
          placeholder="关键词（歌名 / 歌手 / 歌词）"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select className="field" value={contentNature} onChange={(e) => setContentNature(e.target.value)}>
          <option value="">内容性质（全部）</option>
          {CONTENT_NATURES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select className="field" value={tempo} onChange={(e) => setTempo(e.target.value)}>
          <option value="">速度（全部）</option>
          {TEMPOS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select className="field" value={era} onChange={(e) => setEra(e.target.value)}>
          <option value="">年代（全部）</option>
          {ERAS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select className="field" value={familiarity} onChange={(e) => setFamiliarity(e.target.value)}>
          <option value="">熟悉度（全部）</option>
          {FAMILIARITIES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <button className="btn-primary lg:col-span-6" type="submit">
          {loading ? "检索中…" : "检索"}
        </button>
      </form>

      {songs.length === 0 && !loading ? (
        <p className="py-16 text-center text-neutral-500">曲库还是空的，通过审核的歌曲会出现在这里。</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {songs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      )}
    </div>
  );
}
