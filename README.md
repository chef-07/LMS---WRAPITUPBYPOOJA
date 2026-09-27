# Wrap It Up University

The private training university for the **WrapItUpByPooja** team: wrapping and packing, hampers, sales and customer care, social media content, and operations and dispatch. All training videos are hosted on **YouTube** (as Unlisted).

The full product plan is in [`docs/PLAN.md`](docs/PLAN.md).

## What works today (Phase 1)

- **App shell.** Top navigation pills, "Search anything" (⌘K), notifications bell, avatar menu (with admin links for Pooja and trainers), and a bottom tab bar on phones.
- **Dashboard.** Pinned announcement, hero with day streak and greeting, *Your first week* checklist, *Pick up where you left off*, stat tiles, learning-activity chart, *Upcoming* live sessions, leaderboard (All / My team), Wrap-of-the-Week card.
- **Schools.** Course grid filtered by school, with search. Each course page shows its syllabus and progress, and a Start/Resume button.
- **Lesson page.** YouTube player with our own controls and a faint name tag, the syllabus rail, previous/up next, and private notes that autosave.
- **Watch verification.** A lesson completes only after **80 % of it is genuinely watched**. Skipping ahead earns nothing, XP is awarded once, and un-ticking a lesson sticks.
- **Supabase backend.** Invite-only sign-in (email magic link or Google), row-level security on every table, and the progress rules enforced inside the database.

Programs, Showcase, Live, SOP Library, Studio and the other admin pages are placeholders that say which phase delivers them.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Without Supabase keys the app runs in **demo mode** with sample courses. To preview the player with one of your videos, set `DEMO_VIDEO_ID=<11-character id>` in `.env.local`.

## Connect Supabase

1. Create a Supabase project. Run `supabase/migrations/*.sql`, then `supabase/seed.sql`, in the SQL editor (or use `supabase db push`).
2. Under **Authentication → Providers**, enable Email (magic link) and Google.
3. Under **Authentication → URL configuration**, add `https://<your-site>/auth/callback`.
4. Copy `.env.example` to `.env.local` and fill in the URL and anon key. Do the same in Vercel's environment variables.
5. **Pooja signs in first.** The first account ever created becomes the admin. After that, only emails in the `invites` table can sign in.

## Adding a training video (for Pooja)

1. Upload the video to YouTube with visibility **Unlisted**. Under *Show more → Allow embedding*, make sure embedding is on.
2. Copy the link from the Share button.
3. Paste it into the lesson in Studio (Phase 2). Until Studio ships, set `lessons.video_id` in the Supabase table editor.

Unlisted videos can still be watched by anyone who has the link. The name tag on the player discourages sharing, and disabling a staff member's account removes their access to the university immediately.

## Checks

```bash
npm run lint && npm run typecheck && npm test && npm run build
```
