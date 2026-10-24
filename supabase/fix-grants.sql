-- 上传时报 permission denied for table songs 时，在 SQL Editor 执行本文件即可

grant usage on schema public to anon, authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.songs to authenticated;
grant select, update on table public.notifications to authenticated;
grant select, insert, delete on table public.comments to authenticated;
grant execute on function public.is_admin() to authenticated;
