-- Get-Together — Supabase schema
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Then: Authentication → Sign In / Providers → enable "Anonymous sign-ins".

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  nickname text not null,
  color text not null,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

-- A person's work schedule belongs to THEM, not to a calendar: it follows them into
-- every calendar they join, so they only ever set it up once.
create table if not exists schedules (
  user_id uuid primary key default auth.uid(),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Same for one-off day edits ("busy this Saturday").
create table if not exists day_overrides (
  user_id uuid not null default auth.uid(),
  date date not null,
  mask integer not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create index if not exists members_group_idx on members(group_id);
create index if not exists members_user_idx on members(user_id);

-- ---------- helpers ----------
create or replace function is_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where group_id = gid and user_id = auth.uid());
$$;

-- True when `uid` shares at least one calendar with the caller (or is the caller).
create or replace function shares_group(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select uid = auth.uid() or exists (
    select 1 from members a join members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = uid
  );
$$;

-- Random 6-char invite code without confusable characters.
create or replace function gen_code() returns text
language plpgsql as $$
declare chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; out text := ''; i int;
begin
  for i in 1..6 loop out := out || substr(chars, 1 + floor(random() * length(chars))::int, 1); end loop;
  return out;
end $$;

-- ---------- RPCs (called by the app) ----------
-- Create a group and join it in one step.
create or replace function create_group(p_name text, p_nickname text, p_color text)
returns groups language plpgsql security definer set search_path = public as $$
declare g groups; c text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  loop
    c := gen_code();
    exit when not exists (select 1 from groups where code = c);
  end loop;
  insert into groups (code, name, created_by) values (c, p_name, auth.uid()) returning * into g;
  insert into members (group_id, user_id, nickname, color) values (g.id, auth.uid(), p_nickname, p_color);
  return g;
end $$;

-- Join by invite code. Enforces the 20-person cap.
create or replace function join_group(p_code text, p_nickname text, p_color text)
returns groups language plpgsql security definer set search_path = public as $$
declare g groups; n int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into g from groups where code = upper(trim(p_code));
  if g.id is null then raise exception 'No calendar with that code'; end if;
  if exists (select 1 from members where group_id = g.id and user_id = auth.uid()) then return g; end if;
  select count(*) into n from members where group_id = g.id;
  if n >= 20 then raise exception 'This calendar is full (20 people)'; end if;
  insert into members (group_id, user_id, nickname, color) values (g.id, auth.uid(), p_nickname, p_color);
  return g;
end $$;

-- ---------- row level security ----------
alter table groups enable row level security;
alter table members enable row level security;
alter table schedules enable row level security;
alter table day_overrides enable row level security;

drop policy if exists groups_select on groups;
create policy groups_select on groups for select using (is_member(id));
drop policy if exists groups_update on groups;
create policy groups_update on groups for update using (created_by = auth.uid());

drop policy if exists members_select on members;
create policy members_select on members for select using (is_member(group_id));
drop policy if exists members_update on members;
create policy members_update on members for update using (user_id = auth.uid());
drop policy if exists members_delete on members;
create policy members_delete on members for delete
  using (user_id = auth.uid() or exists (select 1 from groups where id = group_id and created_by = auth.uid()));

drop policy if exists schedules_select on schedules;
create policy schedules_select on schedules for select using (shares_group(user_id));
drop policy if exists schedules_write on schedules;
create policy schedules_write on schedules for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists overrides_select on day_overrides;
create policy overrides_select on day_overrides for select using (shares_group(user_id));
drop policy if exists overrides_write on day_overrides;
create policy overrides_write on day_overrides for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- realtime ----------
do $$ begin
  alter publication supabase_realtime add table members;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table schedules;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table day_overrides;
exception when duplicate_object then null; end $$;
