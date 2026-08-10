-- Consolidated schema for digital-self-aura (single Supabase project)
-- Run in SQL Editor or via Management API on the NEW project.

create extension if not exists vector with schema extensions;

create table if not exists public.documents (
  id bigserial primary key,
  content text,
  metadata jsonb default '{}'::jsonb,
  embedding extensions.vector(1536)
);

create or replace function public.match_documents (
  query_embedding extensions.vector(1536),
  match_count int default 5,
  filter jsonb default '{}'::jsonb
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
stable
as $$
begin
  return query
  select
    d.id,
    d.content,
    d.metadata,
    (1 - (d.embedding <=> query_embedding))::float as similarity
  from public.documents d
  where (
    filter = '{}'::jsonb
    or d.metadata @> filter
  )
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;

alter table public.documents enable row level security;

drop policy if exists "Anon can read documents" on public.documents;
create policy "Anon can read documents"
  on public.documents for select
  to anon, authenticated
  using (true);

drop policy if exists "Service role full access documents" on public.documents;
create policy "Service role full access documents"
  on public.documents for all
  to service_role
  using (true)
  with check (true);

grant execute on function public.match_documents(extensions.vector, int, jsonb)
  to anon, authenticated, service_role;

do $$ begin
  create type public.lead_status as enum (
    'new', 'contacted', 'qualified', 'meeting_scheduled', 'converted', 'closed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.lead_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null;
end $$;

create table if not exists public.leads (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  company text,
  job_title text,
  source text not null default 'ai_chat',
  interest_area text default 'general',
  message text,
  conversation_summary text,
  status public.lead_status not null default 'new',
  priority public.lead_priority not null default 'medium',
  meeting_requested boolean not null default false,
  meeting_scheduled_at timestamptz,
  meeting_notes text,
  ip_address text,
  user_agent text,
  referrer_url text,
  session_id text,
  last_contacted_at timestamptz,
  converted_at timestamptz
);

create index if not exists idx_leads_email on public.leads (email);
create index if not exists idx_leads_status on public.leads (status);
create index if not exists idx_leads_created_at on public.leads (created_at desc);

create or replace function public.update_leads_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_leads_updated_at on public.leads;
create trigger update_leads_updated_at
  before update on public.leads
  for each row execute function public.update_leads_updated_at();

alter table public.leads enable row level security;

drop policy if exists "Service role can insert leads" on public.leads;
create policy "Service role can insert leads"
  on public.leads for insert to service_role with check (true);

drop policy if exists "Service role can read leads" on public.leads;
create policy "Service role can read leads"
  on public.leads for select to service_role using (true);

drop policy if exists "Service role can update leads" on public.leads;
create policy "Service role can update leads"
  on public.leads for update to service_role using (true);
