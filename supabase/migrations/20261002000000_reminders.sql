-- Phase 3: reminder emails.
-- A daily job (Vercel Cron → /api/cron/<job>) reads one snapshot of the
-- university, works out who needs a nudge (lib/reminders.ts), and sends the
-- emails through Resend. The job has no signed-in user, so its functions are
-- unlocked by a long random key instead: only the SHA-256 of that key is
-- stored here (private.cron_keys), and the key itself lives in the app's
-- CRON_SECRET setting. Everyone can switch each kind of email off.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.cron_keys (
  hash bytea primary key,
  note text not null default '',
  created_at timestamptz not null default now()
);

create or replace function private.cron_ok(p_key text) returns boolean
language sql stable set search_path = '' as $$
  select coalesce(length(p_key) >= 32, false)
     and exists (select 1 from private.cron_keys where hash = sha256(convert_to(p_key, 'UTF8')))
$$;

-- ── Preferences ───────────────────────────────────────────────────────────
-- No row = everything on.

create table public.email_prefs (
  user_id uuid primary key references public.users (id) on delete cascade,
  reminders boolean not null default true,
  streak boolean not null default true,
  digest boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.email_prefs enable row level security;
create policy email_prefs_own on public.email_prefs for all
  using (user_id = auth.uid() and public.is_active_member())
  with check (user_id = auth.uid() and public.is_active_member());

-- ── Send log ──────────────────────────────────────────────────────────────
-- One row per person, kind and India date. The job claims a row before it
-- sends, so a retried run never emails anyone twice.

create table public.email_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('reminder', 'streak', 'digest')),
  sent_on date not null,
  status text not null default 'claimed' check (status in ('claimed', 'sent', 'failed')),
  error text check (error is null or length(error) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, kind, sent_on)
);
create index email_log_recent_idx on public.email_log (created_at desc);

alter table public.email_log enable row level security;
create policy email_log_admin_read on public.email_log for select using (public.is_admin());

-- ── Job functions (key-gated) ─────────────────────────────────────────────

create or replace function public.cron_snapshot(p_key text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if not private.cron_ok(p_key) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'today', v_today,
    'people', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', u.id, 'email', u.email, 'name', u.full_name, 'role', u.role, 'department', u.department,
        'createdAt', u.created_at, 'startOn', public.learner_start_date(u.id),
        'reminders', coalesce(p.reminders, true), 'streak', coalesce(p.streak, true), 'digest', coalesce(p.digest, true)
      ) order by u.created_at), '[]'::jsonb)
      from public.users u left join public.email_prefs p on p.user_id = u.id
      where not u.is_disabled
    ),
    'courses', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'slug', c.slug, 'title', c.title, 'departments', to_jsonb(c.departments),
        'modules', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', m.id, 'title', m.title, 'dripDays', m.drip_days,
            'lessons', (
              select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'slug', l.slug, 'title', l.title) order by l.rank), '[]'::jsonb)
              from public.lessons l where l.module_id = m.id and l.is_published
            )
          ) order by m.rank), '[]'::jsonb)
          from public.modules m where m.course_id = c.id
        )
      ) order by c.rank), '[]'::jsonb)
      from public.courses c where c.is_published
    ),
    'completions', (
      select coalesce(jsonb_agg(jsonb_build_object('userId', user_id, 'lessonId', lesson_id, 'completedAt', completed_at)), '[]'::jsonb)
      from public.lesson_progress where is_completed
    ),
    -- India dates with any learning activity, last 60 days.
    'activityDays', (
      select coalesce(jsonb_object_agg(user_id, days), '{}'::jsonb) from (
        select user_id, jsonb_agg(d order by d) as days from (
          select distinct user_id, (created_at at time zone 'Asia/Kolkata')::date as d
          from public.activity_events where created_at > now() - interval '60 days'
        ) x group by user_id
      ) y
    ),
    'xp', (
      select coalesce(jsonb_object_agg(user_id, xp), '{}'::jsonb)
      from (select user_id, sum(xp)::int as xp from public.activity_events group by user_id) x
    ),
    'lastActive', (
      select coalesce(jsonb_object_agg(user_id, at), '{}'::jsonb)
      from (select user_id, max(last_activity_at) as at from public.enrollments group by user_id) x
    ),
    'certificates', (
      select coalesce(jsonb_agg(jsonb_build_object('userId', user_id, 'courseId', course_id, 'issuedAt', issued_at)), '[]'::jsonb)
      from public.certificates
    ),
    'waitingReviews', (
      select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'userId', s.user_id, 'title', l.title, 'createdAt', s.created_at) order by s.created_at), '[]'::jsonb)
      from public.submissions s join public.assignments a on a.id = s.assignment_id join public.lessons l on l.id = a.lesson_id
      where s.status = 'submitted'
    ),
    -- Practicals whose latest submission was sent back for a redo.
    'redo', (
      select coalesce(jsonb_agg(jsonb_build_object('userId', s.user_id, 'lessonId', l.id, 'title', l.title, 'since', s.reviewed_at)), '[]'::jsonb)
      from (
        select distinct on (user_id, assignment_id) * from public.submissions order by user_id, assignment_id, created_at desc
      ) s
      join public.assignments a on a.id = s.assignment_id join public.lessons l on l.id = a.lesson_id
      where s.status = 'redo'
    ),
    -- Required quizzes someone has tried but not passed yet.
    'failedQuizzes', (
      select coalesce(jsonb_agg(jsonb_build_object('userId', t.user_id, 'lessonId', l.id, 'title', l.title)), '[]'::jsonb)
      from (
        select user_id, quiz_id from public.quiz_attempts group by user_id, quiz_id having not bool_or(passed)
      ) t
      join public.quizzes q on q.id = t.quiz_id and q.is_required
      join public.lessons l on l.id = q.lesson_id and l.is_published
    ),
    'cohorts', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'title', c.title, 'startsOn', c.starts_on, 'endsOn', c.ends_on,
        'memberIds', (select coalesce(jsonb_agg(m.user_id), '[]'::jsonb) from public.cohort_members m where m.cohort_id = c.id),
        'courseIds', (
          select coalesce(jsonb_agg(distinct plc.course_id), '[]'::jsonb)
          from public.program_levels pl join public.program_level_courses plc on plc.level_id = pl.id
          where pl.program_id = c.program_id
        )
      )), '[]'::jsonb)
      from public.cohorts c where c.ends_on >= v_today - 30
    ),
    'campaigns', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'title', c.title, 'emoji', c.emoji, 'dueOn', c.due_on,
        'startsOn', (c.created_at at time zone 'Asia/Kolkata')::date, 'departments', to_jsonb(c.departments),
        'courseIds', (select coalesce(jsonb_agg(cc.course_id), '[]'::jsonb) from public.campaign_courses cc where cc.campaign_id = c.id)
      )), '[]'::jsonb)
      from public.campaigns c where c.due_on >= v_today - 14
    ),
    'live', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'hostName', host_name, 'startsAt', starts_at) order by starts_at), '[]'::jsonb)
      from public.live_sessions where (starts_at at time zone 'Asia/Kolkata')::date = v_today
    ),
    'emailLog', (
      select coalesce(jsonb_agg(jsonb_build_object('userId', user_id, 'kind', kind, 'sentOn', sent_on)), '[]'::jsonb)
      from public.email_log where sent_on >= v_today - 14 and status <> 'failed'
    )
  );
end;
$$;

-- Claims (person, kind, date) rows before sending. Returns the rows that
-- were free, so a second run on the same day sends nothing again.
create or replace function public.cron_claim_emails(p_key text, p_rows jsonb)
returns table (user_id uuid, kind text)
language plpgsql security definer set search_path = public as $$
begin
  if not private.cron_ok(p_key) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    insert into public.email_log as e (user_id, kind, sent_on)
    select (r ->> 'userId')::uuid, r ->> 'kind', (now() at time zone 'Asia/Kolkata')::date
    from jsonb_array_elements(p_rows) r
    on conflict on constraint email_log_user_id_kind_sent_on_key do update set status = 'claimed', error = null, created_at = now()
      where e.status = 'failed'
    returning e.user_id, e.kind;
end;
$$;

-- Records how each claimed email went. A failed row frees the slot, so the
-- next run can try that person again.
create or replace function public.cron_finish_emails(p_key text, p_rows jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.cron_ok(p_key) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.email_log e
  set status = case when r ->> 'error' is null then 'sent' else 'failed' end,
      error = left(r ->> 'error', 500)
  from jsonb_array_elements(p_rows) r
  where e.user_id = (r ->> 'userId')::uuid and e.kind = r ->> 'kind'
    and e.sent_on = (now() at time zone 'Asia/Kolkata')::date and e.status = 'claimed';
end;
$$;

-- The unsubscribe link in each email (its signature is checked by the app).
create or replace function public.cron_unsubscribe(p_key text, p_user uuid, p_kind text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.cron_ok(p_key) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_kind not in ('reminders', 'streak', 'digest') then
    raise exception 'unknown email kind';
  end if;
  insert into public.email_prefs (user_id) select id from public.users where id = p_user
  on conflict (user_id) do nothing;
  update public.email_prefs set
    reminders = case when p_kind = 'reminders' then false else reminders end,
    streak = case when p_kind = 'streak' then false else streak end,
    digest = case when p_kind = 'digest' then false else digest end,
    updated_at = now()
  where user_id = p_user;
end;
$$;

-- The job runs signed out (the anon role); the key is what lets it in.
revoke execute on function public.cron_snapshot(text) from public;
revoke execute on function public.cron_claim_emails(text, jsonb) from public;
revoke execute on function public.cron_finish_emails(text, jsonb) from public;
revoke execute on function public.cron_unsubscribe(text, uuid, text) from public;
grant execute on function public.cron_snapshot(text) to anon, authenticated;
grant execute on function public.cron_claim_emails(text, jsonb) to anon, authenticated;
grant execute on function public.cron_finish_emails(text, jsonb) to anon, authenticated;
grant execute on function public.cron_unsubscribe(text, uuid, text) to anon, authenticated;
