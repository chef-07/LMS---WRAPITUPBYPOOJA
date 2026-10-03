-- Phase 4: quizzes, "Show your wrap" practicals, module locks, certificates.
--
-- Rules (mirrored and unit-tested in lib/quiz.ts and lib/locks.ts):
-- * A quiz passes when score/total >= pass_pct. Members never read the answer
--   key; get_quiz() hands out questions without it and submit_quiz() grades.
-- * A module is locked while any required quiz (with questions) in an earlier
--   module is not passed. Practicals never lock anything.
-- * A course is complete when every published lesson is done, every required
--   quiz is passed and every practical is approved. Completion issues one
--   certificate and 200 XP.

create type public.question_kind as enum ('mcq', 'scenario');
create type public.submission_status as enum ('submitted', 'approved', 'redo');

-- ── Quizzes ───────────────────────────────────────────────────────────────

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  pass_pct int not null default 70 check (pass_pct between 1 and 100),
  is_required boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  kind public.question_kind not null default 'mcq',
  prompt text not null check (length(prompt) between 1 and 1000),
  explanation text not null default '' check (length(explanation) <= 1000),
  rank int not null default 0
);
create index quiz_questions_quiz_idx on public.quiz_questions (quiz_id, rank);

create table public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  label text not null check (length(label) between 1 and 300),
  is_correct boolean not null default false,
  feedback text not null default '' check (length(feedback) <= 500),
  rank int not null default 0
);
create index quiz_options_question_idx on public.quiz_options (question_id, rank);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  score int not null,
  total int not null,
  passed boolean not null,
  answers jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id, quiz_id, created_at desc);

-- ── Practicals ────────────────────────────────────────────────────────────

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  brief text not null default '' check (length(brief) <= 2000),
  -- [{ "key": "corners", "label": "Sharp corners" }, …]
  rubric jsonb not null default '[{"key":"corners","label":"Sharp corners"},{"key":"tape","label":"Hidden tape"},{"key":"ribbon","label":"Ribbon & bow"},{"key":"neatness","label":"Overall neatness"}]',
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  -- Storage object paths in the private "submissions" bucket, always "<user id>/…".
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 5),
  link text check (link is null or (length(link) <= 500 and link ~ '^https://')),
  note text not null default '' check (length(note) <= 1000),
  status public.submission_status not null default 'submitted',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (cardinality(photo_paths) > 0 or link is not null)
);
create index submissions_user_idx on public.submissions (user_id, assignment_id, created_at desc);
create index submissions_queue_idx on public.submissions (created_at) where status = 'submitted';

create table public.submission_reviews (
  submission_id uuid primary key references public.submissions (id) on delete cascade,
  reviewer_id uuid references public.users (id) on delete set null,
  scores jsonb not null default '{}',
  comment text not null default '' check (length(comment) <= 2000),
  decision public.submission_status not null check (decision in ('approved', 'redo')),
  created_at timestamptz not null default now()
);

-- ── Certificates ──────────────────────────────────────────────────────────

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  code text not null unique check (code ~ '^WIU-[0-9A-F]{4}-[0-9A-F]{4}$'),
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

-- ── Row-level security ────────────────────────────────────────────────────

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_reviews enable row level security;
alter table public.certificates enable row level security;

-- Visible when the lesson is (the lessons policy does the work).
create policy quizzes_read on public.quizzes for select using (
  public.is_active_member() and exists (select 1 from public.lessons l where l.id = lesson_id)
);
create policy quizzes_admin on public.quizzes for all using (public.is_admin()) with check (public.is_admin());

create policy questions_read on public.quiz_questions for select using (
  public.is_active_member() and exists (select 1 from public.quizzes q where q.id = quiz_id)
);
create policy questions_admin on public.quiz_questions for all using (public.is_admin()) with check (public.is_admin());

-- The answer key: faculty only. Members get options through get_quiz().
create policy options_faculty on public.quiz_options for select using (public.is_faculty());
create policy options_admin on public.quiz_options for all using (public.is_admin()) with check (public.is_admin());

create policy attempts_read on public.quiz_attempts for select using (
  public.is_active_member() and (user_id = auth.uid() or public.is_faculty())
);

create policy assignments_read on public.assignments for select using (
  public.is_active_member() and exists (select 1 from public.lessons l where l.id = lesson_id)
);
create policy assignments_admin on public.assignments for all using (public.is_admin()) with check (public.is_admin());

create policy submissions_read on public.submissions for select using (
  public.is_active_member() and (user_id = auth.uid() or public.is_faculty())
);
create policy reviews_read on public.submission_reviews for select using (
  public.is_active_member() and (public.is_faculty() or exists (
    select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid()))
);

create policy certificates_read on public.certificates for select using (
  public.is_active_member() and (user_id = auth.uid() or public.is_faculty())
);

-- ── Locks and completion ──────────────────────────────────────────────────

-- True while a required quiz (with questions) in an earlier module of the
-- lesson's course is not passed by p_user. Mirrors lib/locks.ts.
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
  )
$$;

-- Issues completion, XP and the certificate once every requirement is met.
create or replace function public._maybe_complete_course(p_user uuid, p_course uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  total int;
  finished int;
  new_code text;
begin
  select count(*) into total from public.lessons where course_id = p_course and is_published;
  if total = 0 then return; end if;
  select count(*) into finished from public.lesson_progress lp
    join public.lessons x on x.id = lp.lesson_id and x.is_published
    where lp.user_id = p_user and lp.course_id = p_course and lp.is_completed;
  if finished < total then return; end if;

  if exists (
    select 1 from public.quizzes q join public.lessons l on l.id = q.lesson_id and l.is_published
    where q.course_id = p_course and q.is_required
      and exists (select 1 from public.quiz_questions qq where qq.quiz_id = q.id)
      and not exists (select 1 from public.quiz_attempts a where a.quiz_id = q.id and a.user_id = p_user and a.passed)
  ) then return; end if;

  if exists (
    select 1 from public.assignments a join public.lessons l on l.id = a.lesson_id and l.is_published
    where a.course_id = p_course
      and not exists (select 1 from public.submissions s where s.assignment_id = a.id and s.user_id = p_user and s.status = 'approved')
  ) then return; end if;

  update public.enrollments set completed_at = coalesce(completed_at, now())
    where user_id = p_user and course_id = p_course;
  insert into public.activity_events (user_id, kind, subject_id, xp, once)
    values (p_user, 'course.completed', p_course, 200, true)
    on conflict do nothing;

  loop
    new_code := 'WIU-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4))
             || '-' || upper(substr(md5(clock_timestamp()::text || random()::text), 1, 4));
    begin
      insert into public.certificates (user_id, course_id, code) values (p_user, p_course, new_code)
        on conflict (user_id, course_id) do nothing;
      exit;
    exception when unique_violation then
      -- The random code was already taken; try another.
    end;
  end loop;
end;
$$;

-- Same bookkeeping as before; course completion now goes through the rule above.
create or replace function public._after_progress(p_user uuid, l public.lessons, p_delta int, p_newly_completed boolean)
returns void
language plpgsql security definer set search_path = public as $$
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
    perform public._maybe_complete_course(p_user, l.course_id);
  end if;
end;
$$;

-- Progress and completion now refuse locked lessons (faculty can preview anything).
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
  if not public.is_faculty() and public.lesson_locked(me, l.id) then
    raise exception 'This lesson is locked. Pass the quiz in the earlier module first.' using errcode = 'P0001';
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
  if not public.is_faculty() and not (l.is_published and exists (select 1 from public.courses c where c.id = l.course_id and c.is_published)) then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;
  if not public.is_faculty() and public.lesson_locked(me, l.id) then
    raise exception 'This lesson is locked. Pass the quiz in the earlier module first.' using errcode = 'P0001';
  end if;
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

-- Lesson ids in a course that are locked for the caller (for the syllabus).
create or replace function public.my_locked_lessons(p_course uuid)
returns setof uuid
language sql stable security definer set search_path = public as $$
  select l.id from public.lessons l
  where l.course_id = p_course and public.is_active_member() and not public.is_faculty()
    and public.lesson_locked(auth.uid(), l.id)
$$;

-- ── Quiz functions ────────────────────────────────────────────────────────

-- Questions and options without the answer key.
create or replace function public.get_quiz(p_lesson uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', q.id,
    'passPct', q.pass_pct,
    'isRequired', q.is_required,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qq.id,
        'kind', qq.kind,
        'prompt', qq.prompt,
        'options', coalesce((
          select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label) order by o.rank, o.id)
          from public.quiz_options o where o.question_id = qq.id), '[]'::jsonb)
      ) order by qq.rank, qq.id)
      from public.quiz_questions qq where qq.quiz_id = q.id), '[]'::jsonb)
  )
  from public.quizzes q
  join public.lessons l on l.id = q.lesson_id
  join public.courses c on c.id = l.course_id
  where q.lesson_id = p_lesson
    and public.is_active_member()
    and (public.is_faculty() or (l.is_published and c.is_published))
$$;

-- Grades an attempt; returns per-question results. Mirrors lib/quiz.ts gradeQuiz().
create or replace function public.submit_quiz(p_quiz uuid, p_answers jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  q public.quizzes%rowtype;
  rec record;
  v_total int := 0;
  v_score int := 0;
  chosen uuid;
  correct_id uuid;
  fb text;
  results jsonb := '[]'::jsonb;
  v_passed boolean;
  had_pass boolean;
begin
  if not public.is_active_member() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into q from public.quizzes where id = p_quiz;
  if q.id is null then raise exception 'quiz not found' using errcode = 'P0002'; end if;
  if not public.is_faculty() and not exists (
    select 1 from public.lessons l join public.courses c on c.id = l.course_id
    where l.id = q.lesson_id and l.is_published and c.is_published) then
    raise exception 'quiz not found' using errcode = 'P0002';
  end if;
  if not public.is_faculty() and public.lesson_locked(me, q.lesson_id) then
    raise exception 'This lesson is locked. Pass the quiz in the earlier module first.' using errcode = 'P0001';
  end if;

  for rec in select qq.id, qq.explanation from public.quiz_questions qq where qq.quiz_id = q.id order by qq.rank, qq.id loop
    v_total := v_total + 1;
    select o.id into correct_id from public.quiz_options o
      where o.question_id = rec.id and o.is_correct order by o.rank, o.id limit 1;
    -- Only an option of this question counts as an answer.
    select o.id, o.feedback into chosen, fb from public.quiz_options o
      where o.question_id = rec.id and o.id::text = (p_answers ->> rec.id::text);
    if chosen is not null and chosen = correct_id then v_score := v_score + 1; end if;
    results := results || jsonb_build_array(jsonb_build_object(
      'questionId', rec.id,
      'chosen', chosen,
      'correctOptionId', correct_id,
      'correct', chosen is not null and chosen = correct_id,
      'feedback', nullif(fb, ''),
      'explanation', rec.explanation));
    chosen := null;
    fb := null;
  end loop;
  if v_total = 0 then raise exception 'This quiz has no questions yet.' using errcode = 'P0001'; end if;

  v_passed := v_score * 100 >= q.pass_pct * v_total;
  select exists (select 1 from public.quiz_attempts where user_id = me and quiz_id = q.id and quiz_attempts.passed) into had_pass;
  insert into public.quiz_attempts (user_id, quiz_id, score, total, passed, answers)
    values (me, q.id, v_score, v_total, v_passed, coalesce(p_answers, '{}'::jsonb));

  if v_passed and not had_pass then
    insert into public.activity_events (user_id, kind, subject_id, xp, once)
      values (me, 'quiz.passed', q.id, 30, true)
      on conflict do nothing;
    perform public._maybe_complete_course(me, q.course_id);
  end if;

  return jsonb_build_object('score', v_score, 'total', v_total, 'passed', v_passed, 'passPct', q.pass_pct, 'results', results);
end;
$$;

-- Studio saves a whole quiz at once, atomically. p_questions:
-- [{ kind, prompt, explanation, options: [{ label, isCorrect, feedback }] }]
create or replace function public.admin_save_quiz(p_lesson uuid, p_pass_pct int, p_required boolean, p_questions jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  l public.lessons%rowtype;
  qid uuid;
  question jsonb;
  opt jsonb;
  qq_id uuid;
  qi int := 0;
  oi int;
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into l from public.lessons where id = p_lesson;
  if l.id is null then raise exception 'lesson not found' using errcode = 'P0002'; end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) = 0 then
    raise exception 'Add at least one question.' using errcode = 'P0001';
  end if;

  insert into public.quizzes (lesson_id, course_id, pass_pct, is_required)
    values (l.id, l.course_id, p_pass_pct, p_required)
    on conflict (lesson_id) do update set pass_pct = excluded.pass_pct, is_required = excluded.is_required
    returning id into qid;
  delete from public.quiz_questions where quiz_id = qid;

  for question in select * from jsonb_array_elements(p_questions) loop
    qi := qi + 1;
    if (select count(*) from jsonb_array_elements(question -> 'options') o where (o ->> 'isCorrect')::boolean) <> 1 then
      raise exception 'Question %: mark exactly one answer as correct.', qi using errcode = 'P0001';
    end if;
    insert into public.quiz_questions (quiz_id, kind, prompt, explanation, rank)
      values (qid, coalesce((question ->> 'kind')::public.question_kind, 'mcq'), question ->> 'prompt', coalesce(question ->> 'explanation', ''), qi)
      returning id into qq_id;
    oi := 0;
    for opt in select * from jsonb_array_elements(question -> 'options') loop
      oi := oi + 1;
      insert into public.quiz_options (question_id, label, is_correct, feedback, rank)
        values (qq_id, opt ->> 'label', coalesce((opt ->> 'isCorrect')::boolean, false), coalesce(opt ->> 'feedback', ''), oi);
    end loop;
  end loop;
  return qid;
end;
$$;

-- ── Practical functions ───────────────────────────────────────────────────

create or replace function public.submit_practical(p_assignment uuid, p_paths text[], p_link text, p_note text)
returns public.submissions
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  a public.assignments%rowtype;
  latest public.submission_status;
  p text;
  result public.submissions%rowtype;
begin
  if not public.is_active_member() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into a from public.assignments where id = p_assignment;
  if a.id is null then raise exception 'practical not found' using errcode = 'P0002'; end if;
  if not public.is_faculty() and not exists (
    select 1 from public.lessons l join public.courses c on c.id = l.course_id
    where l.id = a.lesson_id and l.is_published and c.is_published) then
    raise exception 'practical not found' using errcode = 'P0002';
  end if;
  if not public.is_faculty() and public.lesson_locked(me, a.lesson_id) then
    raise exception 'This lesson is locked. Pass the quiz in the earlier module first.' using errcode = 'P0001';
  end if;

  -- Photos must be the caller's own uploads.
  foreach p in array coalesce(p_paths, '{}') loop
    if p not like me::text || '/%' or p like '%..%' then
      raise exception 'Upload your own photos.' using errcode = 'P0001';
    end if;
  end loop;

  select status into latest from public.submissions
    where assignment_id = a.id and user_id = me order by created_at desc limit 1;
  if latest = 'submitted' then
    raise exception 'Your last submission is still waiting for a trainer.' using errcode = 'P0001';
  elsif latest = 'approved' then
    raise exception 'This practical is already approved.' using errcode = 'P0001';
  end if;

  insert into public.submissions (assignment_id, user_id, course_id, photo_paths, link, note)
    values (a.id, me, a.course_id, coalesce(p_paths, '{}'), nullif(trim(p_link), ''), coalesce(p_note, ''))
    returning * into result;
  return result;
end;
$$;

create or replace function public.review_submission(p_submission uuid, p_scores jsonb, p_comment text, p_decision public.submission_status)
returns public.submissions
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  s public.submissions%rowtype;
  result public.submissions%rowtype;
begin
  if not public.is_faculty() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'redo') then raise exception 'Choose approve or redo.' using errcode = 'P0001'; end if;
  select * into s from public.submissions where id = p_submission for update;
  if s.id is null then raise exception 'submission not found' using errcode = 'P0002'; end if;
  if s.user_id = me then raise exception 'Ask another trainer to review your own work.' using errcode = 'P0001'; end if;
  if s.status <> 'submitted' then raise exception 'This submission has already been reviewed.' using errcode = 'P0001'; end if;

  insert into public.submission_reviews (submission_id, reviewer_id, scores, comment, decision)
    values (s.id, me, coalesce(p_scores, '{}'::jsonb), coalesce(p_comment, ''), p_decision);
  update public.submissions set status = p_decision, reviewed_at = now() where id = s.id
    returning * into result;

  if p_decision = 'approved' then
    insert into public.activity_events (user_id, kind, subject_id, xp, once)
      values (s.user_id, 'assignment.approved', s.assignment_id, 60, true)
      on conflict do nothing;
    perform public._maybe_complete_course(s.user_id, s.course_id);
  end if;
  return result;
end;
$$;

-- ── Public certificate check ──────────────────────────────────────────────

-- Anyone with a code can confirm it: name, course and date only.
create or replace function public.verify_certificate(p_code text)
returns table (full_name text, course_title text, school_name text, issued_at timestamptz)
language sql stable security definer set search_path = public as $$
  select u.full_name, c.title, s.name, ce.issued_at
  from public.certificates ce
  join public.users u on u.id = ce.user_id
  join public.courses c on c.id = ce.course_id
  join public.schools s on s.id = c.school_id
  where ce.code = upper(trim(p_code))
$$;

-- ── Storage: practical photos ─────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('submissions', 'submissions', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "submissions: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active_member());
create policy "submissions: read own or faculty" on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and public.is_active_member()
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_faculty()));

-- ── Grants ────────────────────────────────────────────────────────────────

revoke execute on function public.lesson_locked(uuid, uuid) from anon, authenticated, public;
revoke execute on function public._maybe_complete_course(uuid, uuid) from anon, authenticated, public;
revoke execute on function public._after_progress(uuid, public.lessons, int, boolean) from anon, authenticated, public;
revoke execute on function public.save_lesson_progress(uuid, int, int) from anon, public;
revoke execute on function public.set_lesson_completion(uuid, boolean) from anon, public;
revoke execute on function public.my_locked_lessons(uuid) from anon, public;
revoke execute on function public.get_quiz(uuid) from anon, public;
revoke execute on function public.submit_quiz(uuid, jsonb) from anon, public;
revoke execute on function public.admin_save_quiz(uuid, int, boolean, jsonb) from anon, public;
revoke execute on function public.submit_practical(uuid, text[], text, text) from anon, public;
revoke execute on function public.review_submission(uuid, jsonb, text, public.submission_status) from anon, public;
revoke execute on function public.verify_certificate(text) from public;

grant execute on function public.save_lesson_progress(uuid, int, int) to authenticated;
grant execute on function public.set_lesson_completion(uuid, boolean) to authenticated;
grant execute on function public.my_locked_lessons(uuid) to authenticated;
grant execute on function public.get_quiz(uuid) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;
grant execute on function public.admin_save_quiz(uuid, int, boolean, jsonb) to authenticated;
grant execute on function public.submit_practical(uuid, text[], text, text) to authenticated;
grant execute on function public.review_submission(uuid, jsonb, text, public.submission_status) to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
