-- Starter schools. Courses are created in Studio (/admin), or copy the
-- sample structure from lib/demo-data.ts.
insert into public.schools (slug, name, emoji, tone, blurb, rank) values
  ('foundations', 'Foundations', '🌟', 'sunshine', 'Our story, our standards, hygiene and conduct. Everyone starts here.', 0),
  ('wrapping', 'School of Wrapping & Craft', '🎀', 'pink', 'Folds, corners, bows, ribbons and finishing that make a gift look like us.', 1),
  ('hampers', 'Hamper Studio', '🧺', 'tangerine', 'Basket building, filling, weight balance, cellophane and festive themes.', 2),
  ('sales', 'School of Sales & Customer Care', '💬', 'violet', 'WhatsApp and Instagram enquiries, quoting, upselling and follow-ups.', 3),
  ('content', 'Content Studio', '📸', 'sky', 'Product photos, reels, captions and posting routines.', 4),
  ('operations', 'Operations & Dispatch', '🚚', 'turquoise', 'Materials, inventory, packing for courier, and event-site setup.', 5)
on conflict (slug) do nothing;

-- The Foundations course the "Your first week" checklist links to
-- (/learn/welcome-to-wrapitup/brand-story and …/code-of-conduct).
-- Paste the YouTube links in Studio; until then lessons show "Video coming soon".
with c as (
  insert into public.courses (slug, school_id, title, summary, level, is_published, rank)
  select 'welcome-to-wrapitup', id, 'Welcome to WrapItUpByPooja',
         'How we started, who we serve, and what "a WrapItUp finish" means.', 'Trainee', true, 0
  from public.schools where slug = 'foundations'
  on conflict (slug) do nothing
  returning id
), m1 as (
  insert into public.modules (course_id, title, rank) select id, 'Our story', 1 from c returning id, course_id
), m2 as (
  insert into public.modules (course_id, title, rank) select id, 'How we work', 2 from c returning id, course_id
)
insert into public.lessons (module_id, course_id, slug, title, completion_mode, rank)
select id, course_id, 'brand-story', 'The WrapItUp story', 'watch'::public.completion_mode, 1 from m1
union all select id, course_id, 'our-customers', 'Who our customers are', 'watch', 2 from m1
union all select id, course_id, 'code-of-conduct', 'Code of conduct & hygiene', 'watch', 1 from m2
union all select id, course_id, 'quality-promise', 'The quality promise', 'watch', 2 from m2;
