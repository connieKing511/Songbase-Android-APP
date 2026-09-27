import { Link } from "react-router-dom";
import type { Song } from "../lib/types";
import { StatusBadge } from "./Layout";
import { TaxonomyBadges } from "./TaxonomyBadges";

export function SongCard({ song, showStatus = false }: { song: Song; showStatus?: boolean }) {
  return (
    <Link to={`/songs/${song.id}`} className="card block p-4 transition hover:border-neutral-400">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-black">{song.title}</h3>
          <p className="mt-0.5 text-sm text-neutral-600">
            {song.artist}
            {song.album ? ` · ${song.album}` : ""}
          </p>
        </div>
        {showStatus && <StatusBadge status={song.status} />}
      </div>
      <TaxonomyBadges song={song} />
    </Link>
  );
}
