-- 여행자 톡 — 같은 여행지를 가는(간) 여행자끼리 짧은 글로 현지 소식을 나눈다
-- 익명 로그인 사용자만 쓰고 읽는다. 글은 300자 이하, 링크·연락처는 앱에서 막는다.

create table if not exists public.talk_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  city text not null check (city ~ '^[a-z]{2,24}$'),
  tag text not null check (tag in ('weather', 'food', 'transit', 'tip', 'question')),
  body text not null check (char_length(body) between 2 and 300),
  nickname text not null check (char_length(nickname) between 2 and 20),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists talk_posts_city_idx on public.talk_posts (city, created_at desc);

create table if not exists public.talk_reports (
  post_id uuid not null references public.talk_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  reason text not null default '' check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.talk_posts enable row level security;
alter table public.talk_reports enable row level security;

-- 읽기: 로그인(익명 포함) 사용자는 숨김 처리되지 않은 글을 본다
create policy "talk read" on public.talk_posts for select to authenticated using (hidden = false);
-- 쓰기: 자기 글만, 1분에 3건까지
create policy "talk insert own" on public.talk_posts for insert to authenticated
  with check (
    user_id = auth.uid()
    and (select count(*) from public.talk_posts p where p.user_id = auth.uid() and p.created_at > now() - interval '1 minute') < 3
  );
create policy "talk delete own" on public.talk_posts for delete to authenticated using (user_id = auth.uid());

-- 신고: 한 글에 한 번. 신고 내용은 관리자만 본다(여기서는 select 정책을 두지 않는다)
create policy "talk report" on public.talk_reports for insert to authenticated with check (user_id = auth.uid());

-- 서로 다른 사람 3명이 신고하면 글을 자동으로 숨긴다 (관리자가 확인 후 복구·삭제)
create or replace function public.talk_auto_hide() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.talk_reports r where r.post_id = new.post_id) >= 3 then
    update public.talk_posts set hidden = true where id = new.post_id;
  end if;
  return new;
end $$;
drop trigger if exists talk_reports_auto_hide on public.talk_reports;
create trigger talk_reports_auto_hide after insert on public.talk_reports
  for each row execute function public.talk_auto_hide();
