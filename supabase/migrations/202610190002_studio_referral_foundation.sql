-- Inactive referral foundation. No cash value, awards or redemption routes are seeded.
begin;
create table public.studio_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id),
  referred_account_id uuid references auth.users(id),
  status text not null check (status in ('pending','qualified','declined','cancelled')),
  programme_version text not null,
  agreement_id uuid references public.studio_contracts(id),
  created_at timestamptz not null default now(),
  check (referred_account_id is null or referred_account_id<>referrer_id)
);
create unique index studio_referral_attribution on public.studio_referrals(referred_account_id)
where referred_account_id is not null;
alter table public.studio_referrals enable row level security;
revoke all on public.studio_referrals from anon,authenticated;
grant select(id,status,programme_version,created_at) on public.studio_referrals to authenticated;
create policy referral_owner_read on public.studio_referrals for select to authenticated
using(referrer_id=(select auth.uid()));

create table public.studio_service_credit_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id),
  referral_id uuid references public.studio_referrals(id),
  quantity_delta integer not null check(quantity_delta<>0),
  event_type text not null check(event_type in ('award','reserve','redeem','release','reverse','expire')),
  programme_version text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
alter table public.studio_service_credit_events enable row level security;
revoke all on public.studio_service_credit_events from anon,authenticated;
grant select(id,quantity_delta,event_type,programme_version,created_at) on public.studio_service_credit_events to authenticated;
create policy credit_owner_read on public.studio_service_credit_events for select to authenticated
using(account_id=(select auth.uid()));
-- Awards/redemptions require a trusted, transactional service with balance checks.
-- Clients cannot manufacture points, qualify a referral or change agreement terms.
commit;
