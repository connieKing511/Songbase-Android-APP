-- 用户名注册 + 登录解析。在 SQL Editor 执行一次。

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

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

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

revoke all on function public.username_taken(text) from public;
grant execute on function public.username_taken(text) to anon, authenticated;
