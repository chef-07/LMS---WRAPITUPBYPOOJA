import 'server-only';
import { one } from './assessment';
import { demoCourses } from './demo-data';
import { isDemo } from './supabase/config';
import { supabaseServer } from './supabase/server';
import type { Department, Viewer } from './types';

const isFaculty = (v: Viewer) => v.role === 'admin' || v.role === 'trainer';

async function signed(bucket: 'sops' | 'showcase', paths: string[]): Promise<Record<string, string>> {
  if (isDemo || !paths.length) return {};
  const sb = await supabaseServer();
  const { data } = await sb.storage.from(bucket).createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

/* ── SOP library ────────────────────────────────────────────────────────── */

export type SopKind = 'template' | 'steps' | 'link' | 'file';
export type SopItem = {
  id: string;
  kind: SopKind;
  title: string;
  body: string;
  url: string | null;
  /** Signed URL for files, the link itself for links. */
  href: string | null;
  lesson: { title: string; href: string } | null;
  lessonId: string | null;
  lessonSeconds: number | null;
};
export type SopFolder = { id: string; title: string; emoji: string; description: string; departments: Department[]; items: SopItem[] };

const demoSops: SopFolder[] = [
  {
    id: 'sf1',
    title: 'WhatsApp replies',
    emoji: '💬',
    description: 'Copy, personalise the name, send.',
    departments: ['sales'],
    items: [
      { id: 'si1', kind: 'template', title: 'First reply to an enquiry', body: 'Hi {name}! 🎁 Thank you for reaching out to WrapItUpByPooja. May I know the occasion, the date you need it, and your budget? I’ll share a few options right away.', url: null, href: null, lesson: { title: 'The first reply', href: '/learn/whatsapp-sales/first-reply' }, lessonId: null, lessonSeconds: null },
      { id: 'si2', kind: 'template', title: '“Too expensive” reply', body: 'I completely understand! This hamper includes handmade packaging and premium dry fruits, which is why it’s ₹2,500. If you’d like, our mini hamper at ₹1,500 has the same finish in a smaller size. Shall I send a photo?', url: null, href: null, lesson: { title: 'When the customer says “too expensive”', href: '/learn/whatsapp-sales/price-objections' }, lessonId: null, lessonSeconds: null },
    ],
  },
  {
    id: 'sf2',
    title: 'Wrapping step cards',
    emoji: '🎀',
    description: 'Quick reminders at the work table.',
    departments: [],
    items: [
      { id: 'si3', kind: 'steps', title: 'Signature box wrap', body: 'Measure paper: box girth + 4 cm\nCrease every edge with a bone folder\nDouble-sided tape under the fold only\nFold ends: sides in, top down, bottom up\nRibbon: centre knot, trim at 45°\nTag on the top-right corner', url: null, href: null, lesson: { title: 'Sharp corners, every time', href: '/learn/perfect-box-wrap/sharp-corners' }, lessonId: null, lessonSeconds: null },
      { id: 'si4', kind: 'link', title: 'Material supplier price list', body: 'Updated monthly.', url: 'https://example.com/price-list', href: 'https://example.com/price-list', lesson: null, lessonId: null, lessonSeconds: null },
    ],
  },
  {
    id: 'sf3',
    title: 'Dispatch & courier',
    emoji: '🚚',
    description: 'Packing for courier and the handover checklist.',
    departments: [],
    items: [{ id: 'si5', kind: 'steps', title: 'Before handing to courier', body: 'Bubble-wrap glass items twice\nBox-in-box for anything fragile\nShake test: nothing moves\nLabel on top, “Fragile” on two sides\nPhoto of the sealed box to the customer', url: null, href: null, lesson: null, lessonId: null, lessonSeconds: null }],
  },
];

type DbSopItem = { id: string; kind: SopKind; title: string; body: string; url: string | null; lesson_id: string | null; lesson_seconds: number | null; rank: number; lessons: { title: string; slug: string; courses: { slug: string } | { slug: string }[] | null } | { title: string; slug: string; courses: { slug: string } | { slug: string }[] | null }[] | null };
type DbSopFolder = { id: string; title: string; emoji: string; description: string; departments: Department[]; rank: number; sop_items: DbSopItem[] };

export async function getSopLibrary(): Promise<SopFolder[]> {
  if (isDemo) return demoSops;
  const sb = await supabaseServer();
  const { data } = await sb
    .from('sop_folders')
    .select('id, title, emoji, description, departments, rank, sop_items(id, kind, title, body, url, lesson_id, lesson_seconds, rank, lessons(title, slug, courses(slug)))')
    .order('rank')
    .order('created_at');
  const folders = (data ?? []) as unknown as DbSopFolder[];
  const files = folders.flatMap((f) => f.sop_items.filter((i) => i.kind === 'file' && i.url).map((i) => i.url!));
  const urls = await signed('sops', files);
  return folders.map((f) => ({
    id: f.id,
    title: f.title,
    emoji: f.emoji,
    description: f.description,
    departments: f.departments,
    items: [...f.sop_items]
      .sort((a, b) => a.rank - b.rank)
      .map((i) => {
        const lesson = one(i.lessons);
        const course = one(lesson?.courses);
        return {
          id: i.id,
          kind: i.kind,
          title: i.title,
          body: i.body,
          url: i.url,
          href: i.kind === 'file' ? (i.url ? (urls[i.url] ?? null) : null) : i.url,
          lesson: lesson && course ? { title: lesson.title, href: `/learn/${course.slug}/${lesson.slug}${i.lesson_seconds ? `?t=${i.lesson_seconds}` : ''}` } : null,
          lessonId: i.lesson_id,
          lessonSeconds: i.lesson_seconds,
        };
      }),
  }));
}

/** Every lesson, for the "link to a lesson" pickers. */
export async function getLessonOptions(): Promise<{ id: string; label: string }[]> {
  if (isDemo) return demoCourses.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => ({ id: l.id, label: `${c.title} · ${l.title}` }))));
  const sb = await supabaseServer();
  const { data } = await sb.from('lessons').select('id, title, rank, courses(title)').order('rank').limit(2000);
  return ((data ?? []) as unknown as { id: string; title: string; courses: { title: string } | { title: string }[] | null }[])
    .map((l) => ({ id: l.id, label: `${one(l.courses)?.title ?? ''} · ${l.title}` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/* ── Announcements ──────────────────────────────────────────────────────── */

export type AdminAnnouncement = { id: string; title: string; body: string; isPinned: boolean; createdAt: string; readers: string[]; notRead: string[] };

export async function getAnnouncementsAdmin(): Promise<AdminAnnouncement[]> {
  if (isDemo) {
    return [{ id: 'a1', title: 'Diwali season starts 15 October', body: 'Finish "Festive Hamper Building" before then.', isPinned: true, createdAt: new Date().toISOString(), readers: ['Riya Sharma', 'Aman Verma'], notRead: ['Sneha Patel', 'Imran Khan'] }];
  }
  const sb = await supabaseServer();
  const [ann, reads, users] = await Promise.all([
    sb.from('announcements').select('id, title, body, is_pinned, created_at').order('created_at', { ascending: false }).limit(50),
    sb.from('announcement_reads').select('announcement_id, user_id').limit(10000),
    sb.from('users').select('id, full_name, is_disabled').eq('is_disabled', false),
  ]);
  const people = users.data ?? [];
  return (ann.data ?? []).map((a) => {
    const readIds = new Set((reads.data ?? []).filter((r) => r.announcement_id === a.id).map((r) => r.user_id));
    return {
      id: a.id,
      title: a.title,
      body: a.body,
      isPinned: a.is_pinned,
      createdAt: a.created_at,
      readers: people.filter((p) => readIds.has(p.id)).map((p) => p.full_name),
      notRead: people.filter((p) => !readIds.has(p.id)).map((p) => p.full_name),
    };
  });
}

/* ── Live sessions ──────────────────────────────────────────────────────── */

export type LiveItem = {
  id: string;
  title: string;
  host: string;
  description: string;
  startsAt: string;
  endsAt: string;
  attended: boolean;
  recording: { title: string; href: string } | null;
  recordingLessonId: string | null;
};

type DbLive = { id: string; title: string; host_name: string; description: string; starts_at: string; ends_at: string; recording_lesson_id: string | null; lessons: { title: string; slug: string; courses: { slug: string } | { slug: string }[] | null } | { title: string; slug: string; courses: { slug: string } | { slug: string }[] | null }[] | null };

export async function getLiveSessions(viewer: Viewer): Promise<{ upcoming: LiveItem[]; past: LiveItem[] }> {
  const now = Date.now();
  if (isDemo) {
    const mk = (id: string, title: string, inDays: number, attended = false): LiveItem => ({
      id,
      title,
      host: 'Pooja',
      description: inDays > 0 ? 'Bring a 20 cm box, paper and ribbon.' : '',
      startsAt: new Date(now + inDays * 86_400_000).toISOString(),
      endsAt: new Date(now + inDays * 86_400_000 + 3_600_000).toISOString(),
      attended,
      recording: inDays < 0 ? { title: 'Recording', href: '/learn/festive-hampers/diwali-theme' } : null,
      recordingLessonId: null,
    });
    return { upcoming: [mk('w1', 'Diwali hamper live demo', 2), mk('w2', 'Sales huddle: festive pricing', 5)], past: [mk('w0', 'Rakhi packing Q&A', -6, true)] };
  }
  const sb = await supabaseServer();
  const [sRes, aRes] = await Promise.all([
    sb.from('live_sessions').select('id, title, host_name, description, starts_at, ends_at, recording_lesson_id, lessons(title, slug, courses(slug))').order('starts_at', { ascending: false }).limit(100),
    sb.from('live_attendance').select('session_id').eq('user_id', viewer.id),
  ]);
  const attended = new Set((aRes.data ?? []).map((a) => a.session_id));
  const items = ((sRes.data ?? []) as unknown as DbLive[]).map((s): LiveItem => {
    const lesson = one(s.lessons);
    const course = one(lesson?.courses);
    return {
      id: s.id,
      title: s.title,
      host: s.host_name,
      description: s.description,
      startsAt: s.starts_at,
      endsAt: s.ends_at,
      attended: attended.has(s.id),
      recording: lesson && course ? { title: lesson.title, href: `/learn/${course.slug}/${lesson.slug}` } : null,
      recordingLessonId: s.recording_lesson_id,
    };
  });
  return {
    upcoming: items.filter((s) => new Date(s.endsAt).getTime() >= now).reverse(),
    past: items.filter((s) => new Date(s.endsAt).getTime() < now),
  };
}

export type AttendanceRow = { userId: string; name: string; department: Department | null; present: boolean; source: 'self' | 'trainer' | null };

export async function getLiveAdmin(id: string): Promise<{ session: LiveItem & { joinUrl: string | null }; attendance: AttendanceRow[] } | null> {
  if (isDemo) {
    const { upcoming } = await getLiveSessions({ id: 'demo', fullName: '', email: '', role: 'admin', department: null, avatarUrl: null });
    const s = upcoming.find((x) => x.id === id);
    if (!s) return null;
    return {
      session: { ...s, joinUrl: 'https://meet.google.com/abc-defg-hij' },
      attendance: [
        { userId: 'u1', name: 'Riya Sharma', department: 'artisan', present: true, source: 'self' },
        { userId: 'u2', name: 'Aman Verma', department: 'sales', present: false, source: null },
      ],
    };
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sb = await supabaseServer();
  const [sRes, url, att, users] = await Promise.all([
    sb.from('live_sessions').select('id, title, host_name, description, starts_at, ends_at, recording_lesson_id, lessons(title, slug, courses(slug))').eq('id', id).maybeSingle(),
    sb.rpc('live_join_url', { p_session: id }),
    sb.from('live_attendance').select('user_id, source').eq('session_id', id),
    sb.from('users').select('id, full_name, department').eq('is_disabled', false).order('full_name'),
  ]);
  const s = sRes.data as unknown as DbLive | null;
  if (!s) return null;
  const lesson = one(s.lessons);
  const course = one(lesson?.courses);
  const present = new Map((att.data ?? []).map((a) => [a.user_id, a.source as 'self' | 'trainer']));
  return {
    session: {
      id: s.id,
      title: s.title,
      host: s.host_name,
      description: s.description,
      startsAt: s.starts_at,
      endsAt: s.ends_at,
      attended: false,
      recording: lesson && course ? { title: lesson.title, href: `/learn/${course.slug}/${lesson.slug}` } : null,
      recordingLessonId: s.recording_lesson_id,
      joinUrl: (url.data as string | null) ?? null,
    },
    attendance: (users.data ?? []).map((u) => ({ userId: u.id, name: u.full_name, department: u.department, present: present.has(u.id), source: present.get(u.id) ?? null })),
  };
}

/* ── Showcase ───────────────────────────────────────────────────────────── */

export type Challenge = { id: string; title: string; brief: string; startsOn: string; endsOn: string; winnerPostId: string | null; isOpen: boolean; daysLeft: number };

function daysLeft(endsOn: string): number {
  return Math.max(0, Math.ceil((new Date(`${endsOn}T23:59:59+05:30`).getTime() - Date.now()) / 86_400_000));
}
export type ShowcasePost = {
  id: string;
  author: string;
  authorId: string;
  department: Department | null;
  caption: string;
  photoUrls: string[];
  challengeId: string | null;
  createdAt: string;
  isHidden: boolean;
  isWinner: boolean;
  reactions: Record<string, { count: number; mine: boolean }>;
};

export const EMOJIS = ['❤️', '🎀', '👏', '🔥'] as const;

function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

type DbPost = { id: string; user_id: string; challenge_id: string | null; caption: string; photo_paths: string[]; is_hidden: boolean; created_at: string; users: { full_name: string; department: Department | null } | { full_name: string; department: Department | null }[] | null; showcase_reactions: { user_id: string; emoji: string }[] };

export async function getShowcase(viewer: Viewer): Promise<{ current: Challenge | null; challenges: Challenge[]; posts: ShowcasePost[] }> {
  const today = todayIST();
  if (isDemo) {
    const d = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
    const current: Challenge = { id: 'ch1', title: 'Rakhi box in 10 minutes', brief: 'Wrap a small rakhi box with a pleated top and a mini bow. Photo from above in daylight.', startsOn: d(-2), endsOn: d(4), winnerPostId: null, isOpen: true, daysLeft: 4 };
    const r = (heart: number, bow: number) => ({ '❤️': { count: heart, mine: false }, '🎀': { count: bow, mine: bow > 1 }, '👏': { count: 0, mine: false }, '🔥': { count: 1, mine: false } });
    return {
      current,
      challenges: [current],
      posts: [
        { id: 'p1', author: 'Riya Sharma', authorId: 'u1', department: 'artisan', caption: 'Pleats took me three tries 😅', photoUrls: [], challengeId: 'ch1', createdAt: new Date().toISOString(), isHidden: false, isWinner: false, reactions: r(4, 2) },
        { id: 'p2', author: 'Sneha Patel', authorId: 'u3', department: 'social', caption: 'Shot this for tomorrow’s reel', photoUrls: [], challengeId: null, createdAt: new Date(Date.now() - 86_400_000).toISOString(), isHidden: false, isWinner: false, reactions: r(6, 1) },
      ],
    };
  }
  const sb = await supabaseServer();
  const [cRes, pRes] = await Promise.all([
    sb.from('challenges').select('id, title, brief, starts_on, ends_on, winner_post_id').order('starts_on', { ascending: false }).limit(30),
    sb
      .from('showcase_posts')
      .select('id, user_id, challenge_id, caption, photo_paths, is_hidden, created_at, users!showcase_posts_user_id_fkey(full_name, department), showcase_reactions(user_id, emoji)')
      .order('created_at', { ascending: false })
      .limit(120),
  ]);
  const challenges = (cRes.data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    brief: c.brief,
    startsOn: c.starts_on,
    endsOn: c.ends_on,
    winnerPostId: c.winner_post_id,
    isOpen: c.starts_on <= today && today <= c.ends_on,
    daysLeft: daysLeft(c.ends_on),
  }));
  const winners = new Set(challenges.map((c) => c.winnerPostId).filter(Boolean));
  const rows = (pRes.data ?? []) as unknown as DbPost[];
  const urls = await signed('showcase', rows.flatMap((p) => p.photo_paths));
  const posts = rows.map((p) => {
    const reactions: ShowcasePost['reactions'] = {};
    for (const e of EMOJIS) {
      const list = p.showcase_reactions.filter((r) => r.emoji === e);
      reactions[e] = { count: list.length, mine: list.some((r) => r.user_id === viewer.id) };
    }
    const u = one(p.users);
    return {
      id: p.id,
      author: u?.full_name ?? 'Team member',
      authorId: p.user_id,
      department: u?.department ?? null,
      caption: p.caption,
      photoUrls: p.photo_paths.map((x) => urls[x]).filter((x): x is string => !!x),
      challengeId: p.challenge_id,
      createdAt: p.created_at,
      isHidden: p.is_hidden,
      isWinner: winners.has(p.id),
      reactions,
    };
  });
  return { current: challenges.find((c) => c.isOpen) ?? null, challenges, posts };
}

/* ── Lesson Q&A ─────────────────────────────────────────────────────────── */

export type QaReply = { id: string; author: string; authorId: string; isFaculty: boolean; body: string; createdAt: string };
export type QaThread = QaReply & { isResolved: boolean; replies: QaReply[] };

type DbQuestion = { id: string; user_id: string; parent_id: string | null; body: string; is_resolved: boolean; created_at: string; users: { full_name: string; role: string } | { full_name: string; role: string }[] | null };

export async function getLessonQa(lessonId: string): Promise<QaThread[]> {
  if (isDemo) {
    if (lessonId !== demoCourses[1]?.modules[0]?.lessons[1]?.id) return [];
    const t = Date.now();
    return [
      {
        id: 'q1',
        author: 'Kavya Nair',
        authorId: 'u5',
        isFaculty: false,
        body: 'My corners keep puffing out on thick paper. Any tip?',
        createdAt: new Date(t - 7_200_000).toISOString(),
        isResolved: true,
        replies: [{ id: 'q2', author: 'Pooja', authorId: 'demo-pooja', isFaculty: true, body: 'Score the fold line first with the back of scissors, then crease with the bone folder. Watch 4:10 again.', createdAt: new Date(t - 3_600_000).toISOString() }],
      },
    ];
  }
  const sb = await supabaseServer();
  const { data } = await sb
    .from('lesson_questions')
    .select('id, user_id, parent_id, body, is_resolved, created_at, users(full_name, role)')
    .eq('lesson_id', lessonId)
    .order('created_at')
    .limit(500);
  const rows = (data ?? []) as unknown as DbQuestion[];
  const toReply = (r: DbQuestion): QaReply => {
    const u = one(r.users);
    return { id: r.id, author: u?.full_name ?? 'Team member', authorId: r.user_id, isFaculty: u?.role === 'admin' || u?.role === 'trainer', body: r.body, createdAt: r.created_at };
  };
  return rows
    .filter((r) => !r.parent_id)
    .map((q) => ({ ...toReply(q), isResolved: q.is_resolved, replies: rows.filter((r) => r.parent_id === q.id).map(toReply) }))
    .reverse();
}

/** For trainers: open questions nobody from the faculty has answered yet. */
export async function getOpenQuestions(): Promise<{ id: string; author: string; body: string; lessonTitle: string; href: string; createdAt: string }[]> {
  if (isDemo) return [];
  const sb = await supabaseServer();
  const { data } = await sb
    .from('lesson_questions')
    .select('id, parent_id, body, is_resolved, created_at, users(full_name, role), lessons(title, slug, courses(slug))')
    .order('created_at', { ascending: true })
    .limit(1000);
  const rows = (data ?? []) as unknown as (DbQuestion & { lessons: { title: string; slug: string; courses: { slug: string } | { slug: string }[] | null } | null })[];
  const answered = new Set(
    rows.filter((r) => r.parent_id && ['admin', 'trainer'].includes(one(r.users)?.role ?? '')).map((r) => r.parent_id!),
  );
  return rows
    .filter((r) => !r.parent_id && !r.is_resolved && !answered.has(r.id))
    .map((r) => {
      const lesson = one(r.lessons);
      const course = one(lesson?.courses);
      return {
        id: r.id,
        author: one(r.users)?.full_name ?? 'Team member',
        body: r.body,
        lessonTitle: lesson?.title ?? 'Lesson',
        href: lesson && course ? `/learn/${course.slug}/${lesson.slug}?tab=discussion` : '/',
        createdAt: r.created_at,
      };
    });
}

export { isFaculty };

/* ── Bell and dashboard extras ──────────────────────────────────────────── */

export type TeamBellItem = { id: string; title: string; body: string; href: string };

export async function getTeamLifeBell(viewer: Viewer): Promise<TeamBellItem[]> {
  if (isDemo) return [];
  const sb = await supabaseServer();
  const now = new Date();
  const since = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const [ann, reads, mine, live, ch, entries] = await Promise.all([
    sb.from('announcements').select('id, title').eq('is_pinned', true).order('created_at', { ascending: false }).limit(5),
    sb.from('announcement_reads').select('announcement_id').eq('user_id', viewer.id),
    sb.from('lesson_questions').select('id, lessons(title, slug, courses(slug))').eq('user_id', viewer.id).is('parent_id', null).limit(200),
    sb.from('live_sessions').select('id, title, starts_at').gte('starts_at', now.toISOString()).lte('starts_at', new Date(now.getTime() + 2 * 3_600_000).toISOString()).limit(3),
    sb.from('challenges').select('id, title, starts_on, ends_on').lte('starts_on', todayIST()).gte('ends_on', todayIST()).limit(1),
    sb.from('showcase_posts').select('challenge_id').eq('user_id', viewer.id).not('challenge_id', 'is', null),
  ]);
  const items: TeamBellItem[] = [];
  const read = new Set((reads.data ?? []).map((r) => r.announcement_id));
  for (const a of ann.data ?? []) if (!read.has(a.id)) items.push({ id: `ann-${a.id}`, title: `📣 ${a.title}`, body: 'Pinned on your dashboard.', href: '/' });
  for (const s of live.data ?? []) items.push({ id: `live-${s.id}`, title: `🎤 Starting soon: ${s.title}`, body: 'The join button opens 15 minutes before.', href: '/live' });
  const c = ch.data?.[0];
  if (c && !(entries.data ?? []).some((e) => e.challenge_id === c.id)) items.push({ id: `ch-${c.id}`, title: `🎀 Wrap of the Week: ${c.title}`, body: 'Enter for +40 XP.', href: '/showcase' });

  const myQs = (mine.data ?? []) as unknown as { id: string; lessons: { title: string; slug: string; courses: { slug: string } | { slug: string }[] | null } | null }[];
  if (myQs.length) {
    const { data: replies } = await sb
      .from('lesson_questions')
      .select('id, parent_id, created_at, users(full_name)')
      .in('parent_id', myQs.map((q) => q.id))
      .neq('user_id', viewer.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5);
    for (const r of (replies ?? []) as unknown as { id: string; parent_id: string; users: { full_name: string } | { full_name: string }[] | null }[]) {
      const q = myQs.find((x) => x.id === r.parent_id);
      const lesson = q?.lessons;
      const course = one(lesson?.courses);
      if (!lesson || !course) continue;
      items.push({ id: `qa-${r.id}`, title: `💬 ${one(r.users)?.full_name ?? 'Someone'} replied to your question`, body: lesson.title, href: `/learn/${course.slug}/${lesson.slug}?tab=discussion` });
    }
  }
  return items;
}

export async function getDashboardExtras(viewer: Viewer): Promise<{ challenge: { title: string } | null; attendedLive: boolean }> {
  if (isDemo) return { challenge: { title: 'Rakhi box in 10 minutes' }, attendedLive: false };
  const sb = await supabaseServer();
  const [ch, att] = await Promise.all([
    sb.from('challenges').select('title').lte('starts_on', todayIST()).gte('ends_on', todayIST()).limit(1),
    sb.from('live_attendance').select('session_id', { count: 'exact', head: true }).eq('user_id', viewer.id),
  ]);
  return { challenge: ch.data?.[0] ? { title: ch.data[0].title } : null, attendedLive: (att.count ?? 0) > 0 };
}
