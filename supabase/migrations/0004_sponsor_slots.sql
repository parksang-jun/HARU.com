-- 스폰서 칸 — 준비 단계·도구 화면의 여행지 맞춤 광고 자리
create table if not exists public.sponsor_slots (
  id uuid primary key default gen_random_uuid(),
  slot text not null check (slot in ('essentials', 'gear', 'packing', 'airport')),
  advertiser text not null check (char_length(advertiser) between 1 and 60),
  title text not null check (char_length(title) between 1 and 80),
  body text not null default '' check (char_length(body) <= 160),
  cta text not null default '' check (char_length(cta) <= 30),
  link text not null check (link ~ '^https://'),
  countries text[] not null default '{}',   -- 비어 있으면 모든 여행지
  locale text not null default 'all',       -- ko / en / ja / zh-TW / all
  active boolean not null default false,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now()
);

create table if not exists public.sponsor_events (
  id bigint generated always as identity primary key,
  sponsor_id uuid not null references public.sponsor_slots (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null default auth.uid(),
  event text not null check (event in ('impression', 'click')),
  trip_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists sponsor_events_idx on public.sponsor_events (sponsor_id, event);

alter table public.sponsor_slots enable row level security;
alter table public.sponsor_events enable row level security;

-- 읽기: 켜져 있고 기간 안인 광고만
create policy "sponsor read active" on public.sponsor_slots for select to authenticated
  using (active and (starts_on is null or starts_on <= current_date) and (ends_on is null or ends_on >= current_date));
-- 관리: 관리자만
create policy "sponsor admin" on public.sponsor_slots for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- 기록: 누구나 쓰고, 관리자만 읽는다
create policy "sponsor event insert" on public.sponsor_events for insert to authenticated with check (user_id = auth.uid());
create policy "sponsor event admin read" on public.sponsor_events for select to authenticated using (public.is_admin());
