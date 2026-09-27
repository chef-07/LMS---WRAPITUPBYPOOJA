-- Phase 6: team life. SOP library, announcements read receipts, live
-- session attendance, lesson Q&A, Wrap of the Week + Showcase.

create or replace function public.my_department()
returns public.department
language sql stable security definer set search_path = public as $$
  select department from public.users where id = auth.uid() and not is_disabled
$$;

-- ── SOP library ───────────────────────────────────────────────────────────

create type public.sop_kind as enum ('template', 'steps', 'link', 'file');

create table public.sop_folders (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 80),
  emoji text not null default '📁',
  description text not null default '' check (length(description) <= 300),
  -- Empty means everyone; otherwise these departments (faculty see all).
  departments public.department[] not null default '{}',
  rank int not null default 0,
  created_at timestamptz not null default now()
);

create table public.sop_items (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.sop_folders (id) on delete cascade,
  kind public.sop_kind not null,
  title text not null check (length(title) between 1 and 120),
  -- template: the text to copy; steps: one step per line; link/file: a note.
  body text not null default '' check (length(body) <= 5000),
  -- link: an https URL; file: a path in the private "sops" bucket.
  url text check (url is null or length(url) <= 500),
  lesson_id uuid references public.lessons (id) on delete set null,
  lesson_seconds int check (lesson_seconds is null or lesson_seconds >= 0),
  rank int not null default 0,
  updated_at timestamptz not null default now(),
  check (kind not in ('link', 'file') or url is not null),
  check (kind <> 'link' or url ~ '^https://')
);
create index sop_items_folder_idx on public.sop_items (folder_id, rank);

alter table public.sop_folders enable row level security;
alter table public.sop_items enable row level security;

create policy sop_folders_read on public.sop_folders for select using (
  public.is_active_member() and (public.is_faculty() or cardinality(departments) = 0 or public.my_department() = any (departments))
);
create policy sop_folders_admin on public.sop_folders for all using (public.is_admin()) with check (public.is_admin());
create policy sop_items_read on public.sop_items for select using (
  public.is_active_member() and exists (select 1 from public.sop_folders f where f.id = folder_id)
);
create policy sop_items_admin on public.sop_items for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sops', 'sops', false, 15728640, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "sops: admins upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'sops' and public.is_admin());
create policy "sops: admins delete" on storage.objects for delete to authenticated
  using (bucket_id = 'sops' and public.is_admin());
create policy "sops: members read" on storage.objects for select to authenticated
  using (bucket_id = 'sops' and public.is_active_member());

-- ── Live sessions ─────────────────────────────────────────────────────────

alter table public.live_sessions add column description text not null default '' check (length(description) <= 1000);
alter table public.live_sessions add column recording_lesson_id uuid references public.lessons (id) on delete set null;
-- join_url stays hidden (see core migration); the new columns are readable.
grant select (description, recording_lesson_id) on public.live_sessions to authenticated;

create table public.live_attendance (
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  source text not null default 'self' check (source in ('self', 'trainer')),
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
alter table public.live_attendance enable row level security;
create policy attendance_read on public.live_attendance for select using (
  public.is_active_member() and (user_id = auth.uid() or public.is_faculty())
);

-- Opens the Meet link from 15 minutes before the start to the end, and
-- records attendance (+20 XP once per session).
create or replace function public.join_live_session(p_session uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  s public.live_sessions%rowtype;
begin
  if not public.is_active_member() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into s from public.live_sessions where id = p_session;
  if s.id is null then raise exception 'session not found' using errcode = 'P0002'; end if;
  if s.join_url is null then raise exception 'The joining link hasn’t been added yet.' using errcode = 'P0001'; end if;
  if now() < s.starts_at - interval '15 minutes' then
    raise exception 'The link opens 15 minutes before the start.' using errcode = 'P0001';
  end if;
  if now() > s.ends_at then raise exception 'This session has ended.' using errcode = 'P0001'; end if;
  insert into public.live_attendance (session_id, user_id, source) values (s.id, me, 'self')
    on conflict do nothing;
  insert into public.activity_events (user_id, kind, subject_id, xp, once)
    values (me, 'live.attended', s.id, 20, true) on conflict do nothing;
  return s.join_url;
end;
$$;

-- Trainers tick who attended (or untick). XP is awarded once and kept.
create or replace function public.mark_attendance(p_session uuid, p_user uuid, p_present boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_faculty() then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.live_sessions where id = p_session) then
    raise exception 'session not found' using errcode = 'P0002';
  end if;
  if p_present then
    insert into public.live_attendance (session_id, user_id, source) values (p_session, p_user, 'trainer')
      on conflict do nothing;
    insert into public.activity_events (user_id, kind, subject_id, xp, once)
      values (p_user, 'live.attended', p_session, 20, true) on conflict do nothing;
  else
    delete from public.live_attendance where session_id = p_session and user_id = p_user;
  end if;
end;
$$;

-- ── Lesson Q&A ────────────────────────────────────────────────────────────

create table public.lesson_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  parent_id uuid references public.lesson_questions (id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  is_resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index lesson_questions_lesson_idx on public.lesson_questions (lesson_id, created_at);
create index lesson_questions_parent_idx on public.lesson_questions (parent_id);
alter table public.lesson_questions enable row level security;

create policy questions_q_read on public.lesson_questions for select using (
  public.is_active_member() and exists (select 1 from public.lessons l where l.id = lesson_id)
);
create policy questions_q_insert on public.lesson_questions for insert with check (
  user_id = auth.uid() and public.is_active_member() and not is_resolved
  and exists (select 1 from public.lessons l where l.id = lesson_id)
);
-- The asker or faculty can mark a thread resolved; faculty or the author can delete.
create policy questions_q_update on public.lesson_questions for update
  using (public.is_active_member() and (user_id = auth.uid() or public.is_faculty()))
  with check (public.is_active_member() and (user_id = auth.uid() or public.is_faculty()));
create policy questions_q_delete on public.lesson_questions for delete using (
  public.is_active_member() and (user_id = auth.uid() or public.is_faculty())
);

-- Replies go one level deep, under a question of the same lesson; only the
-- resolved flag may change after posting.
create or replace function public.guard_lesson_question() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  parent public.lesson_questions%rowtype;
begin
  if tg_op = 'UPDATE' then
    if new.body is distinct from old.body or new.user_id is distinct from old.user_id
       or new.lesson_id is distinct from old.lesson_id or new.parent_id is distinct from old.parent_id then
      raise exception 'Only the resolved flag can change.' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if new.parent_id is not null then
    select * into parent from public.lesson_questions where id = new.parent_id;
    if parent.id is null or parent.parent_id is not null or parent.lesson_id <> new.lesson_id then
      raise exception 'Reply to a question in this lesson.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
create trigger lesson_questions_guard before insert or update on public.lesson_questions
  for each row execute function public.guard_lesson_question();

-- ── Wrap of the Week + Showcase ───────────────────────────────────────────

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 120),
  brief text not null default '' check (length(brief) <= 2000),
  starts_on date not null,
  ends_on date not null,
  winner_post_id uuid,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table public.showcase_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  challenge_id uuid references public.challenges (id) on delete set null,
  caption text not null default '' check (length(caption) <= 500),
  photo_paths text[] not null check (cardinality(photo_paths) between 1 and 4),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index showcase_posts_created_idx on public.showcase_posts (created_at desc);
alter table public.challenges add constraint challenges_winner_fk
  foreign key (winner_post_id) references public.showcase_posts (id) on delete set null;

create table public.showcase_reactions (
  post_id uuid not null references public.showcase_posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '🎀', '👏', '🔥')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);

alter table public.challenges enable row level security;
alter table public.showcase_posts enable row level security;
alter table public.showcase_reactions enable row level security;

create policy challenges_read on public.challenges for select using (public.is_active_member());
create policy challenges_admin on public.challenges for all using (public.is_admin()) with check (public.is_admin());

create policy posts_read on public.showcase_posts for select using (
  public.is_active_member() and (not is_hidden or user_id = auth.uid() or public.is_faculty())
);
-- Own photos only; a challenge entry only while the challenge is open (India time).
create policy posts_insert on public.showcase_posts for insert with check (
  user_id = auth.uid() and public.is_active_member() and not is_hidden
  and not exists (select 1 from unnest(photo_paths) p where p not like auth.uid()::text || '/%' or p like '%..%')
  and (challenge_id is null or exists (
    select 1 from public.challenges c where c.id = challenge_id
      and (now() at time zone 'Asia/Kolkata')::date between c.starts_on and c.ends_on))
);
create policy posts_hide on public.showcase_posts for update using (public.is_faculty()) with check (public.is_faculty());
create policy posts_delete on public.showcase_posts for delete using (
  public.is_active_member() and (user_id = auth.uid() or public.is_faculty())
);

create policy reactions_read on public.showcase_reactions for select using (public.is_active_member());
create policy reactions_own on public.showcase_reactions for insert with check (user_id = auth.uid() and public.is_active_member());
create policy reactions_delete on public.showcase_reactions for delete using (user_id = auth.uid());

-- Entering this week's challenge: +40 XP once per challenge.
create or replace function public.on_showcase_post() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.challenge_id is not null then
    insert into public.activity_events (user_id, kind, subject_id, xp, once)
      values (new.user_id, 'challenge.entered', new.challenge_id, 40, true) on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger showcase_posts_xp after insert on public.showcase_posts
  for each row execute function public.on_showcase_post();

-- Pooja picks the winner: +100 XP once.
create or replace function public.pick_challenge_winner(p_challenge uuid, p_post uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  winner uuid;
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  select user_id into winner from public.showcase_posts where id = p_post and challenge_id = p_challenge and not is_hidden;
  if winner is null then raise exception 'Pick one of this challenge’s entries.' using errcode = 'P0001'; end if;
  update public.challenges set winner_post_id = p_post where id = p_challenge;
  insert into public.activity_events (user_id, kind, subject_id, xp, once)
    values (winner, 'challenge.won', p_challenge, 100, true) on conflict do nothing;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('showcase', 'showcase', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "showcase: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'showcase' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active_member());
create policy "showcase: members read" on storage.objects for select to authenticated
  using (bucket_id = 'showcase' and public.is_active_member());

-- ── Grants ────────────────────────────────────────────────────────────────

revoke execute on function public.my_department() from anon, public;
revoke execute on function public.join_live_session(uuid) from anon, public;
revoke execute on function public.mark_attendance(uuid, uuid, boolean) from anon, public;
revoke execute on function public.pick_challenge_winner(uuid, uuid) from anon, public;
revoke execute on function public.guard_lesson_question() from anon, authenticated, public;
revoke execute on function public.on_showcase_post() from anon, authenticated, public;
grant execute on function public.my_department() to authenticated;
grant execute on function public.join_live_session(uuid) to authenticated;
grant execute on function public.mark_attendance(uuid, uuid, boolean) to authenticated;
grant execute on function public.pick_challenge_winner(uuid, uuid) to authenticated;
