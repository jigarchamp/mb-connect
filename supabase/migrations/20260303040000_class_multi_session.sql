-- Support multi-session classes (e.g. a badge taught over 4 weekly meetings).
-- end_date: the date of the last session (null = single-session class).
-- sessions_count: how many sessions the class runs (null = unspecified).

alter table classes
  add column end_date      date,
  add column sessions_count integer check (sessions_count > 0);
