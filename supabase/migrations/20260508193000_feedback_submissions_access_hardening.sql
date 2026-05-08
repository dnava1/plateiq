revoke all on table public.feedback_submissions from anon;
revoke all on table public.feedback_submissions from authenticated;

create index if not exists feedback_submissions_user_id_created_at_idx
  on public.feedback_submissions (user_id, created_at desc);