-- Haru Korea 초기 스키마 + RLS
-- 적용: supabase db push (또는 SQL Editor 에 붙여넣기)

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  locale text,
  created_at timestamptz not null default now()
);

-- 신규 사용자(익명 포함) 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 관리자 판정 (RLS 정책에서 사용)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- trips / itineraries / chat ----------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  params jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trips_user_idx on public.trips (user_id, updated_at desc);

create table if not exists public.itineraries (
  trip_id uuid primary key references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 4000),
  created_at timestamptz not null default now()
);
create index if not exists chat_trip_idx on public.chat_messages (trip_id, created_at);

-- ---------- places (큐레이션 시드, 공개 읽기) ----------
create table if not exists public.places (
  id text primary key,
  city text not null,
  category text not null,
  name_ko text not null,
  name_en text not null,
  name_ja text,
  name_zh text,
  area text,
  lat double precision not null,
  lng double precision not null,
  tip text,
  transit text,
  booking_partner text,
  active boolean not null default true
);

-- ---------- coupons (스폰서 혜택) ----------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  merchant text not null,
  title_en text not null,
  title_ko text,
  title_ja text,
  title_zh text,
  discount text not null,
  city text not null,
  area text not null default '',
  category text not null,
  valid_from date,
  valid_to date,
  image_url text,
  link text not null,
  sponsored boolean not null default false,
  weight integer not null default 1,
  lat double precision,
  lng double precision,
  active boolean not null default true,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists coupons_city_idx on public.coupons (city, active);

-- ---------- 수익 이벤트 ----------
create table if not exists public.affiliate_clicks (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  partner text not null,
  trip_id uuid,
  stop_id text,
  query text,
  url text not null,
  locale text,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_clicks_partner_idx on public.affiliate_clicks (partner, created_at desc);

create table if not exists public.ad_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  event text not null check (event in ('impression', 'click')),
  placement text not null,
  trip_id uuid,
  locale text,
  created_at timestamptz not null default now()
);
create index if not exists ad_events_coupon_idx on public.ad_events (coupon_id, event);

-- ---------- 일일 사용량 (Edge Function 전용, 클라이언트 접근 불가) ----------
create table if not exists public.usage_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  itineraries integer not null default 0,
  chats integer not null default 0,
  primary key (user_id, day)
);

-- 사용량 증가 후 현재 카운트 반환 (service role 이 호출)
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
  else
    insert into public.usage_daily (user_id, day, chats) values (p_user_id, current_date, 1)
    on conflict (user_id, day) do update set chats = usage_daily.chats + 1
    returning chats into v;
  end if;
  return v;
end;
$$;

-- ---------- 관리자 통계 RPC ----------
create or replace function public.coupon_stats()
returns table (coupon_id uuid, impressions bigint, clicks bigint)
language sql
security definer
set search_path = public
as $$
  select c.id,
         count(e.id) filter (where e.event = 'impression'),
         count(e.id) filter (where e.event = 'click')
  from public.coupons c
  left join public.ad_events e on e.coupon_id = c.id
  where public.is_admin()
  group by c.id;
$$;

create or replace function public.affiliate_stats()
returns table (partner text, clicks bigint)
language sql
security definer
set search_path = public
as $$
  select partner, count(*) from public.affiliate_clicks
  where public.is_admin()
  group by partner order by count(*) desc;
$$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.itineraries enable row level security;
alter table public.chat_messages enable row level security;
alter table public.places enable row level security;
alter table public.coupons enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.ad_events enable row level security;
alter table public.usage_daily enable row level security;

-- profiles: 본인 읽기, role 은 본인이 수정 불가 (관리자 지정은 SQL 로)
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (id = auth.uid());

-- trips: 본인 CRUD
drop policy if exists trips_own on public.trips;
create policy trips_own on public.trips for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- itineraries: 본인 CRUD
drop policy if exists itineraries_own on public.itineraries;
create policy itineraries_own on public.itineraries for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- chat_messages: 본인 읽기/쓰기
drop policy if exists chat_own on public.chat_messages;
create policy chat_own on public.chat_messages for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- places: 공개 읽기, 관리자 쓰기
drop policy if exists places_read on public.places;
create policy places_read on public.places for select using (active or public.is_admin());
drop policy if exists places_admin on public.places;
create policy places_admin on public.places for all using (public.is_admin()) with check (public.is_admin());

-- coupons: 활성 쿠폰 공개 읽기(비로그인 포함), 관리자 전체 읽기/쓰기
drop policy if exists coupons_read on public.coupons;
create policy coupons_read on public.coupons for select using (active or public.is_admin());
drop policy if exists coupons_admin on public.coupons;
create policy coupons_admin on public.coupons for all using (public.is_admin()) with check (public.is_admin());

-- affiliate_clicks / ad_events: 로그인 사용자는 본인 명의 insert 만, 읽기는 관리자
drop policy if exists aff_insert on public.affiliate_clicks;
create policy aff_insert on public.affiliate_clicks for insert with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()));
drop policy if exists aff_admin_read on public.affiliate_clicks;
create policy aff_admin_read on public.affiliate_clicks for select using (public.is_admin());

drop policy if exists ad_insert on public.ad_events;
create policy ad_insert on public.ad_events for insert with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()));
drop policy if exists ad_admin_read on public.ad_events;
create policy ad_admin_read on public.ad_events for select using (public.is_admin());

-- usage_daily: 정책 없음 → service role 만 접근
