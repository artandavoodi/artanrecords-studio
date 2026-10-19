-- Prepared for the isolated Studio project; no payout or signing service is enabled.
begin;
create table public.studio_partnerships (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.studio_contracts(id),
  partnership_type text not null check (partnership_type in ('SILVER','GOLD','PLATINUM')),
  artist_share_bps integer not null check (artist_share_bps between 0 and 10000),
  artanrecords_share_bps integer not null check (artanrecords_share_bps between 0 and 10000),
  effective_date date not null,
  version integer not null check (version > 0),
  status text not null check (status in ('proposed','active','ended','superseded')),
  service_scope text not null check (length(trim(service_scope)) between 1 and 10000),
  included_services jsonb not null default '[]' check (jsonb_typeof(included_services)='array'),
  optional_services jsonb not null default '[]' check (jsonb_typeof(optional_services)='array'),
  approved_expenses jsonb not null default '[]' check (jsonb_typeof(approved_expenses)='array'),
  recoupment_terms text not null default '',
  created_at timestamptz not null default now(),
  check (artist_share_bps + artanrecords_share_bps = 10000),
  unique (agreement_id,version)
);
alter table public.studio_partnerships enable row level security;
revoke all on public.studio_partnerships from anon, authenticated;
grant select on public.studio_partnerships to authenticated;
create policy partnership_read on public.studio_partnerships for select to authenticated
using (exists (select 1 from public.studio_contracts c
  where c.id=agreement_id and c.account_id=(select auth.uid())));
-- Trusted staff services alone assign or revise terms; user metadata is never authoritative.
commit;
