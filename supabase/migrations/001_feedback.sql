create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category text not null check (category in ('New game', 'Bug report', 'Improvement', 'Just saying hi')),
  message text not null check (char_length(message) between 10 and 2000),
  name text not null default '' check (char_length(name) <= 24),
  email text not null default '' check (char_length(email) <= 254)
);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;
-- Only the server's service role inserts feedback. No public read/write policies.
