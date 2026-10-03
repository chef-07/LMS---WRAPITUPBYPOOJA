-- Starter content for a fresh university: SOP cards the team can use on day
-- one, the skills for the Skill matrix, and a draft "Wrapping Artisan"
-- program. Run once in the SQL editor after seed.sql. Safe to re-run: each
-- block only fills a table that is still empty, so nothing you have
-- already made is duplicated or changed. Edit or delete any of it in the app.

-- ── SOP library ───────────────────────────────────────────────────────────
do $$
declare f uuid;
begin
  if exists (select 1 from public.sop_folders) then return; end if;

  insert into public.sop_folders (title, emoji, description, departments, rank)
  values ('WhatsApp replies', '💬', 'Copy, change the name, send. Keep the tone warm and short.', '{sales}', 1)
  returning id into f;
  insert into public.sop_items (folder_id, kind, title, body, rank) values
  (f, 'template', 'First reply to an enquiry', E'Hi {name}! 🎁 Thank you for reaching out to WrapItUpByPooja.\nMay I know the occasion, the date you need it by, and your budget? I''ll share a few options right away.', 1),
  (f, 'template', '“Too expensive” reply', E'I completely understand, {name}! This hamper is fully hand-finished with premium packaging, which is why it''s ₹{price}.\nIf you''d like, our mini version at ₹{mini_price} has the same finish in a smaller size. Shall I send a photo?', 2),
  (f, 'template', 'Order confirmed', E'Thank you, {name}! 🎀 Your order is confirmed:\n• {item}\n• Delivery: {date}, {area}\n• Total: ₹{amount}\nWe''ll send you a photo before it leaves the studio.', 3),
  (f, 'template', 'Out for delivery', E'Hi {name}, your gift is on its way! 🚚 It should reach {area} by {time}. Tracking: {link}\nThank you for choosing WrapItUpByPooja.', 4),
  (f, 'template', 'Asking for a review', E'Hi {name}, we hope they loved it! 💝 If you have a minute, a Google review helps our small studio a lot: {review_link}\nThank you!', 5);

  insert into public.sop_folders (title, emoji, description, departments, rank)
  values ('Wrapping step cards', '🎀', 'Quick reminders at the work table.', '{artisan}', 2)
  returning id into f;
  insert into public.sop_items (folder_id, kind, title, body, rank) values
  (f, 'steps', 'Signature box wrap', E'Measure paper: box girth + 4 cm, height + 2 cm on each side\nCrease every edge with a bone folder\nDouble-sided tape under the fold only, never on show\nEnds: sides in, top down, bottom up\nRibbon: centre knot, trim ends at 45°\nTag on the top-right corner, facing the reader', 1),
  (f, 'steps', 'Quality check before packing', E'Corners sharp, no puffing\nNo tape or glue visible\nBow even on both sides\nNo fingerprints or scuffs on the paper\nPhoto from above in daylight for the customer', 2);

  insert into public.sop_folders (title, emoji, description, departments, rank)
  values ('Dispatch & courier', '🚚', 'Packing for courier and the handover checklist.', '{ops,artisan}', 3)
  returning id into f;
  insert into public.sop_items (folder_id, kind, title, body, rank) values
  (f, 'steps', 'Before handing to the courier', E'Bubble-wrap glass and jars twice\nBox-in-box for anything fragile\nShake test: nothing moves\nAddress label on top, “Fragile” on two sides\nPhoto of the sealed box sent to the customer\nTracking number saved on the order', 1);

  insert into public.sop_folders (title, emoji, description, departments, rank)
  values ('Studio basics', '🌟', 'For everyone: how we work every day.', '{}', 4)
  returning id into f;
  insert into public.sop_items (folder_id, kind, title, body, rank) values
  (f, 'steps', 'Opening the studio', E'Wipe the work tables\nCheck paper, ribbon and tape stock\nRead today''s orders and delivery times\nCharge the phone for product photos', 1),
  (f, 'steps', 'Closing the studio', E'Finished orders labelled and on the dispatch shelf\nOffcuts sorted: keep pieces bigger than A4\nTools back in their place\nTomorrow''s urgent orders written on the board', 2);
end $$;

-- ── Skills ────────────────────────────────────────────────────────────────
-- Not linked to courses yet: link each one to the courses that teach it
-- (Skill matrix → Skills → edit) as you publish them. Until then trainers
-- can still sign people off by hand.
insert into public.skills (name, emoji, description, department, rank)
select * from (values
  ('Box wrap', '📦', 'Sharp corners, hidden tape, clean ends.', 'artisan'::public.department, 1),
  ('Signature bows', '🎀', 'Classic, pom-pom and layered satin bows.', 'artisan'::public.department, 2),
  ('Festive hampers', '🧺', 'Base, fill, weight balance and cellophane.', 'artisan'::public.department, 3),
  ('WhatsApp quoting', '💬', 'Right questions first, then a clear, polite quote.', 'sales'::public.department, 4),
  ('Product photos & reels', '📸', 'Daylight photos and the unboxing reel formula.', 'social'::public.department, 5),
  ('Courier packing', '🚚', 'Box-in-box, fragile items and handover.', 'ops'::public.department, 6)
) as s(name, emoji, description, department, rank)
where not exists (select 1 from public.skills);

-- ── A draft program to build on (only faculty see drafts) ─────────────────
do $$
declare p uuid; l uuid;
begin
  if exists (select 1 from public.programs) then return; end if;
  insert into public.programs (slug, title, emoji, description, department, is_published, rank)
  values ('wrapping-artisan', 'Wrapping Artisan', '🎀', 'From a first clean box wrap to running the festive hamper table on your own.', 'artisan', false, 1)
  returning id into p;
  insert into public.program_levels (program_id, level, title) values (p, 'Trainee', 'Clean basics') returning id into l;
  insert into public.program_level_courses (level_id, course_id, rank)
  select l, id, 1 from public.courses where slug = 'welcome-to-wrapitup';
end $$;
