-- Signed-out visitors never need our functions, and trigger functions are
-- never called directly. (Supabase security advisor 0028/0029.)
-- Signed-in users keep EXECUTE on the is_* helpers: RLS policies call them
-- as the signed-in role.
revoke execute on function public.current_role_if_active() from anon, public;
revoke execute on function public.is_active_member() from anon, public;
revoke execute on function public.is_admin() from anon, public;
revoke execute on function public.is_faculty() from anon, public;
revoke execute on function public.save_lesson_progress(uuid, int, int) from anon, public;
revoke execute on function public.set_lesson_completion(uuid, boolean) from anon, public;
revoke execute on function public.report_lesson_duration(uuid, int) from anon, public;
revoke execute on function public.live_join_url(uuid) from anon, public;
revoke execute on function public.leaderboard(public.department, int) from anon, public;
revoke execute on function public.my_streak() from anon, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.guard_user_self_update() from anon, authenticated, public;
grant execute on function public.current_role_if_active() to authenticated;
grant execute on function public.is_active_member() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_faculty() to authenticated;
