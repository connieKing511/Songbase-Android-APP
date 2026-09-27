export const CONTENT_NATURES = ["敬拜赞美", "救恩&感恩", "回应"] as const;
export const TEMPOS = ["慢速", "中速", "快速"] as const;
export const ERAS = ["传统诗歌", "现代诗歌"] as const;
export const FAMILIARITIES = ["熟悉", "较熟悉", "不太熟悉"] as const;

export type ContentNature = (typeof CONTENT_NATURES)[number];
export type Tempo = (typeof TEMPOS)[number];
export type Era = (typeof ERAS)[number];
export type Familiarity = (typeof FAMILIARITIES)[number];

export function familiarityFromTimes(timesLed: number): Familiarity {
  if (timesLed > 30) return "熟悉";
  if (timesLed >= 16) return "较熟悉";
  return "不太熟悉";
}

export function songFamiliarity(song: { familiarity?: string | null; times_led?: number | null }): Familiarity {
  if (song.familiarity === "熟悉" || song.familiarity === "较熟悉" || song.familiarity === "不太熟悉") {
    return song.familiarity;
  }
  return familiarityFromTimes(song.times_led ?? 0);
}
