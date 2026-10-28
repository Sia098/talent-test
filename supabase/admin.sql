-- ============================================================
--  天赋测试 · 密码管理后台 SQL
--  在 Supabase 控制台 → SQL Editor 中「New query」粘贴本文件全部内容 → Run
--  作用：创建管理员密码表 + 4 个受保护的后台函数（查列表/重置单个/重置全部/新增）
--  安全：管理员密码只以 bcrypt 哈希存储；前端只拿 anon key，拿不到明文，也读不到密码表
-- ============================================================

-- 1) 启用 pgcrypto（提供 crypt / gen_salt 哈希）
create extension if not exists pgcrypto;

-- 2) 管理员密码表（仅存哈希，不存明文）
create table if not exists public.admin_config (
  id         int primary key default 1,
  pw_hash    text not null,
  updated_at timestamptz default now()
);

-- 3) 初始化管理员密码（⚠️ 把下面 'CHANGE_ME_Admin_Password' 换成你自己的强密码）
--    注：本项目部署时已用随机强密码初始化，无需再跑这段；此处仅供「全新环境重建」时使用。
insert into public.admin_config (id, pw_hash)
values (1, crypt('CHANGE_ME_Admin_Password', gen_salt('bf')))
on conflict (id) do nothing;

-- 4) 通用：校验管理员密码，返回是否通过
create or replace function public._admin_ok(p_admin text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare v_ok boolean;
begin
  select (crypt(p_admin, pw_hash) = pw_hash) into v_ok from public.admin_config where id = 1;
  return coalesce(v_ok, false);
end;
$$;
grant execute on function public._admin_ok(text) to anon;

-- 5) 列出所有密码（含剩余次数）—— 需管理员密码
create or replace function public.admin_list(p_admin text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public._admin_ok(p_admin) then
    return json_build_object('ok', false, 'reason', 'bad_admin');
  end if;
  return json_build_object('ok', true, 'rows', (
    select coalesce(json_agg(r order by r.code), '[]'::json)
    from (
      select code, used, max_uses, (max_uses - used) as remaining
      from public.passwords
    ) r
  ));
end;
$$;
grant execute on function public.admin_list(text) to anon;

-- 6) 重置单个密码（used=0）—— 需管理员密码
create or replace function public.admin_reset_one(p_admin text, p_code text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public._admin_ok(p_admin) then
    return json_build_object('ok', false, 'reason', 'bad_admin');
  end if;
  update public.passwords set used = 0 where code = p_code;
  return json_build_object('ok', true);
end;
$$;
grant execute on function public.admin_reset_one(text, text) to anon;

-- 7) 重置全部密码（used=0）—— 需管理员密码
create or replace function public.admin_reset_all(p_admin text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public._admin_ok(p_admin) then
    return json_build_object('ok', false, 'reason', 'bad_admin');
  end if;
  update public.passwords set used = 0;
  return json_build_object('ok', true);
end;
$$;
grant execute on function public.admin_reset_all(text) to anon;

-- 8) 新增密码 —— 需管理员密码
create or replace function public.admin_add(p_admin text, p_code text, p_max int default 3)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public._admin_ok(p_admin) then
    return json_build_object('ok', false, 'reason', 'bad_admin');
  end if;
  insert into public.passwords (code, max_uses, used)
  values (p_code, coalesce(p_max, 3), 0)
  on conflict (code) do nothing;
  return json_build_object('ok', true);
end;
$$;
grant execute on function public.admin_add(text, text, int) to anon;
