# Wrap It Up University: training LMS plan

## Context
WrapItUpByPooja is a gift-wrapping and hamper business. Pooja wants a private **training university** for her team: artisans, sales, social media and operations/dispatch. The training videos are already on YouTube.

The user shared two reference codebases:
- **Eternal Bonds LMS** (the screenshot). Vite + React + Supabase, with a YouTube provider.
- **Buildour LMS-AWS**. Next + Express + Prisma + R2.

We copy their **structure and element positions**, their best mechanics, and add features specific to a gifting business. We do **not** copy their colours; the new palette is bright.

**Decisions so far:**
- Hosting: Next.js on Vercel, with Supabase for auth, Postgres and storage.
- Login: invite-only, by email magic link or Google. There is no public sign-up.
- Video: YouTube, uploaded as **Unlisted** with embedding allowed. The admin pastes the link.
- Repo: `/home/user/LMS---WRAPITUPBYPOOJA`, which is empty apart from the README. Branch `claude/focused-volta-r4qljt`.

---

## 1. What we take from each codebase

| From | Take | Source (inside the zips) |
|---|---|---|
| Eternal Bonds | Shell: top nav pills, search ⌘K, bell, avatar menu; PageHeader (breadcrumb + title + CTA on the right); main column + 300px right rail | `apps/web/src/shared/layout/AppShell.tsx`, `styles.css` (~409–726) |
| Eternal Bonds | Dashboard order: hero (streak + greeting + 2 CTAs), "Your first week" checklist, resume rail, stat tiles, activity chart; rail with Upcoming + Leaderboard | `routes/Dashboard.tsx`, `shared/ui/FirstWeek.tsx`, `ContinueRail.tsx`, `charts.tsx` |
| Eternal Bonds | YouTube: `youtubeId()` parser + tests, admin paste box, custom-controls IFrame player, a watched-seconds counter that only moves forward, browser-reported duration | `services/api/src/lib/video-provider.ts`, `tests/youtube.test.ts`, `shared/ui/YouTubePlayer.tsx`, `admin/CourseBuilder.tsx`, migration `…lesson_duration_report.sql` |
| Eternal Bonds | Lesson page: player + tabs (Notes / Files / Discussion); rail with syllabus, quiz, and up-next or certificate | `routes/Lesson.tsx`, `LessonQuiz.tsx`, `LessonDiscussion.tsx` |
| Eternal Bonds | Journeys (paths), cohorts + drip, challenges, onboarding wizard, nudges, XP/streaks from an `activity_events` stream, notifications + prefs, server-graded quizzes (answers hidden via RLS), members risk filter (Active/Idle/Stalled/Dormant/Never started) | migrations `journeys`, `cohorts`, `challenges`, `quizzes`, `learning_nudges`; `services/worker/src/jobs/*` |
| Buildour | Progress rules: save every 15s + on pause + `sendBeacon` on page hide; position clamped and never decreasing; `manuallyIncomplete` flag; resume at `min(pos, dur-5)`; course % guarded against 0/0 | `frontend/src/features/player/use-video-progress.ts`, `backend/src/modules/progress/progress.service.ts` |
| Buildour | Course access windows; admin learner detail with per-course progress; drag-drop course builder with delete-impact preview; Library with folders + search (becomes the SOP library); activity log; private per-lesson notes | `modules/access`, `modules/users`, `features/course-builder`, `modules/library` |
| Buildour | Engineering rules: authorization read from the DB on every request, zod on every write, skeleton/empty/error state for every list, confirm dialogs that name the thing being deleted, 44px touch targets, tables become cards on mobile | `.claude/rules/01–04` |

**Left out:** payments/memberships/tiers, the freelance marketplace, public wins, Think Tank voting, R2 upload pipeline, ffmpeg worker, and the Docker/Caddy stack.

**Two Eternal Bonds bugs to avoid:**
- Un-marking a lesson is a no-op on the server (`is_completed OR false`). Use Buildour's `manuallyIncomplete` logic instead.
- Every `completed:true` save re-awards 50 XP. Award XP once, keyed by a unique `(user, kind, subject)`.

---

## 2. University concept, built for a gifting business

| University term | Meaning in the app |
|---|---|
| **Schools** (course categories + role filters) | 🎀 School of Wrapping & Craft, 🧺 Hamper Studio, 💬 School of Sales & Customer Care, 📸 Content Studio (reels, product photos), 🚚 Operations & Dispatch, 🌟 Foundations (brand, values, hygiene, for everyone) |
| **Programs** (journeys) | Role tracks with levels: *Trainee → Associate → Senior → Master* (e.g. "Artisan Program L1"). Finishing a level gives a certificate and a **level badge on the profile** |
| **Semesters** (cohorts) | A batch of new joiners who start together. Modules unlock by drip day, and there is an end deadline |
| **Faculty** | Pooja (admin) and trainers or seniors (reviewers) |

**Roles:** `admin` (Pooja), `trainer` (reviews submissions, sees the team), `member` (staff). Each member also has a `department` (artisan / sales / social / ops), which drives which Programs are assigned automatically.

---

## 3. New features for this business

1. **Practical assignments ("Show your wrap").** A lesson can require a photo or video upload of real work (for example "wrap a 20×20 box with hidden tape", "assemble the Diwali dry-fruit hamper").
   - A trainer reviews it against a **rubric** (e.g. corners, tape hidden, ribbon symmetry, finishing, time taken; 1–5 each).
   - Outcome is approve or redo, with a comment and optional annotated photo.
   - A module is complete only when its video, quiz and assignment are all done.
   - Uploads go to a private Supabase Storage bucket and are shown via signed URLs.
2. **Watch verification.** A lesson auto-completes only when `watch_seconds ≥ 80%` of duration, counting only forward watching; scrubbing earns nothing. Admins can set a lesson to allow manual completion.
3. **Quiz gates.** Quizzes are graded on the server, with a pass mark per quiz (default 70%). The next module stays locked until the learner passes. Retries are allowed and every attempt is logged.
4. **Sales roleplay quizzes.** A scenario question type, e.g. "Customer on WhatsApp says ₹2,500 is too much for this hamper…". Each option has feedback, so this becomes the way to train reply scripts.
5. **SOP & Quick-Reference Library.** Built on Buildour's Library, mobile-first so staff can open it on the work floor. Contents:
   - Wrapping step cards and material lists per product.
   - Price sheet.
   - WhatsApp/Instagram reply templates with a **copy button**.
   - Packing checklist and courier SOPs.
   - Links back to the exact lesson and timestamp.
6. **Skill matrix (manager view).** A grid of staff × skills (bow-making, trousseau packing, corporate bulk hampers, fragile packing, reel editing, dispatch) showing each person's status: not started / learning / certified.
   - Skills are earned by passing the related program level or assignment.
   - Helps Pooja decide who handles which order during peak season.
7. **Seasonal refresher campaigns.** Admin creates a campaign (e.g. "Diwali 2026 prep" or "Wedding season") with courses, a due date and target departments.
   - The dashboard shows a banner with a countdown.
   - Nudges go to anyone behind, and the manager dashboard shows completion.
8. **Wrap of the Week.** Based on Eternal Bonds Challenges + Wins, internal only.
   - Pooja posts a brief; staff submit photos.
   - Everyone reacts, Pooja picks a winner, and the winner gets XP and a badge.
   - Results feed a **Showcase wall** (best work, also useful for ideas).
9. **Announcements from Pooja.** A pinned notice card at the top of the dashboard (new product launch, price change, policy). Staff tap "Got it"; the admin sees who has read it.
10. **Gamification.** XP, day streaks, a leaderboard (with a department filter), and badges ("First Wrap Approved", "7-day streak", "Diwali Ready", "Master Wrapper").
11. **Certificates.** A PDF with the WrapItUpByPooja brand, a unique code, and a public `/verify/:code` page (useful for staff CVs and reference checks).
12. **Onboarding "Your first week".** Five steps:
    - Complete your profile (department, photo).
    - Watch the "Welcome to WrapItUpByPooja" brand-story lesson.
    - Read and accept the Code of Conduct and hygiene SOP.
    - Submit your first practice wrap.
    - Join a live training.
13. **Live training sessions.** Google Meet link revealed at start time; the trainer marks attendance; the recording is attached later as a lesson (Eternal Bonds `recording_lesson_id`).
14. **Name watermark on the player.** Unlisted YouTube links can leak. A faint overlay showing the viewer's name and email discourages screen recording and sharing. When a staff member leaves, the admin disables the account and the effect is immediate (auth checked on every request).
15. **Mobile-first + PWA.** Installable to the home screen, bottom tab bar on phones (Home, Learn, SOPs, Showcase), and YouTube `playsinline`. Hindi/English captions via YouTube `cc_lang_pref`.

---

## 4. Screens and layout
Same positions as the screenshot; bright colours instead.

**Top bar, left to right:**
- Logo "Wrap It Up **University**".
- Nav pills: Dashboard · Schools (courses) · Programs · Showcase · Live · SOP Library.
- Search (⌘K), bell with unread dot, avatar menu.
- The avatar menu has an admin group: Studio, Team, Reviews, Skill Matrix, Campaigns, Announcements, Cohorts.

**PageHeader:** breadcrumb `HOME / DASHBOARD`, then the title on the left and the primary CTA ("Continue learning") on the right.

**Dashboard:**

| Main column | Right rail (300px) |
|---|---|
| Announcement strip (when there is one); **Hero** (streak eyebrow, "Good morning, {name}.", sub-line, [Continue {course}] [Open SOPs]); campaign banner; *Your first week* checklist; *Pending for you* (assignments to redo, quizzes to retry); *Pick up where you left off* (one wide card + a 3-column grid); 4 stat tiles (Lessons, Learning time, Streak, XP & rank); activity chart | Upcoming live sessions; Leaderboard (department toggle); My Program level card; Wrap-of-the-Week promo |

**Learner routes:**

| Route | Page |
|---|---|
| `/` | Dashboard |
| `/schools`, `/schools/[slug]` | Course grid with school pills + course overview (syllabus, progress, Start/Resume) |
| `/learn/[course]/[lesson]` | Lesson page: player + watermark; title row with "Mark complete"; tabs Notes / Files / Discussion / **Assignment**; rail with syllabus (locks + drip dates), Quiz, Up next / Certificate |
| `/programs`, `/programs/[slug]` | Programs and levels |
| `/showcase`, `/showcase/challenge/[slug]` | Wrap of the Week + Showcase wall |
| `/live` | Live sessions |
| `/sops`, `/sops/[folder]` | SOP library |
| `/me` | Profile: badges, certificates, skills |
| `/notifications`, `/settings`, `/welcome` | Inbox, settings, onboarding wizard |
| `/verify/[code]` | Public certificate verification |

**Admin routes (`/admin/*`):**

| Route | Page |
|---|---|
| Studio | Course builder: modules/lessons drag-drop, YouTube paste box, quiz editor, assignment + rubric editor, drip days, publish |
| Team | Invite by email, department, role, disable; member detail showing progress per course, quiz attempts, submissions, activity; risk filters |
| Reviews | Queue of submissions with the rubric form |
| Skill Matrix | Staff × skills grid |
| Campaigns | Seasonal refresher campaigns |
| Announcements | Notices and read receipts |
| Cohorts | New-joiner batches |
| Programs | Program and level builder |
| Live | Schedule sessions, attendance |
| SOPs | Library management |
| Challenges | Wrap of the Week briefs and winners |
| Reports | Completion by department, overdue list, CSV export |

---

## 5. Bright design system (new; structure copied, colours not)
Tokens are CSS variables in `app/globals.css` (Eternal Bonds token *names/structure*, new values) and mapped in Tailwind.

| Token | Value / use |
|---|---|
| Page | `#FFF9F2` (warm white) |
| Panel | `#FFFFFF`, radius 24; cards radius 18; controls radius 12 |
| Primary | **Tangerine** `#FF7A1A`: CTAs, active nav pill (gradient to `#FF4D8D` hot pink) |
| Secondary | **Turquoise** `#00C2B2`: progress bars, success ticks |
| Accent | **Sunshine** `#FFC727`: XP, streak, promo box |
| Accent 2 | **Violet** `#7C5CFF`: programs, badges, links |
| Info / danger | Sky `#2EA7FF` / coral red `#FF4D4F` |
| Ink | `#1F1A2E` text; greys `#5B5670`, `#8E89A3`; hairlines `#F0E8DE` |

- **Hero:** a bright gradient (violet → hot pink → tangerine) with white text and faint ribbon/bow shapes in SVG, instead of a dark banner.
- **Fonts:** Plus Jakarta Sans for the UI and Fraunces for display headlines, via `next/font`.
- **Accessibility:** contrast ≥ 4.5:1 is checked for text on each token (dark ink on sunshine, white on tangerine-dark `#E5600A`).

---

## 6. Tech architecture
- **App:** Next.js (App Router, TypeScript) on Vercel with Tailwind. Server Components + Server Actions, TanStack Query for client-side progress/polling, zod everywhere.
- **Supabase:**
  - Auth: magic link + Google. Sign-up is disabled; an `invites` table is checked by the `handle_new_user` trigger.
  - Postgres with RLS on every table. Grading and XP go through `security definer` SQL functions so answers are never readable by members.
  - Storage buckets: `submissions` (private), `sops` (private), `covers` (public).
- **Background jobs:** Vercel Cron → `/api/cron/[job]`, protected by a secret. Jobs: nudges, campaign reminders, live-session reminders, drip-unlock notices, XP/streak rollups, weekly digest to Pooja. Email via Resend.
- **Certificates:** generated with `@react-pdf/renderer` in a route handler and stored in Storage.
- **Tests:** Vitest. Port `tests/youtube.test.ts` cases; unit-test the progress/watch-verification rules; RLS allow/deny tests.

**Core tables** (Supabase migrations in `supabase/migrations/`):
- **People:** `users` (role, department, is_disabled), `invites`.
- **Content:**
  - `schools`, `courses` (school_id, departments[], cover, is_published).
  - `modules` (drip_days), `lessons` (video_provider, video_asset_id, duration_seconds, duration_source, completion_mode: watch|manual, min_watch_pct).
  - `lesson_resources`.
- **Progress:** `lesson_progress` (position, watch_seconds, is_completed, manually_incomplete, completed_at), `enrollments` (last_lesson_id, completed_at, due_on).
- **Quizzes:** `quiz_questions` (type: mcq|scenario), `quiz_options` (is_correct, feedback), `quizzes` (pass_pct), `quiz_attempts`.
- **Assignments:** `assignments` (brief, rubric jsonb), `submissions` (media keys, status: submitted|approved|redo), `submission_reviews` (scores jsonb, comment, reviewer).
- **Programs and cohorts:** `programs`, `program_levels`, `program_level_courses`, `program_members`; `cohorts`, `cohort_members`.
- **Skills:** `skills`, `skill_requirements`, `user_skills`.
- **Campaigns:** `campaigns`, `campaign_courses`, `campaign_targets`.
- **Communication:** `announcements`, `announcement_reads`; `challenges`, `showcase_posts`, `showcase_reactions`.
- **Live sessions:** `live_sessions`, `live_attendance`.
- **SOPs:** `sop_folders`, `sop_items` (file | link | text template, copyable).
- **Engagement:** `lesson_questions`, `lesson_notes`.
- **Gamification:** `activity_events` (unique (user, kind, subject) for one-time XP), `streaks`, `member_stats`, `badges`, `user_badges`.
- **Records:** `certificates` (code, pdf_key); `notifications`, `notification_prefs`; `audit_log`.

**Planned code layout:**
```
app/(auth)/login
app/(app)/…        learner routes
app/(admin)/admin/… admin routes
app/api/cron/[job]
app/verify/[code]
features/<domain>/{components,actions.ts,queries.ts}   # Buildour convention
lib/youtube.ts      # port of youtubeId()
lib/progress.ts     # watch-verification + Buildour progress rules
components/ui/*     # Card, Hero, StatTile, Chip, DateBadge, EmptyState, Skeleton…
components/shell/*  # TopBar, PageHeader, Rail, BottomNav, UserMenu, NotificationBell, GlobalSearch
supabase/migrations, supabase/seed.sql   # seed: 6 schools, sample courses, demo staff
```

---

## 7. Build phases (each ends with a pushed, working commit)
1. **Foundation.** Next.js scaffold, bright tokens, app shell (top bar, PageHeader, rail, bottom nav), Supabase project + auth (invite-only, magic link + Google), `users`/`invites`, admin Team page (invite, role, department, disable).
2. **Courses + YouTube.** Schools/courses/modules/lessons, admin Studio with YouTube paste box, course grid, course page, lesson page with YouTubePlayer + watermark + progress/watch verification, resume, Notes/Files tabs.
3. **Dashboard.** Hero, first-week checklist, resume rail, stat tiles, activity chart, Upcoming, Leaderboard, XP/streak events + rollup cron.
4. **Assessment.** Quizzes (MCQ + scenario, pass gates), assignments + submissions + Reviews queue with rubric, module locking, certificates + `/verify`.
5. **University structure.** Programs/levels, cohorts + drip, skills + Skill Matrix, campaigns.
6. **Team life.** SOP library, announcements, Wrap of the Week + Showcase, live sessions, lesson discussion, notifications + email nudges, badges.
7. **Polish.** Reports + CSV export, global search, PWA, accessibility and mobile pass, seed content, README handover guide for Pooja (how to upload unlisted videos and paste links).

---

## 8. Verification
- `npm run lint && npm run typecheck && npm test`: YouTube parser cases, progress rules (clamping, 80% watch rule, manual un-complete, one-time XP), quiz grading, RLS allow/deny.
- Run `npm run dev` against a Supabase project (the migrations are applied through the Supabase MCP tool or CLI). Then use Playwright (Chromium at `/opt/pw-browsers`) to walk the flows below and take screenshots at 1440px and 390px to compare against the reference layout:
  1. Admin invites a member and creates a course with a real unlisted YouTube link.
  2. Member logs in and watches (scrubbing does not complete the lesson; watching does), takes the quiz, submits an assignment photo.
  3. Trainer approves it.
  4. The certificate appears and `/verify/code` resolves.
- Check the dashboard widgets reflect XP/streak after the cron rollup (`curl /api/cron/rollups` with the secret).
- Deploy a preview to Vercel via the Vercel connector and smoke-test login + playback on a phone viewport.
