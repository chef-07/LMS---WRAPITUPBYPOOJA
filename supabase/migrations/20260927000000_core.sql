-- Wrap It Up University: core schema (Phase 1–3).
-- People, invites, schools/courses/modules/lessons (YouTube), progress,
-- the XP event stream, notes, live sessions and announcements.
-- Row-level security is on for every table; writes that carry rules
-- (progress, completion, duration) go through security-definer functions.

create extension if not exists citext;

create type public.user_role as enum ('admin', 'trainer', 'member');
create type public.department as enum ('artisan', 'sales', 'social', 'ops');
create type public.completion_mode as enum ('watch', 'manual');
create type public.course_level as enum ('Trainee', 'Associate', 'Senior', 'Master');
create type public.school_tone as enum ('tangerine', 'turquoise', 'sunshine', 'violet', 'sky', 'pink');

-- ── People ────────────────────────────────────────────────────────────────

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext not null unique,
  full_name text not null default '',
  avatar_url text,
  role public.user_role not null default 'member',
  department public.department,
  city text,
  is_disabled boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

-- Only invited emails can create an account. There is no public sign-up.
create table public.invites (
  email citext primary key,
  full_name text not null default '',
  role public.user_role not null default 'member',
  department public.department,
  invited_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- Role checks read the table on every call, so disabling someone takes effect
-- on their very next request.
create or replace function public.current_role_if_active()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid() and not is_disabled
$$;

create or replace function public.is_active_member() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role_if_active() is not null
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role_if_active() = 'admin'
$$;

-- Trainers review work and see the team; privilege checks name the roles
-- they allow rather than excluding members, so a new role gets nothing by default.
create or replace function public.is_faculty() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role_if_active() in ('admin', 'trainer')
$$;

-- New auth user → profile row, but only when invited. The very first account
-- becomes the admin, so Pooja can sign in before any invite exists.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv public.invites%rowtype;
  first_user boolean;
begin
  select not exists (select 1 from public.users) into first_user;
  select * into inv from public.invites where email = lower(new.email);

  if not first_user and inv.email is null then
    raise exception 'This email has not been invited to Wrap It Up University.'
      using errcode = 'P0001';
  end if;

  insert into public.users (id, email, full_name, avatar_url, role, department)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(inv.full_name, ''), new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    case when first_user then 'admin'::public.user_role else inv.role end,
    inv.department
  );

  if inv.email is not null then
    update public.invites set accepted_at = now() where email = inv.email;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Content ───────────────────────────────────────────────────────────────

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  emoji text not null default '🎁',
  tone public.school_tone not null default 'tangerine',
  blurb text not null default '',
  rank int not null default 0
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  school_id uuid not null references public.schools (id) on delete restrict,
  title text not null,
  summary text not null default '',
  level public.course_level not null default 'Trainee',
  instructor_name text not null default 'Pooja',
  cover_video_id text,
  -- Empty means "for everyone"; otherwise the departments it is assigned to.
  departments public.department[] not null default '{}',
  is_published boolean not null default false,
  rank int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  drip_days int not null default 0 check (drip_days >= 0),
  rank int not null default 0
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null,
  title text not null,
  summary text not null default '',
  video_provider text not null default 'youtube' check (video_provider = 'youtube'),
  -- The 11-character YouTube id. Upload videos as Unlisted with embedding on.
  video_id text check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  duration_seconds int not null default 0 check (duration_seconds >= 0),
  duration_source text not null default 'browser' check (duration_source in ('browser', 'admin')),
  completion_mode public.completion_mode not null default 'watch',
  min_watch_pct numeric(3, 2) not null default 0.80 check (min_watch_pct between 0 and 1),
  is_published boolean not null default true,
  rank int not null default 0,
  unique (course_id, slug)
);
create index lessons_module_idx on public.lessons (module_id, rank);

-- ── Progress ──────────────────────────────────────────────────────────────

create table public.lesson_progress (
  user_id uuid not null references public.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  position_seconds int not null default 0,
  watch_seconds int not null default 0,
  is_completed boolean not null default false,
  manually_incomplete boolean not null default false,
  first_started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index lesson_progress_course_idx on public.lesson_progress (user_id, course_id);

create table public.enrollments (
  user_id uuid not null references public.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  last_lesson_id uuid references public.lessons (id) on delete set null,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  due_on date,
  primary key (user_id, course_id)
);

-- Every XP point and learning minute comes from this stream. One-time
-- rewards (a lesson completed, a course finished) carry once = true and are
-- unique per (user, kind, subject), so re-ticking a lesson cannot farm XP.
create table public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null,
  subject_id uuid,
  xp int not null default 0,
  minutes numeric(8, 2) not null default 0,
  once boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index activity_events_once_idx on public.activity_events (user_id, kind, subject_id) where once;
create index activity_events_user_idx on public.activity_events (user_id, created_at desc);

create table public.lesson_notes (
  user_id uuid not null references public.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  body text not null default '' check (length(body) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ── Team life (dashboard rail) ────────────────────────────────────────────

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  host_name text not null default 'Pooja',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- Only released to members between start and end (see live_join_url()).
  join_url text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  is_pinned boolean not null default true,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

-- ── Row-level security ────────────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.invites enable row level security;
alter table public.schools enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.enrollments enable row level security;
alter table public.activity_events enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.live_sessions enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;

-- Team members can see each other's names (leaderboard); faculty see everything.
create policy users_read on public.users for select using (public.is_active_member());
create policy users_update_self on public.users for update using (id = auth.uid() and public.is_active_member())
  with check (id = auth.uid());
create policy users_admin_write on public.users for all using (public.is_admin()) with check (public.is_admin());

-- A member cannot promote themselves: role, department and disabled flag are admin-only.
create or replace function public.guard_user_self_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for the SQL editor and the service role, which are trusted.
  if auth.uid() is not null and not public.is_admin() and (new.role is distinct from old.role
      or new.department is distinct from old.department
      or new.is_disabled is distinct from old.is_disabled
      or new.email is distinct from old.email) then
    raise exception 'Only an admin can change role, department, email or access.';
  end if;
  return new;
end;
$$;
create trigger users_guard before update on public.users
  for each row execute function public.guard_user_self_update();

create policy invites_admin on public.invites for all using (public.is_admin()) with check (public.is_admin());

create policy schools_read on public.schools for select using (public.is_active_member());
create policy schools_admin on public.schools for all using (public.is_admin()) with check (public.is_admin());

create policy courses_read on public.courses for select using (public.is_active_member() and (is_published or public.is_faculty()));
create policy courses_admin on public.courses for all using (public.is_admin()) with check (public.is_admin());

create policy modules_read on public.modules for select using (
  public.is_active_member() and exists (select 1 from public.courses c where c.id = course_id and (c.is_published or public.is_faculty()))
);
create policy modules_admin on public.modules for all using (public.is_admin()) with check (public.is_admin());

create policy lessons_read on public.lessons for select using (
  public.is_active_member() and (public.is_faculty() or (is_published and exists (
    select 1 from public.courses c where c.id = course_id and c.is_published)))
);
create policy lessons_admin on public.lessons for all using (public.is_admin()) with check (public.is_admin());

-- Progress is written only through the functions below.
create policy progress_read on public.lesson_progress for select using (
  public.is_active_member() and (user_id = auth.uid() or public.is_faculty())
);
create policy enrollments_read on public.enrollments for select using (
  public.is_active_member() and (user_id = auth.uid() or public.is_faculty())
);
create policy events_read on public.activity_events for select using (
  public.is_active_member() and (user_id = auth.uid() or public.is_faculty())
);

create policy notes_own on public.lesson_notes for all
  using (user_id = auth.uid() and public.is_active_member())
  with check (user_id = auth.uid() and public.is_active_member());

-- join_url is hidden from members by column privileges; see live_join_url().
create policy live_read on public.live_sessions for select using (public.is_active_member());
create policy live_admin on public.live_sessions for all using (public.is_faculty()) with check (public.is_faculty());
revoke select on public.live_sessions from authenticated, anon;
grant select (id, title, host_name, starts_at, ends_at, created_at) on public.live_sessions to authenticated;

create policy announcements_read on public.announcements for select using (public.is_active_member());
create policy announcements_admin on public.announcements for all using (public.is_admin()) with check (public.is_admin());
create policy reads_own on public.announcement_reads for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() and public.is_active_member());

-- ── Rules-bearing functions ───────────────────────────────────────────────

-- Mirrors lib/progress.ts applyProgress(): position clamped, watch time capped
-- per report and at the duration, completion only set automatically in
-- watch mode once min_watch_pct is genuinely watched, never cleared here.
create or replace function public.save_lesson_progress(p_lesson uuid, p_position int, p_watched_delta int)
returns public.lesson_progress
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  l public.lessons%rowtype;
  prev public.lesson_progress%rowtype;
  pos int;
  delta int := least(greatest(coalesce(p_watched_delta, 0), 0), 120);
  watch int;
  done boolean;
  result public.lesson_progress%rowtype;
begin
  if not public.is_active_member() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into l from public.lessons where id = p_lesson;
  if l.id is null then raise exception 'lesson not found' using errcode = 'P0002'; end if;
  if not public.is_faculty() and not (l.is_published and exists (select 1 from public.courses c where c.id = l.course_id and c.is_published)) then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;

  select * into prev from public.lesson_progress where user_id = me and lesson_id = p_lesson for update;

  pos := greatest(coalesce(p_position, 0), 0);
  if l.duration_seconds > 0 then pos := least(pos, l.duration_seconds); end if;
  watch := coalesce(prev.watch_seconds, 0) + delta;
  if l.duration_seconds > 0 then watch := least(watch, l.duration_seconds); end if;

  done := coalesce(prev.is_completed, false);
  if not done and not coalesce(prev.manually_incomplete, false) and l.completion_mode = 'watch'
     and l.duration_seconds > 0 and watch >= ceil(l.duration_seconds * l.min_watch_pct) then
    done := true;
  end if;

  insert into public.lesson_progress as lp (user_id, lesson_id, course_id, position_seconds, watch_seconds, is_completed, completed_at, updated_at)
  values (me, p_lesson, l.course_id, pos, watch, done, case when done then now() end, now())
  on conflict (user_id, lesson_id) do update set
    position_seconds = excluded.position_seconds,
    watch_seconds = excluded.watch_seconds,
    is_completed = excluded.is_completed,
    completed_at = case when excluded.is_completed and lp.completed_at is null then now() else lp.completed_at end,
    updated_at = now()
  returning * into result;

  perform public._after_progress(me, l, delta, done and not coalesce(prev.is_completed, false));
  return result;
end;
$$;

-- Learner ticks or un-ticks "Mark complete". Mirrors lib/progress.ts markCompletion().
create or replace function public.set_lesson_completion(p_lesson uuid, p_completed boolean)
returns public.lesson_progress
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  l public.lessons%rowtype;
  prev public.lesson_progress%rowtype;
  result public.lesson_progress%rowtype;
begin
  if not public.is_active_member() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into l from public.lessons where id = p_lesson;
  if l.id is null then raise exception 'lesson not found' using errcode = 'P0002'; end if;
  select * into prev from public.lesson_progress where user_id = me and lesson_id = p_lesson for update;

  if p_completed and l.completion_mode = 'watch'
     and (l.duration_seconds = 0 or coalesce(prev.watch_seconds, 0) < ceil(l.duration_seconds * l.min_watch_pct)) then
    raise exception 'Watch at least % percent of the lesson first.', round(l.min_watch_pct * 100) using errcode = 'P0001';
  end if;

  insert into public.lesson_progress as lp (user_id, lesson_id, course_id, is_completed, manually_incomplete, completed_at)
  values (me, p_lesson, l.course_id, p_completed, not p_completed, case when p_completed then now() end)
  on conflict (user_id, lesson_id) do update set
    is_completed = p_completed,
    manually_incomplete = not p_completed,
    completed_at = case when p_completed then coalesce(lp.completed_at, now()) else null end,
    updated_at = now()
  returning * into result;

  perform public._after_progress(me, l, 0, p_completed and not coalesce(prev.is_completed, false));
  return result;
end;
$$;

-- Shared bookkeeping: enrollment, learning minutes, one-time XP, course completion.
create or replace function public._after_progress(p_user uuid, l public.lessons, p_delta int, p_newly_completed boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  total int;
  finished int;
begin
  insert into public.enrollments (user_id, course_id, last_lesson_id, last_activity_at)
  values (p_user, l.course_id, l.id, now())
  on conflict (user_id, course_id) do update set last_lesson_id = l.id, last_activity_at = now();

  if p_delta > 0 then
    insert into public.activity_events (user_id, kind, subject_id, minutes)
    values (p_user, 'lesson.watch', l.id, round(p_delta / 60.0, 2));
  end if;

  if p_newly_completed then
    insert into public.activity_events (user_id, kind, subject_id, xp, once)
    values (p_user, 'lesson.completed', l.id, 50, true)
    on conflict do nothing;

    select count(*) into total from public.lessons where course_id = l.course_id and is_published;
    select count(*) into finished from public.lesson_progress lp
      join public.lessons x on x.id = lp.lesson_id and x.is_published
      where lp.user_id = p_user and lp.course_id = l.course_id and lp.is_completed;
    if total > 0 and finished >= total then
      update public.enrollments set completed_at = coalesce(completed_at, now())
        where user_id = p_user and course_id = l.course_id;
      insert into public.activity_events (user_id, kind, subject_id, xp, once)
      values (p_user, 'course.completed', l.course_id, 200, true)
      on conflict do nothing;
    end if;
  end if;
end;
$$;
revoke execute on function public._after_progress(uuid, public.lessons, int, boolean) from public, authenticated, anon;

-- YouTube has no webhook, so the player reports the length once. Only fills
-- a missing value (capped at 12 h); an admin-entered duration is never overwritten.
create or replace function public.report_lesson_duration(p_lesson uuid, p_seconds int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_member() then return; end if;
  update public.lessons set duration_seconds = least(greatest(p_seconds, 1), 43200), duration_source = 'browser'
  where id = p_lesson and duration_seconds = 0;
end;
$$;

-- The join link is only released while a session is live (15 minutes early).
create or replace function public.live_join_url(p_session uuid)
returns text
language sql stable security definer set search_path = public as $$
  select join_url from public.live_sessions
  where id = p_session and public.is_active_member()
    and (public.is_faculty() or now() between starts_at - interval '15 minutes' and ends_at)
$$;

-- Leaderboard: all-time XP, optionally for one department.
create or replace function public.leaderboard(p_department public.department default null, p_limit int default 10)
returns table (user_id uuid, full_name text, department public.department, xp bigint)
language sql stable security definer set search_path = public as $$
  select u.id, u.full_name, u.department, coalesce(sum(e.xp), 0)::bigint as xp
  from public.users u
  left join public.activity_events e on e.user_id = u.id
  where public.is_active_member() and not u.is_disabled
    and (p_department is null or u.department = p_department)
  group by u.id
  order by xp desc, u.full_name
  limit least(p_limit, 50)
$$;

-- Streak in India time: consecutive days (ending today or yesterday) with any activity.
create or replace function public.my_streak()
returns table (current_streak int, best_streak int)
language sql stable security definer set search_path = public as $$
  with days as (
    select distinct (created_at at time zone 'Asia/Kolkata')::date as d
    from public.activity_events where user_id = auth.uid()
  ), runs as (
    select d, d - (row_number() over (order by d))::int as grp from days
  ), streaks as (
    select min(d) as start_d, max(d) as end_d, count(*)::int as len from runs group by grp
  )
  select
    coalesce((select len from streaks where end_d >= (now() at time zone 'Asia/Kolkata')::date - 1 order by end_d desc limit 1), 0),
    coalesce((select max(len) from streaks), 0)
$$;

grant execute on function public.save_lesson_progress(uuid, int, int) to authenticated;
grant execute on function public.set_lesson_completion(uuid, boolean) to authenticated;
grant execute on function public.report_lesson_duration(uuid, int) to authenticated;
grant execute on function public.live_join_url(uuid) to authenticated;
grant execute on function public.leaderboard(public.department, int) to authenticated;
grant execute on function public.my_streak() to authenticated;
