-- 已有项目：在 SQL Editor 执行本文件，为详情页评论建表并配置权限。
-- 评论发出即公开，无需审核。作者可删自己的评论，管理员可删任意评论。

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists comments_song_idx on public.comments (song_id, created_at);

alter table public.comments enable row level security;

drop policy if exists "comments select approved songs" on public.comments;
create policy "comments select approved songs" on public.comments
  for select to authenticated
  using (
    exists (
      select 1 from public.songs s
      where s.id = song_id
        and (s.status = 'approved' or s.uploader_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "comments insert on approved" on public.comments;
create policy "comments insert on approved" on public.comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.songs s
      where s.id = song_id and s.status = 'approved'
    )
  );

drop policy if exists "comments delete own or admin" on public.comments;
create policy "comments delete own or admin" on public.comments
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

grant select, insert, delete on table public.comments to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.comments;
exception
  when duplicate_object then null;
end $$;
