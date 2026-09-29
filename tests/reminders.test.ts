import { describe, expect, test } from 'vitest';
import { renderEmail } from '@/lib/email/render';
import { signUnsub, unsubscribeUrl, verifyUnsub } from '@/lib/email/token';
import { planEmails, streakEndingOn, toReportInput, type EmailPlan, type SnapPerson, type Snapshot } from '@/lib/reminders';

const TODAY = '2026-09-28'; // a Monday
const NOW = Date.parse('2026-09-28T03:30:00Z'); // 9:00 India time
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString();
const day = (n: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

function person(id: string, over: Partial<SnapPerson> = {}): SnapPerson {
  return { id, email: `${id}@x.in`, name: `${id[0]!.toUpperCase()}${id.slice(1)} Test`, role: 'member', department: 'artisan', createdAt: ago(60), startOn: day(-60), reminders: true, streak: true, digest: true, ...over };
}

function snap(over: Partial<Snapshot> = {}): Snapshot {
  return {
    today: TODAY,
    people: [person('riya')],
    courses: [
      {
        id: 'c1',
        slug: 'box-basics',
        title: 'Box Basics',
        departments: [],
        modules: [
          { id: 'm1', title: 'Corners', dripDays: 0, lessons: [{ id: 'l1', slug: 'corners', title: 'Sharp corners' }, { id: 'l2', slug: 'tape', title: 'Hidden tape' }] },
          { id: 'm2', title: 'Bows', dripDays: 7, lessons: [{ id: 'l3', slug: 'bows', title: 'Classic bow' }] },
        ],
      },
      { id: 'c2', slug: 'whatsapp', title: 'WhatsApp quoting', departments: ['sales'], modules: [{ id: 'm3', title: 'Replies', dripDays: 0, lessons: [{ id: 'l4', slug: 'first-reply', title: 'First reply' }] }] },
    ],
    completions: [],
    activityDays: { riya: [day(-1)] },
    xp: {},
    lastActive: { riya: ago(1) },
    certificates: [],
    waitingReviews: [],
    redo: [],
    failedQuizzes: [],
    cohorts: [],
    campaigns: [],
    live: [],
    emailLog: [],
    ...over,
  };
}

const only = (plans: EmailPlan[], kind: EmailPlan['kind'], userId = 'riya') => plans.filter((p) => p.kind === kind && p.userId === userId);

describe('streakEndingOn', () => {
  test('counts back from the end date and stops at a gap', () => {
    const days = ['2026-09-20', '2026-09-22', '2026-09-23', '2026-09-24'];
    expect(streakEndingOn(days, '2026-09-24')).toBe(3);
    expect(streakEndingOn(days, '2026-09-20')).toBe(1);
    expect(streakEndingOn(days, '2026-09-25')).toBe(0);
    expect(streakEndingOn([], '2026-09-25')).toBe(0);
  });
});

describe('morning reminders', () => {
  test('nothing to act on means no email', () => {
    expect(planEmails(snap(), 'morning', NOW)).toEqual([]);
  });

  test('a live session later today is sent even the day after another reminder', () => {
    const s = snap({ live: [{ id: 'v1', title: 'Hamper finishing', hostName: 'Pooja', startsAt: '2026-09-28T10:30:00Z' }], emailLog: [{ userId: 'riya', kind: 'reminder', sentOn: day(-1) }] });
    const [plan] = only(planEmails(s, 'morning', NOW), 'reminder');
    expect(plan!.items).toHaveLength(1);
    expect(plan!.items[0]!.text).toBe('Live today at 4:00 pm: Hamper finishing with Pooja.');
    expect(plan!.subject).toBe(plan!.items[0]!.text);
    expect(plan!.to).toBe('riya@x.in');
    expect(plan!.heading).toBe('Good morning, Riya');
  });

  test('a session that already started is not announced', () => {
    const s = snap({ live: [{ id: 'v1', title: 'Early', hostName: 'Pooja', startsAt: '2026-09-28T03:00:00Z' }] });
    expect(planEmails(s, 'morning', NOW)).toEqual([]);
  });

  test('ongoing items wait 3 days between emails', () => {
    const redo = [{ userId: 'riya', lessonId: 'l2', title: 'Hidden tape', since: ago(1) }];
    expect(planEmails(snap({ redo, emailLog: [{ userId: 'riya', kind: 'reminder', sentOn: day(-2) }] }), 'morning', NOW)).toEqual([]);
    const [plan] = planEmails(snap({ redo, emailLog: [{ userId: 'riya', kind: 'reminder', sentOn: day(-3) }] }), 'morning', NOW);
    expect(plan!.items[0]).toMatchObject({ emoji: '🔁', href: '/learn/box-basics/tape' });
  });

  test('never twice on the same day, and never when switched off', () => {
    const redo = [{ userId: 'riya', lessonId: 'l2', title: 'Hidden tape', since: ago(1) }];
    expect(planEmails(snap({ redo, emailLog: [{ userId: 'riya', kind: 'reminder', sentOn: TODAY }] }), 'morning', NOW)).toEqual([]);
    expect(planEmails(snap({ redo, people: [person('riya', { reminders: false })] }), 'morning', NOW)).toEqual([]);
  });

  test('a failed required quiz links to its lesson', () => {
    const [plan] = planEmails(snap({ failedQuizzes: [{ userId: 'riya', lessonId: 'l1', title: 'Sharp corners' }] }), 'morning', NOW);
    expect(plan!.items[0]).toMatchObject({ emoji: '📝', text: 'Pass the quiz in “Sharp corners” to open the next module.', href: '/learn/box-basics/corners' });
  });

  test('a drip module opening today', () => {
    const s = snap({ people: [person('riya', { startOn: day(-7) })] });
    const [plan] = planEmails(s, 'morning', NOW);
    expect(plan!.items[0]).toMatchObject({ key: 'drip-m2', text: 'New today: “Bows” in Box Basics is open.', href: '/learn/box-basics/bows', timely: true });
  });

  test('only the courses for my team count', () => {
    const s = snap({ people: [person('riya', { startOn: day(-7), department: 'sales' })] });
    // Box Basics is for everyone, so the drip still applies; WhatsApp is for sales.
    const campaign = { id: 'k', title: 'Festive pricing', emoji: '💬', dueOn: day(3), startsOn: day(-10), departments: ['sales' as const], courseIds: ['c2'] };
    const [plan] = planEmails({ ...s, campaigns: [campaign] }, 'morning', NOW);
    expect(plan!.items.map((i) => i.key)).toEqual(['drip-m2', 'camp-k']);
    const artisan = planEmails({ ...snap(), campaigns: [campaign] }, 'morning', NOW);
    expect(artisan).toEqual([]);
  });

  test('campaigns remind 7, 3, 1 and 0 days out, and weekly-ish once overdue', () => {
    const at = (left: number, done = false) =>
      planEmails(snap({ campaigns: [{ id: 'k', title: 'Diwali refresher', emoji: '🪔', dueOn: day(left), startsOn: day(-20), departments: [], courseIds: ['c1'] }], completions: done ? ['l1', 'l2', 'l3'].map((lessonId) => ({ userId: 'riya', lessonId, completedAt: ago(2) })) : [] }), 'morning', NOW);
    expect(at(3)[0]!.items[0]).toMatchObject({ text: 'Diwali refresher is due in 3 days. You’ve done 0 of 3 lessons.', href: '/learn/box-basics/corners', timely: true });
    expect(at(0)[0]!.items[0]!.text).toContain('is due today');
    expect(at(5)).toEqual([]);
    expect(at(-2)[0]!.items[0]).toMatchObject({ text: 'Diwali refresher was due 2 days ago. You’ve done 0 of 3 lessons.', timely: false });
    expect(at(-9)).toEqual([]);
    expect(at(3, true)).toEqual([]);
  });

  test('behind in a batch', () => {
    const s = snap({ cohorts: [{ id: 'b', title: 'October batch', startsOn: day(-10), endsOn: day(10), memberIds: ['riya'], courseIds: ['c1'] }] });
    const [plan] = planEmails(s, 'morning', NOW);
    expect(plan!.items[0]!.text).toBe('October batch: you’re 0% through on day 11 of 21. A lesson a day gets you back on track.');
  });

  test('quiet for a week: pick up where you left off, at most weekly', () => {
    const quiet = { activityDays: { riya: [day(-9)] }, lastActive: { riya: ago(9) }, completions: [{ userId: 'riya', lessonId: 'l1', completedAt: ago(9) }] };
    const [plan] = planEmails(snap(quiet), 'morning', NOW);
    expect(plan!.items).toEqual([expect.objectContaining({ key: 'resume', text: 'Pick up where you left off: “Hidden tape” in Box Basics.', href: '/learn/box-basics/tape', idle: true })]);
    expect(planEmails(snap({ ...quiet, emailLog: [{ userId: 'riya', kind: 'reminder', sentOn: day(-5) }] }), 'morning', NOW)).toEqual([]);
    expect(planEmails(snap({ ...quiet, emailLog: [{ userId: 'riya', kind: 'reminder', sentOn: day(-7) }] }), 'morning', NOW)).toHaveLength(1);
  });

  test('never started: the first lesson, from day 3', () => {
    const fresh = (joined: number) => snap({ people: [person('riya', { createdAt: ago(joined), startOn: day(-joined) })], activityDays: {}, lastActive: {} });
    expect(planEmails(fresh(1), 'morning', NOW)).toEqual([]);
    expect(planEmails(fresh(4), 'morning', NOW)[0]!.items[0]!.text).toBe('Your first lesson is waiting: “Sharp corners” in Box Basics.');
  });

  test('trainers hear about practicals waiting more than a day; members do not', () => {
    const waitingReviews = [
      { id: 's1', userId: 'riya', title: 'Hidden tape', createdAt: ago(3) },
      { id: 's2', userId: 'riya', title: 'Corners', createdAt: ago(0.5) },
    ];
    const plans = planEmails(snap({ people: [person('riya'), person('tara', { role: 'trainer' })], waitingReviews, activityDays: { riya: [TODAY], tara: [TODAY] } }), 'morning', NOW);
    expect(plans.map((p) => p.userId)).toEqual(['tara']);
    expect(plans[0]!.items[0]).toMatchObject({ text: '1 practical waiting for your review (oldest 3 days).', href: '/admin/reviews' });
  });

  test('admins get no learner nudges', () => {
    const s = snap({ people: [person('pooja', { role: 'admin', department: null, createdAt: ago(90) })], activityDays: {}, lastActive: {}, redo: [{ userId: 'pooja', lessonId: 'l1', title: 'x', since: null }] });
    expect(only(planEmails(s, 'morning', NOW), 'reminder', 'pooja')).toEqual([]);
  });

  test('time-bound items come first; at most six', () => {
    const redo = ['l1', 'l2', 'l3', 'l4'].map((lessonId) => ({ userId: 'riya', lessonId, title: lessonId, since: null }));
    const failedQuizzes = ['l1', 'l2'].map((lessonId) => ({ userId: 'riya', lessonId, title: lessonId }));
    const live = [{ id: 'v', title: 'Live', hostName: 'Pooja', startsAt: '2026-09-28T12:00:00Z' }];
    const [plan] = planEmails(snap({ people: [person('riya', { department: 'sales' })], redo, failedQuizzes, live }), 'morning', NOW);
    expect(plan!.items).toHaveLength(6);
    expect(plan!.items[0]!.key).toBe('live-v');
    expect(plan!.subject).toBe('Riya, 6 things for you today');
  });
});

describe('evening streak email', () => {
  const streak = (days: string[], over: Partial<Snapshot> = {}) => planEmails(snap({ activityDays: { riya: days }, ...over }), 'evening', NOW);

  test('a streak that ends tonight', () => {
    const [plan] = streak([day(-3), day(-2), day(-1)]);
    expect(plan).toMatchObject({ kind: 'streak', subject: 'Keep your 3-day streak going 🔥', cta: { label: 'Keep my streak', href: '/learn/box-basics/corners' } });
  });

  test('not after learning today, not for a single day, not twice, not when off', () => {
    expect(streak([day(-2), day(-1), TODAY])).toEqual([]);
    expect(streak([day(-1)])).toEqual([]);
    expect(streak([day(-2), day(-1)], { emailLog: [{ userId: 'riya', kind: 'streak', sentOn: TODAY }] })).toEqual([]);
    expect(streak([day(-2), day(-1)], { people: [person('riya', { streak: false })] })).toEqual([]);
  });

  test('day 6 mentions the 7-day badge', () => {
    const [plan] = streak([-6, -5, -4, -3, -2, -1].map(day));
    expect(plan!.intro).toContain('7-day streak badge');
  });

  test('nothing left to learn means no nudge', () => {
    const completions = ['l1', 'l2', 'l3'].map((lessonId) => ({ userId: 'riya', lessonId, completedAt: ago(2) }));
    expect(streak([day(-2), day(-1)], { completions })).toEqual([]);
  });

  test('the morning job never sends streak emails', () => {
    expect(only(planEmails(snap({ activityDays: { riya: [day(-2), day(-1)] } }), 'morning', NOW), 'streak')).toEqual([]);
  });
});

describe('Monday digest', () => {
  const team = () =>
    snap({
      people: [person('pooja', { role: 'admin', department: null }), person('riya'), person('aman', { department: 'sales' })],
      activityDays: { riya: [day(-3), TODAY], aman: [day(-20)] },
      lastActive: { riya: ago(0), aman: ago(20) },
      completions: [
        { userId: 'riya', lessonId: 'l1', completedAt: ago(3) },
        { userId: 'riya', lessonId: 'l2', completedAt: ago(0.1) },
        { userId: 'aman', lessonId: 'l4', completedAt: ago(20) },
      ],
      certificates: [{ userId: 'riya', courseId: 'c1', issuedAt: ago(2) }],
      waitingReviews: [{ id: 's1', userId: 'riya', title: 'Hidden tape', createdAt: ago(4) }],
    });

  test('admins get last week’s numbers and who needs a word', () => {
    const [plan] = only(planEmails(team(), 'morning', NOW), 'digest', 'pooja');
    expect(plan!.subject).toBe('Your team last week: 1 lesson, 1 of 2 learning');
    expect(plan!.stats).toEqual([
      { label: 'Learned last week', value: '1 of 2' },
      { label: 'Lessons finished', value: '1' },
      { label: 'Certificates', value: '1' },
      { label: 'Practicals waiting', value: '1' },
    ]);
    expect(plan!.items.map((i) => i.text)).toEqual(expect.arrayContaining(['Riya Test: Practical waiting 4 days for review.']));
    expect(plan!.cta.href).toBe('/admin/reports');
  });

  test('only on Mondays, only once a week, only when wanted', () => {
    const tuesday = { ...team(), today: day(1) };
    expect(only(planEmails(tuesday, 'morning', NOW + 86_400_000), 'digest', 'pooja')).toEqual([]);
    expect(only(planEmails({ ...team(), emailLog: [{ userId: 'pooja', kind: 'digest', sentOn: day(-2) }] }, 'morning', NOW), 'digest', 'pooja')).toEqual([]);
    const off = team();
    off.people[0]!.digest = false;
    expect(only(planEmails(off, 'morning', NOW), 'digest', 'pooja')).toEqual([]);
  });

  test('batch and campaign pace feed the report like the admin pages', () => {
    const s = { ...team(), cohorts: [{ id: 'b', title: 'Oct batch', startsOn: day(-30), endsOn: day(-1), memberIds: ['riya', 'pooja'], courseIds: ['c1'] }] };
    const input = toReportInput(s, NOW);
    expect(input.people.map((p) => p.id)).toEqual(['riya', 'aman']);
    expect(input.batches).toEqual([{ userId: 'riya', title: 'Oct batch', endsOn: day(-1), status: 'overdue' }]);
  });
});

describe('email rendering', () => {
  const plan: EmailPlan = {
    userId: 'u',
    to: 'riya@x.in',
    firstName: 'Riya',
    kind: 'reminder',
    subject: 'x',
    heading: 'Good morning, <Riya>',
    intro: 'Here’s what needs you today',
    items: [{ key: 'a', emoji: '🔁', text: 'Redo “Tape & bows”', href: '/learn/a/b', timely: false }],
    cta: { label: 'Open the university', href: '/learn/a/b' },
  };
  const links = { siteUrl: 'https://wiu.test/', unsubscribeUrl: 'https://wiu.test/unsubscribe?u=u&k=reminders&t=abc' };

  test('escapes text and uses absolute links', () => {
    const { html, text } = renderEmail(plan, links);
    expect(html).toContain('Good morning, &lt;Riya&gt;');
    expect(html).toContain('Redo “Tape &amp; bows”');
    expect(html).not.toContain('<Riya>');
    expect(html).toContain('href="https://wiu.test/learn/a/b"');
    expect(html).toContain('href="https://wiu.test/unsubscribe?u=u&amp;k=reminders&amp;t=abc"');
    expect(text).toContain('🔁 Redo “Tape & bows”\n   https://wiu.test/learn/a/b');
    expect(text).toContain('Stop reminder emails: https://wiu.test/unsubscribe?u=u&k=reminders&t=abc');
  });

  test('digest stats', () => {
    const { html, text } = renderEmail({ ...plan, kind: 'digest', stats: [{ label: 'Lessons finished', value: '12' }] }, links);
    expect(html).toContain('>12</div>');
    expect(text).toContain('Lessons finished: 12');
    expect(text).toContain('Stop the Monday summary');
  });
});

describe('unsubscribe tokens', () => {
  const secret = 's'.repeat(40);
  test('round trip, and a token only works for its own person and kind', () => {
    const t = signUnsub('u1', 'streak', secret);
    expect(verifyUnsub('u1', 'streak', t, secret)).toBe(true);
    expect(verifyUnsub('u1', 'reminders', t, secret)).toBe(false);
    expect(verifyUnsub('u2', 'streak', t, secret)).toBe(false);
    expect(verifyUnsub('u1', 'streak', t, 'other'.repeat(8))).toBe(false);
    expect(verifyUnsub('u1', 'streak', t.slice(1), secret)).toBe(false);
    expect(verifyUnsub('u1', 'bogus', t, secret)).toBe(false);
    expect(verifyUnsub('u1', 'streak', t, '')).toBe(false);
  });
  test('link', () => {
    expect(unsubscribeUrl('https://wiu.test/', 'u1', 'digest', secret)).toBe(`https://wiu.test/unsubscribe?u=u1&k=digest&t=${signUnsub('u1', 'digest', secret)}`);
  });
});
