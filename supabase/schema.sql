-- Students table. RLS intentionally not enabled: only the server-side
-- service role key ever touches this table; no client access exists.
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min int not null default 2,
  max int not null default 12,
  levels jsonb not null default '{}'::jsonb,
  weak jsonb not null default '{}'::jsonb,
  "weakDiv" jsonb not null default '{}'::jsonb,
  unlocked int not null default 1,
  allowed jsonb
);
