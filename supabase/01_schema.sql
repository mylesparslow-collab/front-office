-- Front Office schema: multi-tenant, every row belongs to a business.
create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  city text,
  owner_name text,
  phone text,
  sending_enabled boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  business_id uuid not null references public.businesses on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'owner' check (role in ('owner','staff')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses on delete cascade,
  name text not null,
  company text,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses on delete cascade,
  contact_id uuid references public.contacts on delete set null,
  title text not null,
  source text not null default 'Website',
  stage text not null default 'new' check (stage in ('new','contacted','quoted','won','lost')),
  value numeric(12,2) not null default 0,
  notes text,
  lost_reason text,
  first_response_at timestamptz,
  last_touch_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses on delete cascade,
  lead_id uuid references public.leads on delete set null,
  contact_id uuid references public.contacts on delete set null,
  number text not null,
  title text not null,
  items jsonb not null default '[]',
  amount numeric(12,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','sent','viewed','accepted','declined','expired')),
  public_token text not null unique default encode(gen_random_bytes(12),'hex'),
  sent_at timestamptz,
  viewed_at timestamptz,
  decided_at timestamptz,
  accepted_by text,
  valid_until date,
  chase_paused boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses on delete cascade,
  contact_id uuid references public.contacts on delete set null,
  quote_id uuid references public.quotes on delete set null,
  number text not null,
  title text not null,
  amount numeric(12,2) not null,
  paid numeric(12,2) not null default 0,
  issued_on date not null default current_date,
  due_on date not null,
  paid_on date,
  chase_paused boolean not null default false,
  created_at timestamptz not null default now()
);

-- Every chaser and reply. Nothing leaves the building unless sending_enabled is on
-- AND a delivery integration exists (none is wired up), so "sent" is recorded only.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses on delete cascade,
  contact_id uuid references public.contacts on delete set null,
  subject_type text not null check (subject_type in ('quote','invoice','lead')),
  subject_id uuid not null,
  step int,
  direction text not null default 'out' check (direction in ('out','in')),
  channel text not null default 'email' check (channel in ('email','sms')),
  status text not null default 'queued' check (status in ('queued','sent','skipped','received')),
  subject text,
  body text not null,
  due_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  kind text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cadences (
  business_id uuid not null references public.businesses on delete cascade,
  kind text not null check (kind in ('quote','invoice','lead')),
  steps jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (business_id, kind)
);

create index if not exists contacts_b on public.contacts(business_id);
create index if not exists leads_b on public.leads(business_id);
create index if not exists quotes_b on public.quotes(business_id);
create index if not exists invoices_b on public.invoices(business_id);
create index if not exists messages_b on public.messages(business_id, subject_type, subject_id);
create index if not exists activities_b on public.activities(business_id, subject_type, subject_id);
create index if not exists memberships_u on public.memberships(user_id);

-- Membership check used by every policy. security definer so it can read memberships
-- without recursing through memberships' own policy.
create or replace function public.is_member(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.business_id = b and m.user_id = auth.uid());
$$;
revoke all on function public.is_member(uuid) from public;
grant execute on function public.is_member(uuid) to authenticated;

alter table public.businesses enable row level security;
alter table public.memberships enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.messages enable row level security;
alter table public.activities enable row level security;
alter table public.cadences enable row level security;

drop policy if exists biz_read on public.businesses;
create policy biz_read on public.businesses for select to authenticated using (public.is_member(id));
drop policy if exists biz_update on public.businesses;
create policy biz_update on public.businesses for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

drop policy if exists mem_read on public.memberships;
create policy mem_read on public.memberships for select to authenticated using (user_id = auth.uid() or public.is_member(business_id));

do $$
declare t text;
begin
  foreach t in array array['contacts','leads','quotes','invoices','messages','activities','cadences'] loop
    execute format('drop policy if exists tenant_all on public.%I', t);
    execute format('create policy tenant_all on public.%I for all to authenticated using (public.is_member(business_id)) with check (public.is_member(business_id))', t);
  end loop;
end $$;

-- No anonymous table access at all; the public quote page goes through two narrow functions.
revoke all on all tables in schema public from anon;
