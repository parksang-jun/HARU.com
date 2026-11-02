-- v0.2: 국내·해외 여행지 + 항공권·호텔 검색
-- 적용: supabase db push (또는 SQL Editor 에 붙여넣기)

-- 제휴 클릭 종류 (일정 액티비티 / 항공권 / 호텔)
alter table public.affiliate_clicks add column if not exists kind text not null default 'activity';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'affiliate_clicks_kind_check') then
    alter table public.affiliate_clicks add constraint affiliate_clicks_kind_check check (kind in ('activity', 'flight', 'hotel'));
  end if;
end $$;
create index if not exists affiliate_clicks_kind_idx on public.affiliate_clicks (kind, created_at desc);

-- 항공권·호텔 검색 일일 사용량 (외부 API 비용·남용 방지)
alter table public.usage_daily add column if not exists searches integer not null default 0;

create or replace function public.increment_usage(p_user_id uuid, p_kind text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v integer;
begin
  if p_kind = 'itinerary' then
    insert into public.usage_daily (user_id, day, itineraries) values (p_user_id, current_date, 1)
    on conflict (user_id, day) do update set itineraries = usage_daily.itineraries + 1
    returning itineraries into v;
  elsif p_kind = 'search' then
    insert into public.usage_daily (user_id, day, searches) values (p_user_id, current_date, 1)
    on conflict (user_id, day) do update set searches = usage_daily.searches + 1
    returning searches into v;
  else
    insert into public.usage_daily (user_id, day, chats) values (p_user_id, current_date, 1)
    on conflict (user_id, day) do update set chats = usage_daily.chats + 1
    returning chats into v;
  end if;
  return v;
end;
$$;

-- 관리자: 종류·파트너별 제휴 클릭
create or replace function public.affiliate_stats_by_kind()
returns table (kind text, partner text, clicks bigint)
language sql
security definer
set search_path = public
as $$
  select kind, partner, count(*) from public.affiliate_clicks
  where public.is_admin()
  group by kind, partner order by count(*) desc;
$$;
