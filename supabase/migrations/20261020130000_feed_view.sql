-- Read-side convenience: each item with its source and the caller's own state.
-- security_invoker makes the view run with the caller's RLS, so users only see their items
-- and their own user_items rows. No table changes shape.
create view feed_items with (security_invoker = true) as
select
  i.id,
  i.source_id,
  i.url,
  i.title,
  i.summary,
  i.type,
  i.lead_image_url,
  i.lead_image_width,
  i.lead_image_height,
  i.read_minutes,
  i.duration_seconds,
  i.published_at,
  i.created_at,
  coalesce(least(i.published_at, i.created_at), i.created_at) as sort_at,
  s.title as source_title,
  s.site_url as source_site_url,
  s.topic_ids,
  s.muted,
  ui.state,
  ui.resume_position,
  ui.last_opened_at,
  ui.kept_at
from items i
join sources s on s.id = i.source_id
left join user_items ui on ui.item_id = i.id and ui.user_id = auth.uid();

grant select on feed_items to authenticated;

create index user_items_user_opened_idx on user_items (user_id, last_opened_at desc);
