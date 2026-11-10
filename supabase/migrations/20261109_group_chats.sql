-- Group chats: a conversation can be a named group, and people join only after saying yes to an invite.
alter table public.conversations add column if not exists is_group boolean not null default false;
alter table public.conversations add column if not exists title text;
alter table public.conversations add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.conversation_invites (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (conversation_id, invited_user_id)
);

-- the API writes with the server key; signed-in users can only read invites they sent or got
alter table public.conversation_invites enable row level security;
drop policy if exists "read my invites" on public.conversation_invites;
create policy "read my invites" on public.conversation_invites
  for select to authenticated using (auth.uid() = invited_user_id or auth.uid() = invited_by);
revoke all on public.conversation_invites from anon;
