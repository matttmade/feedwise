-- Feedwise initial schema. Mirrors the data model in PLAN.md exactly; proposed changes are
-- flagged in DECISIONS.md and wait for Matt's sign-off.

create extension if not exists pgcrypto;

-- Types ---------------------------------------------------------------------

create type item_type as enum ('article', 'video', 'image_set');
create type user_item_state as enum ('new', 'skipped', 'kept', 'read');
create type review_rating as enum ('again', 'hard', 'good');
create type motion_pref as enum ('off', 'reduced', 'full');

-- Tables --------------------------------------------------------------------

create table topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text,
  icon text
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  site_url text not null,
  feed_url text not null,
  feed_type text not null check (feed_type in ('rss', 'atom', 'json', 'rdf')),
  title text,
  icon_url text,
  topic_ids uuid[] not null default '{}',
  muted boolean not null default false,
  last_fetched_at timestamptz,
  last_status text,
  last_error text,
  unique (user_id, feed_url)
);

create table items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources (id) on delete cascade,
  guid text not null,
  url text not null,
  title text not null,
  summary text,
  type item_type not null default 'article',
  lead_image_url text,
  media jsonb not null default '[]',
  embed_html text,
  body_html text,
  read_minutes integer,
  duration_seconds integer,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source_id, guid)
);
create index items_source_published_idx on items (source_id, published_at desc);

create table user_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references items (id) on delete cascade,
  state user_item_state not null default 'new',
  resume_position real,
  last_opened_at timestamptz,
  kept_at timestamptz,
  primary key (user_id, item_id)
);

create table highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references items (id) on delete cascade,
  text text,
  image_url text,
  note text,
  created_at timestamptz not null default now()
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  highlight_id uuid not null references highlights (id) on delete cascade,
  prompt text not null,
  answer text not null,
  -- ts-fsrs card: due, stability, difficulty, reps, lapses, state
  fsrs jsonb not null,
  last_review_at timestamptz
);
create index cards_user_due_idx on cards (user_id, ((fsrs ->> 'due')));

create table reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards (id) on delete cascade,
  rating review_rating not null,
  reviewed_at timestamptz not null default now()
);

create table settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  density text not null default 'comfortable',
  motion motion_pref not null default 'reduced',
  autoplay boolean not null default false,
  captions boolean not null default true,
  text_size text not null default 'md',
  daily_goal integer not null default 5,
  review_cap integer not null default 10,
  calm_mode boolean not null default false
);

create table activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  items_read integer not null default 0,
  cards_reviewed integer not null default 0,
  primary key (user_id, day)
);

-- Row-level security ----------------------------------------------------------
-- Every user table: user_id = auth.uid(). Tables without user_id inherit from their parent.

alter table topics enable row level security;
alter table sources enable row level security;
alter table items enable row level security;
alter table user_items enable row level security;
alter table highlights enable row level security;
alter table cards enable row level security;
alter table reviews enable row level security;
alter table settings enable row level security;
alter table activity enable row level security;

create policy own_topics on topics for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_sources on sources for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_user_items on user_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_highlights on highlights for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_cards on cards for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_settings on settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_activity on activity for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Items are written by the cron job (service role, bypasses RLS); users only read
-- items from their own sources.
create policy read_own_items on items for select
  using (exists (select 1 from sources s where s.id = items.source_id and s.user_id = auth.uid()));

create policy own_reviews on reviews for all
  using (exists (select 1 from cards c where c.id = reviews.card_id and c.user_id = auth.uid()))
  with check (exists (select 1 from cards c where c.id = reviews.card_id and c.user_id = auth.uid()));
