-- Topic expansion: division weak pool, progression counter, teacher topic filter.
-- unlocked defaults to 5 (everything through mulFacts) for existing rows so
-- students mid-way through the multiplication game keep access; new rows are
-- created by the app with unlocked = 1.
alter table students
  add column if not exists "weakDiv" jsonb not null default '{}'::jsonb,
  add column if not exists unlocked int not null default 5,
  add column if not exists allowed jsonb;
