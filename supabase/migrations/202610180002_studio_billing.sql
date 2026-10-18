begin;
create table public.studio_billing_addresses (
  account_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check(length(full_name)<=200),
  line1 text not null default '' check(length(line1)<=200),
  line2 text not null default '' check(length(line2)<=200),
  city text not null default '' check(length(city)<=100),
  region text not null default '' check(length(region)<=100),
  postal_code text not null default '' check(length(postal_code)<=30),
  country text not null default '' check(length(country)<=100)
);
alter table public.studio_billing_addresses enable row level security;
revoke all on public.studio_billing_addresses from anon,authenticated;
grant select,insert,update,delete on public.studio_billing_addresses to authenticated;
create policy billing_read on public.studio_billing_addresses for select to authenticated using(account_id=(select auth.uid()));
create policy billing_create on public.studio_billing_addresses for insert to authenticated with check(account_id=(select auth.uid()));
create policy billing_change on public.studio_billing_addresses for update to authenticated using(account_id=(select auth.uid())) with check(account_id=(select auth.uid()));
create policy billing_remove on public.studio_billing_addresses for delete to authenticated using(account_id=(select auth.uid()));
commit;
