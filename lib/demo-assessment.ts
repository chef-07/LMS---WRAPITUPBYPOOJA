import 'server-only';
/**
 * Demo-mode quizzes and practicals, keyed by lesson slug. The answer key
 * stays on the server: learners only ever receive questions and options.
 */
import type { KeyedQuestion } from './quiz';
import { DEFAULT_RUBRIC } from './rubric';

export type DemoQuiz = { id: string; lessonSlug: string; passPct: number; isRequired: boolean; questions: KeyedQuestion[] };

const opt = (id: string, label: string, isCorrect: boolean, feedback = '') => ({ id, label, isCorrect, feedback });

export const demoQuizzes: DemoQuiz[] = [
  {
    id: 'dq-corners',
    lessonSlug: 'sharp-corners',
    passPct: 70,
    isRequired: true,
    questions: [
      {
        id: 'dq1',
        kind: 'mcq',
        prompt: 'Which tape gives the cleanest finish on a matte-paper box?',
        explanation: 'Double-sided tape sits under the fold, so nothing shows in customer photos.',
        options: [
          opt('dq1a', 'Double-sided tape under the fold', true, 'Exactly. Nothing shows.'),
          opt('dq1b', 'Clear cello tape across the seam', false, 'It shines under light and shows in photos.'),
          opt('dq1c', 'Glue stick', false, 'It wrinkles thin paper and dries slowly.'),
        ],
      },
      {
        id: 'dq2',
        kind: 'mcq',
        prompt: 'How much paper overlap do we leave on the long side?',
        explanation: 'About 2 cm is enough to hold and hide the tape without bulk.',
        options: [opt('dq2a', 'About 2 cm', true), opt('dq2b', 'Half the box height', false, 'Too much: the seam gets bulky.'), opt('dq2c', 'None', false, 'The paper will pull open.')],
      },
      {
        id: 'dq3',
        kind: 'scenario',
        prompt: 'Customer: “Can you wrap it in 5 minutes? I’m standing outside.”',
        explanation: 'Be honest and offer a quick, still-neat option rather than rushing the signature wrap.',
        options: [
          opt('dq3a', 'Offer the quick ribbon wrap now, or the signature wrap in 20 minutes', true, 'Clear choice, no surprises.'),
          opt('dq3b', 'Say yes and rush the signature wrap', false, 'Rushed corners are what they’ll remember.'),
          opt('dq3c', 'Say we don’t do urgent orders', false, 'We lose a happy customer.'),
        ],
      },
    ],
  },
  {
    id: 'dq-price',
    lessonSlug: 'price-objections',
    passPct: 100,
    isRequired: true,
    questions: [
      {
        id: 'dq4',
        kind: 'scenario',
        prompt: 'Customer on WhatsApp: “₹2,500 is too much for this hamper. Can you do ₹1,500?”',
        explanation: 'Protect the price by explaining value, then offer a smaller option at their budget instead of discounting.',
        options: [
          opt('dq4a', 'Explain what’s inside, then suggest the ₹1,500 mini hamper', true, 'Value first, then a real option.'),
          opt('dq4b', 'Agree to ₹1,500 for the same hamper', false, 'That’s a 40% cut in margin.'),
          opt('dq4c', 'Leave them on “seen”', false, 'Every enquiry deserves a reply.'),
        ],
      },
    ],
  },
];

export const demoPracticals = [
  {
    id: 'dp-tape',
    lessonSlug: 'hidden-tape',
    brief: 'Wrap a 20 × 20 cm box using the hidden-tape method. Take one photo from the top and one of the side seam in daylight.',
    rubric: DEFAULT_RUBRIC,
  },
];
