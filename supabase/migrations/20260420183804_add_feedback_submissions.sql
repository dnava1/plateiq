create table public.feedback_submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  message text not null,
  source_path text not null default '/settings',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint feedback_submissions_category_check check (category in ('bug', 'feature_request', 'confusing_guidance', 'other')),
  constraint feedback_submissions_status_check check (status in ('new', 'reviewed', 'closed')),
  constraint feedback_submissions_message_length_check check (char_length(btrim(message)) between 10 and 2000),
  constraint feedback_submissions_source_path_check check (source_path like '/%')
);

create index feedback_submissions_status_created_at_idx
  on public.feedback_submissions (status, created_at desc);

alter table public.feedback_submissions enable row level security;