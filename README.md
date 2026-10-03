# Wrap It Up University

The private training university for the **WrapItUpByPooja** team: wrapping and packing, hampers, sales and customer care, social media content, and operations and dispatch. All training videos are hosted on **YouTube** (as Unlisted).

The full product plan is in [`docs/PLAN.md`](docs/PLAN.md).

## What works today (all seven phases)

- **App shell.** Top navigation pills, "Search anything" (⌘K), notifications bell, avatar menu (with admin links for Pooja and trainers), and a bottom tab bar on phones.
- **Dashboard.** Pinned announcement, hero with day streak and greeting, *Your first week* checklist, *Pick up where you left off*, stat tiles, learning-activity chart, *Upcoming* live sessions, leaderboard (All / My team), Wrap-of-the-Week card.
- **Schools.** Course grid filtered by school, with search. Each course page shows its syllabus and progress, and a Start/Resume button.
- **Lesson page.** YouTube player with our own controls and a faint name tag, the syllabus rail, previous/up next, and private notes that autosave.
- **Watch verification.** A lesson completes only after **80 % of it is genuinely watched**. Skipping ahead earns nothing, XP is awarded once, and un-ticking a lesson sticks.
- **Supabase backend.** Invite-only sign-in (every account needs an invite) (email magic link or Google), row-level security on every table, and the progress rules enforced inside the database.

- **Studio** (`/admin`, admins only):
  - Create courses and put them in a school.
  - Add, rename and reorder modules and lessons.
  - Paste any YouTube link (address bar, Share button, Shorts, embed); the video is recognised and previewed.
  - Set the length, choose how a lesson is completed (watch X % or the learner ticks it), and hide lessons.
  - Choose which departments a course is for, then publish or unpublish.
  - Deleting anything asks first and says exactly what goes.
- **Team** (`/admin/team`):
  - Invite staff by email with a role and department.
  - See who's Active, Idle, Stalled, Dormant or Never started, and how many lessons each person has done.
  - Change roles and switch off access when someone leaves; their progress is kept. Trainers can see the list but not change it.

- **Quizzes.** Optional, one per lesson: questions or WhatsApp-style customer scenarios.
  - Each answer can have its own feedback, and each question an explanation.
  - A required quiz locks the next module until it's passed, and the database enforces it.
  - The answer key never reaches the browser. Retries are unlimited and every attempt is kept.
- **“Show your wrap” practicals.**
  - Staff upload up to 5 photos, resized on the phone to about 300 KB each and stored privately. They can add a video link and a note.
  - Trainers score each point from 1 to 5 in **Reviews** (`/admin/reviews`), then approve or ask for a redo with a comment.
  - The learner sees the scores and comment, and resubmits if needed.
- **Certificates.** Finishing every lesson, required quiz and practical issues one certificate (`WIU-XXXX-XXXX`) with a public check page (`/verify/<code>`) and an A4 PDF.
  - A **My profile** page lists certificates and XP.
  - The dashboard shows **Pending for you**, and the bell shows reviews and the trainer queue.

- **SOP Library** (`/sops`): folders of reply templates, step-by-step checklists, links and files (PDF or image).
  - Templates have **Copy** and **WhatsApp** buttons, and checklists can be ticked off.
  - A card can link to a lesson at a timestamp. Everything is searchable.
  - A folder can be limited to certain departments. Managed at `/admin/sops`.
- **Announcements** (`/admin/announcements`): posts are pinned to every dashboard until staff tap **Got it**. You see who has read each one.
- **Live trainings** (`/live`): schedule a Meet or Zoom session. The join button opens 15 minutes before; joining records attendance (+20 XP).
  - Trainers can tick attendance and attach the recording as a lesson.
- **Showcase and Wrap of the Week** (`/showcase`): a wall of the team's best wraps with reactions.
  - Weekly challenges: +40 XP for entering, and Pooja picks the winner (+100 XP and a trophy on the wall).
- **Lesson Q&A**: questions and answers on every lesson's Discussion tab. Unanswered questions appear for trainers under **Reviews**.
- **Badges** on My profile. The bell also shows new announcements, sessions starting soon, the open challenge, and replies to your questions.

- **Programs** (`/programs`): role tracks (e.g. *Wrapping Artisan*) with levels Trainee → Associate → Senior → Master.
  - Each level is a set of courses. Holding the certificate for every course in a level finishes it: +150 XP once, a **Level up** badge, and a chip on My profile.
  - A track can be for one team or everyone, and stays a draft until published. Managed at `/admin/programs`.
- **Cohorts** (`/admin/cohorts`): new-joiner batches with a start date, a finish-by date and an optional program.
  - Modules with **Unlocks after (days)** set in Studio open that many days after the batch starts. Someone not in a batch counts from the day they joined. The database enforces it; faculty always see everything.
  - Learners see a batch banner on the dashboard: day N of M, days left, program progress and the next module to unlock.
  - Pooja sees each person's progress and pace (On track, Behind, Overdue, Done).
- **Skill matrix** (`/admin/skills`): people × skills, filterable by team.
  - A skill links to the courses that teach it. A cell turns yellow when someone holds all those certificates, ready for a trainer to sign them off.
  - Trainers sign people off (or take it back). Only Pooja adds or edits skills. Staff see their skills on My profile.
- **Campaigns** (`/admin/campaigns`): seasonal refreshers (Diwali, Rakhi, wedding season) with courses, teams and a due date.
  - Staff see a countdown card on the dashboard and in Programs, and a bell reminder in the last 7 days until they finish.
  - Pooja sees who is done, on track, behind or overdue.

- **Reports** (`/admin/reports`, trainers and admins):
  - Headline numbers: who learned this week, lessons and certificates in the last 30 days, practicals waiting for review.
  - A weekly chart (with a table view), completion by team, and a table per course.
  - A **Needs attention** list: missed batch or campaign deadlines, people behind, people quiet for weeks or not started, and practicals waiting 3+ days.
  - **Download for Excel**: everyone's progress, course completion and the attention list as CSV files. Cells that look like formulas are made safe.
- **Installable app.** Add it to the home screen on Android or iPhone and it opens full screen. With no connection it shows a friendly offline page. The service worker never stores private pages or data, only the app's own build files.
- **Settings** (`/settings`): your name and profile photo (cropped and shrunk on the phone), video captions (Off, English or Hindi, remembered per device), and install help.
- **Search anything** also finds programs and SOP cards.
- **Reminder emails** (sent through [Resend](https://resend.com) by two daily Vercel Cron jobs, `vercel.json`):
  - **Morning, about 9am India time:** a reminder to anyone with something to act on: a live session today, a module that opens today, a campaign due in 7/3/1/0 days or overdue, a practical to redo, a required quiz not yet passed, falling behind in a batch, practicals waiting for review (trainers and admins), or no learning for a week.
    - Time-bound items go out the same day. Other reminders wait 3 days between emails, and "pick up where you left off" waits a week, so nobody gets nagged daily.
  - **Monday mornings:** a summary for admins with last week's numbers and the **Needs attention** list.
  - **Evening, about 7pm:** a *keep your streak* email when a streak of 2 or more days would end tonight.
  - Everyone can switch each kind off in **Settings**, or with the link at the bottom of every email (one-click unsubscribe supported).
  - Admins see in Settings whether email is set up and how the last week went, and can send themselves a sample.
  - Each person, kind and day is claimed in the database before sending, so a retried job never emails anyone twice; a failed send is retried by the next run.
  - The job signs in with only a long random key (`CRON_SECRET`). The database stores just its SHA-256 hash, in a schema the API cannot reach.
- **Accessibility:** axe finds no problems on any page at desktop or phone size, and no page scrolls sideways on a phone.

**New here? Read [`docs/HANDOVER.md`](docs/HANDOVER.md)**, the plain-language guide for running the university day to day.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Without Supabase keys the app runs in **demo mode** with sample courses. To preview the player with one of your videos, set `DEMO_VIDEO_ID=<11-character id>` in `.env.local`.

## Connect Supabase

1. Create a Supabase project. Run `supabase/migrations/*.sql`, then `supabase/seed.sql`, in the SQL editor (or use `supabase db push`). Optionally run `supabase/starter-content.sql` for starter SOP cards, skills and a draft program. It only fills empty tables, so it is safe to re-run.
2. Under **Authentication → Providers**, enable Email (magic link) and Google.
3. Under **Authentication → URL configuration**, add `https://<your-site>/auth/callback`.
4. Copy `.env.example` to `.env.local` and fill in the URL and anon key. Do the same in Vercel's environment variables.
5. **Invite the first admin** in the SQL editor: `insert into public.invites (email, full_name, role) values ('you@example.com', 'Pooja', 'admin');`. Every account, the admin's included, needs an invite. After that, invite staff from **Team** and send them the sign-in link on WhatsApp.

## Adding a training video (for Pooja)

1. Upload the video to YouTube with visibility **Unlisted**. Under *Show more → Allow embedding*, make sure embedding is on.
2. Copy the link from the Share button.
3. Open **Studio → your course → ✏️ on the lesson** and paste the link into the YouTube box. A green “Video found” confirms it.

Unlisted videos can still be watched by anyone who has the link. The name tag on the player discourages sharing, and disabling a staff member's account removes their access to the university immediately.

## Turn on reminder emails

1. Create a free [Resend](https://resend.com) account. Add and verify your domain under **Domains**; until then Resend only delivers to your own address. Create an API key under **API Keys**.
2. In Vercel → Project → Settings → Environment Variables (Production), add:
   - `RESEND_API_KEY`: the key from step 1.
   - `EMAIL_FROM`: for example `Wrap It Up University <university@wrapitupbypooja.com>` (an address on the verified domain).
   - `CRON_SECRET`: a long random string (at least 32 characters, e.g. `openssl rand -hex 32`).
3. Store the hash of the same `CRON_SECRET` in the database (SQL editor): `insert into private.cron_keys (hash, note) values (sha256(convert_to('<CRON_SECRET>', 'UTF8')), 'vercel');`
4. Redeploy. Check with **Settings → Team emails → Send me a sample**, or with a dry run that sends nothing:
   `curl -H "Authorization: Bearer <CRON_SECRET>" "https://<your-site>/api/cron/morning?dry=1"`
5. Optional but recommended: in Supabase → **Authentication → Emails → SMTP settings**, send sign-in emails through Resend too (host `smtp.resend.com`, port 465, user `resend`, password = the API key). This removes Supabase's limit of a few sign-in emails an hour.

## Checks

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Live setup

| | |
|---|---|
| Site | https://wrapitup-university.vercel.app (Vercel project `wrapitup-university`, team Chef, region Mumbai) |
| Database | Supabase project `LMS---WRAPITUPBYPOOJA` (`ireaxgfdbyhktelanjtp`, Mumbai) |
| Deploys | Every push to GitHub builds on Vercel. `main` goes to the live site; other branches get preview links that need a Vercel login |
