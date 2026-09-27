import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Song } from "../lib/types";
import { SongCard } from "../components/SongCard";

export function MinePage() {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("songs")
      .select("*")
      .eq("uploader_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setSongs((data as Song[]) ?? []));
  }, [user]);

  return (
    <div>
      <h1 className="text-xl font-semibold">我的投稿</h1>
      <p className="mt-2 mb-6 text-neutral-600">查看审核状态。通过后歌曲会进入公共曲库。</p>
      {songs.length === 0 ? (
        <p className="text-neutral-500">还没有投稿。</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {songs.map((song) => (
            <SongCard key={song.id} song={song} showStatus />
          ))}
        </div>
      )}
    </div>
  );
}
