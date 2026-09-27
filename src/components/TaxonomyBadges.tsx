import type { Song } from "../lib/types";
import { songFamiliarity } from "../lib/taxonomy";

export function TaxonomyBadges({ song }: { song: Song }) {
  const items = [
    song.content_nature,
    song.tempo,
    song.era,
    `${songFamiliarity(song)}（已带 ${song.times_led ?? 0} 次）`,
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-neutral-300 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-800">
          {item}
        </span>
      ))}
    </div>
  );
}
