export type Role = "user" | "admin";
export type SongStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  username: string;
  role: Role;
  created_at: string;
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  lyrics: string | null;
  audio_url: string;
  tags: string[];
  category: string | null;
  custom_fields: Record<string, string>;
  content_nature: string | null;
  tempo: string | null;
  era: string | null;
  times_led: number;
  familiarity: string | null;
  status: SongStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  uploader_id: string;
  created_at: string;
  updated_at: string;
  uploader?: Profile;
};

export type NotificationItem = {
  id: string;
  user_id: string;
  type: "review_needed" | "song_published" | "song_rejected" | string;
  title: string;
  body: string | null;
  song_id: string | null;
  read: boolean;
  created_at: string;
};
