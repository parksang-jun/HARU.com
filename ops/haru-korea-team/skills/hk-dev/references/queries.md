# 운영 쿼리 (Supabase SQL Editor, 주간 기준)

```sql
-- 주간 깔때기
with w as (select now() - interval '7 days' as since)
select
  (select count(*) from trips, w where trips.created_at >= w.since) as trips_created,
  (select count(*) from itineraries, w where itineraries.created_at >= w.since) as itineraries,
  (select count(distinct user_id) from itineraries, w where itineraries.created_at >= w.since) as users_with_itinerary,
  (select count(*) from affiliate_clicks, w where affiliate_clicks.created_at >= w.since) as book_clicks,
  (select count(*) from ad_events, w where event = 'impression' and ad_events.created_at >= w.since) as coupon_impressions,
  (select count(*) from ad_events, w where event = 'click' and ad_events.created_at >= w.since) as coupon_clicks;

-- 파트너별 클릭
select partner, count(*) clicks, count(distinct user_id) users
from affiliate_clicks where created_at >= now() - interval '7 days'
group by partner order by clicks desc;

-- 쿠폰별 성과(광고주 리포트용)
select c.id, c.merchant, c.area,
  sum(case when e.event='impression' then 1 else 0 end) impressions,
  sum(case when e.event='click' then 1 else 0 end) clicks
from coupons c left join ad_events e on e.coupon_id = c.id and e.created_at >= now() - interval '30 days'
group by c.id, c.merchant, c.area order by impressions desc;

-- 사용 한도 상위(어뷰징 점검)
select user_id, sum(itineraries) itineraries, sum(chats) chats from usage_daily
where day >= current_date - 7 group by user_id order by itineraries desc, chats desc limit 20;

-- 일정 생성 완료율(설정 → 일정)
select date_trunc('day', t.created_at) d,
  count(*) trips, count(i.trip_id) with_itinerary,
  round(100.0 * count(i.trip_id) / nullif(count(*),0), 1) pct
from trips t left join itineraries i on i.trip_id = t.id
where t.created_at >= now() - interval '14 days' group by 1 order by 1;
```

비용 추정: Anthropic 콘솔 사용량(입·출력 토큰) ÷ 주간 일정·챗 호출 수 → 세션당 비용. 모델별 단가는 `hk-ai` 가 관리.
