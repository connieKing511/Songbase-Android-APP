-- 已有数据库请执行本文件（SQL Editor）。新项目执行 schema.sql 即可，不必再跑一遍。

alter table public.songs add column if not exists content_nature text;
alter table public.songs add column if not exists tempo text;
alter table public.songs add column if not exists era text;
alter table public.songs add column if not exists times_led integer not null default 0;

alter table public.songs drop constraint if exists songs_content_nature_check;
alter table public.songs add constraint songs_content_nature_check
  check (content_nature is null or content_nature in ('敬拜赞美', '救恩&感恩', '回应'));

alter table public.songs drop constraint if exists songs_tempo_check;
alter table public.songs add constraint songs_tempo_check
  check (tempo is null or tempo in ('慢速', '中速', '快速'));

alter table public.songs drop constraint if exists songs_era_check;
alter table public.songs add constraint songs_era_check
  check (era is null or era in ('传统诗歌', '现代诗歌'));

alter table public.songs drop constraint if exists songs_times_led_check;
alter table public.songs add constraint songs_times_led_check
  check (times_led >= 0);

alter table public.songs drop column if exists familiarity;
alter table public.songs
  add column familiarity text generated always as (
    case
      when times_led > 30 then '熟悉'
      when times_led >= 16 then '较熟悉'
      else '不太熟悉'
    end
  ) stored;

create index if not exists songs_content_nature_idx on public.songs (content_nature);
create index if not exists songs_tempo_idx on public.songs (tempo);
create index if not exists songs_era_idx on public.songs (era);
create index if not exists songs_familiarity_idx on public.songs (familiarity);
