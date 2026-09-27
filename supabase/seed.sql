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
