-- Live Telegram handoff sessions (visitor ↔ Ernst)

create table if not exists public.handoff_sessions (
  id uuid primary key default gen_random_uuid(),
  public_token text not null unique,
  status text not null default 'waiting'
    check (status in ('waiting', 'active', 'closed')),
  visitor_label text,
  conversation_summary text,
  telegram_chat_id text,
  telegram_anchor_message_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.handoff_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.handoff_sessions (id) on delete cascade,
  role text not null check (role in ('visitor', 'ernst', 'system')),
  content text not null,
  telegram_message_id bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_handoff_sessions_token
  on public.handoff_sessions (public_token);

create index if not exists idx_handoff_sessions_anchor
  on public.handoff_sessions (telegram_anchor_message_id);

create index if not exists idx_handoff_messages_session_created
  on public.handoff_messages (session_id, created_at);

create index if not exists idx_handoff_messages_telegram_id
  on public.handoff_messages (telegram_message_id);

alter table public.handoff_sessions enable row level security;
alter table public.handoff_messages enable row level security;

drop policy if exists "Service role full access handoff_sessions" on public.handoff_sessions;
create policy "Service role full access handoff_sessions"
  on public.handoff_sessions for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role full access handoff_messages" on public.handoff_messages;
create policy "Service role full access handoff_messages"
  on public.handoff_messages for all
  to service_role
  using (true)
  with check (true);

-- No anon policies: all access goes through Edge Functions with the service role.
