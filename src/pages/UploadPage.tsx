import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { CONTENT_NATURES, ERAS, TEMPOS } from "../lib/taxonomy";
import { ChoiceGroup } from "../components/ChoiceGroup";

export function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [contentNature, setContentNature] = useState("");
  const [tempo, setTempo] = useState("");
  const [era, setEra] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!contentNature || !tempo || !era) {
      setError("请为内容性质、速度、年代各选一个类别");
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.from("songs").insert({
      title: title.trim(),
      artist: artist.trim(),
      album: album.trim() || null,
      lyrics: lyrics.trim() || null,
      audio_url: audioUrl.trim(),
      content_nature: contentNature,
      tempo,
      era,
      times_led: 0,
      uploader_id: user.id,
      status: "pending",
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate("/mine");
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">上传歌曲</h1>
      <p className="text-sm text-neutral-600">
        填写资料、分类与音频网址。熟悉度由管理员填写的「已带次数」自动判定，上传时从 0 开始。
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          歌名 *
          <input className="field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="text-sm">
          歌手 *
          <input className="field mt-1" value={artist} onChange={(e) => setArtist(e.target.value)} required />
        </label>
        <label className="text-sm sm:col-span-2">
          专辑
          <input className="field mt-1" value={album} onChange={(e) => setAlbum(e.target.value)} />
        </label>
      </div>
      <div className="space-y-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-sm text-neutral-500">请点选每一类中的具体类别</p>
        <ChoiceGroup label="内容性质" required value={contentNature} options={CONTENT_NATURES} onChange={setContentNature} />
        <ChoiceGroup label="速度" required value={tempo} options={TEMPOS} onChange={setTempo} />
        <ChoiceGroup label="年代" required value={era} options={ERAS} onChange={setEra} />
      </div>
      <label className="block text-sm">
        音频地址 *
        <input
          className="field mt-1"
          type="text"
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          required
          placeholder="粘贴音频网址，按原文保存"
        />
      </label>
      <label className="block text-sm">
        歌词
        <textarea className="field mt-1 min-h-[180px]" value={lyrics} onChange={(e) => setLyrics(e.target.value)} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary" disabled={busy}>
        {busy ? "提交中…" : "提交审核"}
      </button>
    </form>
  );
}
