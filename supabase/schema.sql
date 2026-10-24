-- Songbase schema for Supabase SQL Editor
-- Run this once in: Project → SQL Editor → New query

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  album text,
  lyrics text,
  audio_url text not null,
  tags text[] not null default '{}',
  category text,
  custom_fields jsonb not null default '{}'::jsonb,
  content_nature text check (content_nature is null or content_nature in ('敬拜赞美', '救恩&感恩', '回应')),
  tempo text check (tempo is null or tempo in ('慢速', '中速', '快速')),
  era text check (era is null or era in ('传统诗歌', '现代诗歌')),
  times_led integer not null default 0 check (times_led >= 0),
  familiarity text generated always as (
    case
      when times_led > 30 then '熟悉'
      when times_led >= 16 then '较熟悉'
      else '不太熟悉'
    end
  ) stored,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  uploader_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  song_id uuid references public.songs (id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists songs_status_idx on public.songs (status);
create index if not exists songs_tags_idx on public.songs using gin (tags);
create index if not exists songs_category_idx on public.songs (category);
create index if not exists songs_content_nature_idx on public.songs (content_nature);
create index if not exists songs_tempo_idx on public.songs (tempo);
create index if not exists songs_era_idx on public.songs (era);
create index if not exists songs_familiarity_idx on public.songs (familiarity);
create index if not exists songs_created_idx on public.songs (created_at desc);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists comments_song_idx on public.comments (song_id, created_at);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.resolve_login_email(p_login text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_login text := lower(trim(p_login));
begin
  if v_login = '' then
    return null;
  end if;

  select u.email into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = v_login
  limit 1;
  if v_email is not null then
    return v_email;
  end if;

  select u.email into v_email
  from auth.users u
  where lower(u.email) = v_login
  limit 1;

  return v_email;
end;
$$;

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

create or replace function public.username_taken(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(p_username))
      and length(trim(p_username)) > 0
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'user'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists songs_updated_at on public.songs;
create trigger songs_updated_at
  before update on public.songs
  for each row execute function public.set_updated_at();

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception '不能自行修改角色，请在 SQL Editor 中由管理员设置';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

create or replace function public.notify_on_song_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, song_id)
  select
    p.id,
    'review_needed',
    '待审核歌曲',
    format('%s 上传了《%s》— %s，请审核。', (select username from public.profiles where id = new.uploader_id), new.title, new.artist),
    new.id
  from public.profiles p
  where p.role = 'admin';
  return new;
end;
$$;

drop trigger if exists on_song_inserted on public.songs;
create trigger on_song_inserted
  after insert on public.songs
  for each row execute function public.notify_on_song_insert();

create or replace function public.notify_on_song_reviewed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if new.status = 'approved' then
    insert into public.notifications (user_id, type, title, body, song_id)
    select
      p.id,
      'song_published',
      '新歌入库',
      format('《%s》— %s 已通过审核，现已加入曲库。', new.title, new.artist),
      new.id
    from public.profiles p;
  elsif new.status = 'rejected' then
    insert into public.notifications (user_id, type, title, body, song_id)
    values (
      new.uploader_id,
      'song_rejected',
      '歌曲未通过审核',
      format('《%s》未通过审核。%s', new.title, coalesce(new.review_note, '')),
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_song_reviewed on public.songs;
create trigger on_song_reviewed
  after update of status on public.songs
  for each row execute function public.notify_on_song_reviewed();

alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.notifications enable row level security;
alter table public.comments enable row level security;

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "songs select" on public.songs;
create policy "songs select" on public.songs
  for select to authenticated
  using (
    status = 'approved'
    or uploader_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "songs insert" on public.songs;
create policy "songs insert" on public.songs
  for insert to authenticated
  with check (uploader_id = auth.uid() and status = 'pending');

drop policy if exists "songs update own pending" on public.songs;
create policy "songs update own pending" on public.songs
  for update to authenticated
  using (uploader_id = auth.uid() and status = 'pending')
  with check (uploader_id = auth.uid() and status = 'pending');

drop policy if exists "songs admin update" on public.songs;
create policy "songs admin update" on public.songs
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "songs admin delete approved" on public.songs;
create policy "songs admin delete approved" on public.songs
  for delete to authenticated
  using (public.is_admin() and status = 'approved');

drop policy if exists "notifications select own" on public.notifications;
create policy "notifications select own" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

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

-- Table privileges (required on newer Supabase projects; RLS still limits rows)
grant usage on schema public to anon, authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.songs to authenticated;
grant select, update on table public.notifications to authenticated;
grant select, insert, delete on table public.comments to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
grant execute on function public.username_taken(text) to anon, authenticated;

-- Realtime
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.songs;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.comments;
exception
  when duplicate_object then null;
end $$;

-- Promote admins after they register (repeat for each username; multiple admins allowed):
-- update public.profiles
-- set role = 'admin'
-- where lower(username) = lower('目标用户名');
