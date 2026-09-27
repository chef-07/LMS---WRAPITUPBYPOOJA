/**
 * Sample content shown when Supabase is not configured, so the app can be run
 * and reviewed straight after cloning. The same schools and courses are
 * seeded into the database by `supabase/seed.sql`.
 *
 * Video ids are left empty on purpose: paste your own unlisted YouTube links
 * in Studio. Set DEMO_VIDEO_ID in .env.local to preview the player with any
 * video you own.
 */
import type { Course, School, Viewer } from './types';

const demoVideo = process.env.DEMO_VIDEO_ID || null;

export const demoViewer: Viewer = {
  id: 'demo-pooja',
  fullName: 'Pooja',
  email: 'pooja@wrapitupbypooja.com',
  role: 'admin',
  department: null,
  avatarUrl: null,
};

export const demoSchools: School[] = [
  { id: 's1', slug: 'foundations', name: 'Foundations', emoji: '🌟', tone: 'sunshine', blurb: 'Our story, our standards, hygiene and conduct. Everyone starts here.' },
  { id: 's2', slug: 'wrapping', name: 'School of Wrapping & Craft', emoji: '🎀', tone: 'pink', blurb: 'Folds, corners, bows, ribbons and finishing that make a gift look like us.' },
  { id: 's3', slug: 'hampers', name: 'Hamper Studio', emoji: '🧺', tone: 'tangerine', blurb: 'Basket building, filling, weight balance, cellophane and festive themes.' },
  { id: 's4', slug: 'sales', name: 'School of Sales & Customer Care', emoji: '💬', tone: 'violet', blurb: 'WhatsApp and Instagram enquiries, quoting, upselling and follow-ups.' },
  { id: 's5', slug: 'content', name: 'Content Studio', emoji: '📸', tone: 'sky', blurb: 'Product photos, reels, captions and posting routines.' },
  { id: 's6', slug: 'operations', name: 'Operations & Dispatch', emoji: '🚚', tone: 'turquoise', blurb: 'Materials, inventory, packing for courier, and event-site setup.' },
];

type L = [slug: string, title: string, minutes: number];
let lessonSeq = 0;
function mod(id: string, title: string, lessons: L[]) {
  return {
    id,
    title,
    lessons: lessons.map(([slug, t, m]) => ({
      id: `l${++lessonSeq}`,
      slug,
      title: t,
      durationSeconds: m * 60,
      videoId: demoVideo,
      completed: false,
    })),
  };
}

export const demoCourses: Course[] = [
  {
    id: 'c1',
    slug: 'welcome-to-wrapitup',
    title: 'Welcome to WrapItUpByPooja',
    summary: 'How we started, who we serve, and what "a WrapItUp finish" means.',
    level: 'Trainee',
    schoolSlug: 'foundations',
    instructor: 'Pooja',
    coverVideoId: demoVideo,
    isDraft: false,
    modules: [
      mod('m1', 'Our story', [
        ['brand-story', 'The WrapItUp story', 6],
        ['our-customers', 'Who our customers are', 8],
      ]),
      mod('m2', 'How we work', [
        ['code-of-conduct', 'Code of conduct & hygiene', 10],
        ['quality-promise', 'The quality promise', 7],
      ]),
    ],
  },
  {
    id: 'c2',
    slug: 'perfect-box-wrap',
    title: 'The Perfect Box Wrap',
    summary: 'Measuring paper, sharp corners, hidden tape and a clean finish on every box.',
    level: 'Trainee',
    schoolSlug: 'wrapping',
    instructor: 'Pooja',
    coverVideoId: demoVideo,
    isDraft: false,
    modules: [
      mod('m3', 'Basics', [
        ['measure-and-cut', 'Measuring and cutting paper', 9],
        ['sharp-corners', 'Sharp corners, every time', 12],
        ['hidden-tape', 'The hidden-tape method', 11],
      ]),
      mod('m4', 'Finishing', [
        ['double-sided', 'Double-sided and pleated wraps', 14],
        ['tags-and-seals', 'Tags, seals and branding', 6],
      ]),
    ],
  },
  {
    id: 'c3',
    slug: 'bows-and-ribbons',
    title: 'Bows & Ribbons Masterclass',
    summary: 'Six signature bows, ribbon choice and symmetry checks.',
    level: 'Associate',
    schoolSlug: 'wrapping',
    instructor: 'Pooja',
    coverVideoId: demoVideo,
    isDraft: false,
    modules: [
      mod('m5', 'Signature bows', [
        ['classic-bow', 'The classic bow', 8],
        ['pom-pom-bow', 'Pom-pom bow', 10],
        ['layered-bow', 'Layered satin bow', 12],
      ]),
    ],
  },
  {
    id: 'c4',
    slug: 'festive-hampers',
    title: 'Festive Hamper Building',
    summary: 'Diwali, Rakhi and wedding hampers: base, fill, balance and cellophane.',
    level: 'Associate',
    schoolSlug: 'hampers',
    instructor: 'Pooja',
    coverVideoId: demoVideo,
    isDraft: false,
    modules: [
      mod('m6', 'Structure', [
        ['choosing-baskets', 'Choosing trays and baskets', 7],
        ['base-and-fill', 'Base, fill and weight balance', 13],
      ]),
      mod('m7', 'Finish', [
        ['cellophane-wrap', 'Cellophane without creases', 11],
        ['diwali-theme', 'Diwali theme walkthrough', 15],
      ]),
    ],
  },
  {
    id: 'c5',
    slug: 'whatsapp-sales',
    title: 'Handling WhatsApp Enquiries',
    summary: 'First reply, asking the right questions, quoting and closing politely.',
    level: 'Trainee',
    schoolSlug: 'sales',
    instructor: 'Pooja',
    coverVideoId: demoVideo,
    isDraft: false,
    modules: [
      mod('m8', 'Conversations', [
        ['first-reply', 'The first reply', 6],
        ['discovery-questions', 'Five questions before a quote', 9],
        ['price-objections', 'When the customer says "too expensive"', 12],
      ]),
    ],
  },
  {
    id: 'c6',
    slug: 'reels-that-sell',
    title: 'Reels That Sell',
    summary: 'Shooting unboxing reels on a phone, lighting, and captions.',
    level: 'Trainee',
    schoolSlug: 'content',
    instructor: 'Pooja',
    coverVideoId: demoVideo,
    isDraft: false,
    modules: [
      mod('m9', 'Shooting', [
        ['phone-setup', 'Phone setup and light', 8],
        ['unboxing-reel', 'The unboxing reel formula', 11],
      ]),
    ],
  },
  {
    id: 'c7',
    slug: 'safe-dispatch',
    title: 'Safe Packing for Courier',
    summary: 'Fragile items, box-in-box, labelling and courier handover.',
    level: 'Trainee',
    schoolSlug: 'operations',
    instructor: 'Pooja',
    coverVideoId: demoVideo,
    isDraft: false,
    modules: [
      mod('m10', 'Packing', [
        ['fragile-items', 'Fragile items and glass jars', 10],
        ['box-in-box', 'Box-in-box method', 8],
        ['labels-handover', 'Labels and courier handover', 6],
      ]),
    ],
  },
];

/** Demo progress: which lessons the demo viewer has finished, and where they stopped. */
export const demoCompleted = new Set(['brand-story', 'our-customers', 'measure-and-cut']);
export const demoLastLesson: Record<string, string> = {
  'welcome-to-wrapitup': 'code-of-conduct',
  'perfect-box-wrap': 'sharp-corners',
  'whatsapp-sales': 'first-reply',
};
