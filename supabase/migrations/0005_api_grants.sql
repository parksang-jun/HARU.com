-- Data API 권한 — 2026-05-30 이후 만든 Supabase 프로젝트는 public 테이블·함수를 자동으로 공개하지 않는다.
-- 앱(supabase-js)이 쓰는 테이블에만 명시적으로 권한을 준다. 행 단위 접근은 기존 RLS 정책이 그대로 막는다.
-- (익명 로그인 사용자도 역할은 authenticated 이다)

grant usage on schema public to anon, authenticated, service_role;

-- 본인 데이터
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.trips, public.itineraries, public.chat_messages to authenticated;

-- 공개 읽기(활성 항목만 — RLS), 쓰기는 관리자만(RLS)
grant select on public.places, public.coupons to anon, authenticated;
grant insert, update, delete on public.places, public.coupons to authenticated;

-- 수익 기록: 쓰기는 로그인 사용자, 읽기는 관리자만(RLS)
grant insert, select on public.affiliate_clicks, public.ad_events, public.sponsor_events to authenticated;

-- 여행자 톡
grant select, insert, delete on public.talk_posts to authenticated;
grant insert on public.talk_reports to authenticated;

-- 스폰서 칸: 읽기는 켜진 광고만, 관리는 관리자만(RLS)
grant select, insert, update, delete on public.sponsor_slots to authenticated;

-- 서버 함수(service role)는 전체 접근 — 일일 사용량(usage_daily)은 클라이언트에 권한을 주지 않는다
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- 함수
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on all functions in schema public to service_role;
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('coupon_stats', 'affiliate_stats', 'affiliate_stats_by_kind')
  loop
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
