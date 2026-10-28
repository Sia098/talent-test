-- ============================================================
-- 天赋测试 · Supabase 后端
-- 在 Supabase 控制台 → SQL Editor 中一次性粘贴运行本文件即可。
-- 作用：建表 + 校验函数 + 导入现有密码及已用次数。
-- ============================================================

-- 1) 密码表：code 主键，max_uses 上限，used 已用次数
create table if not exists public.passwords (
  code      text primary key,
  max_uses  integer not null default 3,
  used      integer not null default 0
);

-- 2) 开启行级安全，但不给 anon 任何直读策略
--    → 匿名用户无法直接 SELECT 密码列表，只能通过下面的 RPC 间接校验
alter table public.passwords enable row level security;

-- 3) 原子校验 + 扣减函数（SECURITY DEFINER 以拥有者权限绕过 RLS 读表）
create or replace function public.verify_password(p_code text)
returns json
language plpgsql
security definer
as $$
declare
  v_max  integer;
  v_used integer;
  v_new  integer;
begin
  -- 取上限与已用
  select max_uses, used into v_max, v_used
  from public.passwords where code = p_code;

  if v_max is null then
    return json_build_object('ok', false, 'reason', 'invalid');
  end if;

  if v_used >= v_max then
    return json_build_object('ok', false, 'reason', 'exhausted', 'remaining', 0);
  end if;

  -- 原子 +1，且仅在未超上限时生效（防止并发多扣）
  update public.passwords
     set used = used + 1
   where code = p_code and used < v_max
  returning used into v_new;

  if v_new is null then
    return json_build_object('ok', false, 'reason', 'exhausted', 'remaining', 0);
  end if;

  return json_build_object(
    'ok', true,
    'remaining', v_max - v_new,
    'used', v_new,
    'max', v_max
  );
end;
$$;

-- 4) 允许匿名（浏览器）调用该函数，但不要直读表
grant execute on function public.verify_password(text) to anon, authenticated;

-- 5) 导入现有密码（与本地 config/passwords.json + usage.json 一致）
--    若 code 已存在则跳过（ON CONFLICT DO NOTHING），可反复运行
insert into public.passwords (code, max_uses, used) values
  ('1156', 3, 0),
  ('1179', 3, 0),
  ('1415', 3, 0),
  ('1964', 3, 0),
  ('1977', 3, 0),
  ('2099', 3, 0),
  ('2573', 3, 0),
  ('2615', 3, 0),
  ('2638', 3, 0),
  ('2724', 3, 0),
  ('2913', 3, 0),
  ('3031', 3, 0),
  ('3123', 3, 0),
  ('3530', 3, 0),
  ('4253', 3, 0),
  ('4357', 3, 0),
  ('4363', 3, 0),
  ('4809', 3, 0),
  ('4963', 3, 0),
  ('5237', 3, 0),
  ('5763', 3, 0),
  ('5787', 3, 0),
  ('5827', 3, 0),
  ('6010', 3, 0),
  ('6166', 3, 0),
  ('6721', 3, 0),
  ('7075', 3, 0),
  ('7583', 3, 0),
  ('7603', 3, 0),
  ('7661', 3, 0),
  ('7734', 3, 0),
  ('7914', 3, 0),
  ('8373', 3, 0),
  ('8412', 3, 0),
  ('8570', 3, 0),
  ('8763', 3, 0),
  ('8844', 3, 0),
  ('9028', 3, 0),
  ('9032', 3, 0),
  ('9105', 3, 0),
  ('9281', 3, 0),
  ('9338', 3, 0),
  ('9373', 3, 0),
  ('9435', 3, 0),
  ('9603', 3, 0),
  ('9817', 3, 0),
  ('9928', 3, 0),
  ('talent001', 3, 3),
  ('talent002', 3, 2),
  ('talent888', 3, 0),
  ('0628', 3, 0),
  ('0249', 3, 0),
  ('0324', 3, 0)
on conflict (code) do nothing;
