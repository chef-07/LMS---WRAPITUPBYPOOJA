export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Without Supabase settings the app runs in demo mode on sample data. */
export const isDemo = !SUPABASE_URL || !SUPABASE_ANON_KEY;
