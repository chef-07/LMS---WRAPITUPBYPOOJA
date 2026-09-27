-- Phase 5: university structure. Programs with levels, new-joiner batches
-- (cohorts) with drip-released modules, skills + skill matrix, seasonal
-- campaigns.

-- ── Programs ──────────────────────────────────────────────────────────────

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(title) between 2 and 120),
  emoji text not null default '🎓',
  description text not null default '' check (length(description) <= 1000),
  -- Null means the program is for everyone.
  department public.department,
  is_published boolean not null default false,
  rank int not null default 0,
  created_at timestamptz not null default now()
);

create table public.program_levels (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  level public.course_level not null,
  title text not null default '' check (length(title) <= 120),
  unique (program_id, level)
);

create table public.program_level_courses (
  level_id uuid not null references public.program_levels (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  rank int not null default 0,
  primary key (level_id, course_id)
);

alter table public.programs enable row level security;
alter table public.program_levels enable row level security;
alter table public.program_level_courses enable row level security;

create policy programs_read on public.programs for select using (public.is_active_member() and (is_published or public.is_faculty()));
create policy programs_admin on public.programs for all using (public.is_admin()) with check (public.is_admin());
create policy program_levels_read on public.program_levels for select using (
  public.is_active_member() and exists (select 1 from public.programs p where p.id = program_id)
);
create policy program_levels_admin on public.program_levels for all using (public.is_admin()) with check (public.is_admin());
create policy plc_read on public.program_level_courses for select using (
  public.is_active_member() and exists (select 1 from public.program_levels l where l.id = level_id)
);
create policy plc_admin on public.program_level_courses for all using (public.is_admin()) with check (public.is_admin());

-- ── Cohorts (new-joiner batches) ──────────────────────────────────────────

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 2 and 120),
  starts_on date not null,
  ends_on date not null,
  program_id uuid references public.programs (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

-- One batch per person: their batch start is the clock for drip releases.
create table public.cohort_members (
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  user_id uuid not null unique references public.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (cohort_id, user_id)
);

alter table public.cohorts enable row level security;
alter table public.cohort_members enable row level security;
create policy cohorts_read on public.cohorts for select using (public.is_active_member());
create policy cohorts_admin on public.cohorts for all using (public.is_admin()) with check (public.is_admin());
create policy cohort_members_read on public.cohort_members for select using (
  public.is_active_member() and (user_id = auth.uid() or public.is_faculty())
);
create policy cohort_members_admin on public.cohort_members for all using (public.is_admin()) with check (public.is_admin());

-- The learner's clock: their batch start, else the day they joined (India time).
create or replace function public.learner_start_date(p_user uuid)
returns date
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select c.starts_on from public.cohort_members m join public.cohorts c on c.id = m.cohort_id where m.user_id = p_user),
    (select (created_at at time zone 'Asia/Kolkata')::date from public.users where id = p_user),
    (now() at time zone 'Asia/Kolkata')::date)
$$;

create or replace function public.my_start_date()
returns date
language sql stable security definer set search_path = public as $$
  select public.learner_start_date(auth.uid()) where public.is_active_member()
$$;

-- Locked while an earlier module's required quiz is not passed (Phase 4),
-- or while the module's drip date has not arrived. Mirrors lib/locks.ts.
create or replace function public.lesson_locked(p_user uuid, p_lesson uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.modules pm on pm.course_id = m.course_id
      and (pm.rank < m.rank or (pm.rank = m.rank and pm.id < m.id))
    join public.lessons pl on pl.module_id = pm.id and pl.is_published
    join public.quizzes q on q.lesson_id = pl.id and q.is_required
    where l.id = p_lesson
      and exists (select 1 from public.quiz_questions qq where qq.quiz_id = q.id)
      and not exists (select 1 from public.quiz_attempts a where a.quiz_id = q.id and a.user_id = p_user and a.passed)
  ) or exists (
    select 1 from public.lessons l join public.modules m on m.id = l.module_id
    where l.id = p_lesson and m.drip_days > 0
      and (now() at time zone 'Asia/Kolkata')::date < public.learner_start_date(p_user) + m.drip_days
  )
$$;

-- ── Level completion: +150 XP once every course of a level is certified ──

create or replace function public._award_levels(p_user uuid, p_course uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  lvl record;
begin
  for lvl in
    select pl.id from public.program_levels pl
    join public.program_level_courses plc on plc.level_id = pl.id
    where plc.course_id = p_course
  loop
    if not exists (
      select 1 from public.program_level_courses x
      where x.level_id = lvl.id
        and not exists (select 1 from public.certificates c where c.user_id = p_user and c.course_id = x.course_id)
    ) then
      insert into public.activity_events (user_id, kind, subject_id, xp, once)
        values (p_user, 'level.completed', lvl.id, 150, true) on conflict do nothing;
    end if;
  end loop;
end;
$$;

create or replace function public.on_certificate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public._award_levels(new.user_id, new.course_id);
  return new;
end;
$$;
create trigger certificates_levels after insert on public.certificates
  for each row execute function public.on_certificate();

-- ── Skills ────────────────────────────────────────────────────────────────

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 80),
  emoji text not null default '⭐',
  description text not null default '' check (length(description) <= 300),
  department public.department,
  rank int not null default 0
);

-- Certify in all these courses to earn the skill automatically.
create table public.skill_courses (
  skill_id uuid not null references public.skills (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  primary key (skill_id, course_id)
);

-- A trainer's sign-off, e.g. after watching someone do it on the floor.
create table public.skill_grants (
  skill_id uuid not null references public.skills (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  granted_by uuid references public.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (skill_id, user_id)
);

alter table public.skills enable row level security;
alter table public.skill_courses enable row level security;
alter table public.skill_grants enable row level security;
create policy skills_read on public.skills for select using (public.is_active_member());
create policy skills_admin on public.skills for all using (public.is_admin()) with check (public.is_admin());
create policy skill_courses_read on public.skill_courses for select using (public.is_active_member());
create policy skill_courses_admin on public.skill_courses for all using (public.is_admin()) with check (public.is_admin());
create policy skill_grants_read on public.skill_grants for select using (
  public.is_active_member() and (user_id = auth.uid() or public.is_faculty())
);
create policy skill_grants_faculty_insert on public.skill_grants for insert with check (public.is_faculty() and granted_by = auth.uid());
create policy skill_grants_faculty_delete on public.skill_grants for delete using (public.is_faculty());

-- ── Campaigns ─────────────────────────────────────────────────────────────

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 120),
  emoji text not null default '✨',
  description text not null default '' check (length(description) <= 1000),
  due_on date not null,
  -- Empty means everyone.
  departments public.department[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.campaign_courses (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  primary key (campaign_id, course_id)
);

alter table public.campaigns enable row level security;
alter table public.campaign_courses enable row level security;
create policy campaigns_read on public.campaigns for select using (public.is_active_member());
create policy campaigns_admin on public.campaigns for all using (public.is_admin()) with check (public.is_admin());
create policy campaign_courses_read on public.campaign_courses for select using (public.is_active_member());
create policy campaign_courses_admin on public.campaign_courses for all using (public.is_admin()) with check (public.is_admin());

-- ── Grants ────────────────────────────────────────────────────────────────

revoke execute on function public.learner_start_date(uuid) from anon, authenticated, public;
revoke execute on function public._award_levels(uuid, uuid) from anon, authenticated, public;
revoke execute on function public.on_certificate() from anon, authenticated, public;
revoke execute on function public.my_start_date() from anon, public;
grant execute on function public.my_start_date() to authenticated;
