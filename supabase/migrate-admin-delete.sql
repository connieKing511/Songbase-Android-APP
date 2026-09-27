-- 管理员删除已入库歌曲：在 SQL Editor 执行

grant select, insert, update, delete on table public.songs to authenticated;

drop policy if exists "songs admin delete approved" on public.songs;
create policy "songs admin delete approved" on public.songs
  for delete to authenticated
  using (public.is_admin() and status = 'approved');
