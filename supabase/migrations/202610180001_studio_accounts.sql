-- Dedicated Artan Records Studio project only. Never apply to Store or Neuroartan.
begin;
create table public.studio_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name)<=100),
  artist_name text not null default '' check (length(artist_name)<=100),
  biography text not null default '' check (length(biography)<=2000),
  website text not null default '' check (website='' or (website ~ '^https://' and length(website)<=500)),
  created_at timestamptz not null default now()
);
alter table public.studio_profiles enable row level security;
revoke all on public.studio_profiles from anon,authenticated;
grant select,insert,update on public.studio_profiles to authenticated;
create policy profile_read on public.studio_profiles for select to authenticated using (id=(select auth.uid()));
create policy profile_create on public.studio_profiles for insert to authenticated with check (id=(select auth.uid()));
create policy profile_change on public.studio_profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));

-- Approval and roles are label-managed, never editable user metadata.
create table public.studio_memberships (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  artist_id uuid not null,
  role text not null check(role in ('artist','manager')),
  approved_at timestamptz,
  unique(account_id,artist_id)
);
alter table public.studio_memberships enable row level security;
revoke all on public.studio_memberships from anon,authenticated;
grant select on public.studio_memberships to authenticated;
create policy membership_read on public.studio_memberships for select to authenticated using(account_id=(select auth.uid()));

create table public.studio_submissions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 200),
  work_type text not null check(work_type in ('recording','mix','master','artwork')),
  status text not null default 'draft' check(status in ('draft','submitted')),
  notes text not null default '' check(length(notes)<=5000),
  created_at timestamptz not null default now()
);
alter table public.studio_submissions enable row level security;
revoke all on public.studio_submissions from anon,authenticated;
grant select,insert on public.studio_submissions to authenticated;
grant update(title,work_type,notes,status) on public.studio_submissions to authenticated;
create policy submissions_read on public.studio_submissions for select to authenticated using(account_id=(select auth.uid()));
create policy submissions_create on public.studio_submissions for insert to authenticated with check(account_id=(select auth.uid()) and status='draft');
create policy submissions_edit on public.studio_submissions for update to authenticated using(account_id=(select auth.uid()) and status='draft') with check(account_id=(select auth.uid()));

-- Contract records are visible only to their intended account and written by trusted staff services.
create table public.studio_contracts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id),
  title text not null check(length(title) between 1 and 200),
  version integer not null check(version>0),
  document_sha256 text not null check(document_sha256 ~ '^[a-f0-9]{64}$'),
  provider_reference text,
  status text not null check(status in ('preparing','review','sent','completed','void')),
  created_at timestamptz not null default now()
);
alter table public.studio_contracts enable row level security;
revoke all on public.studio_contracts from anon,authenticated;
grant select(id,account_id,title,version,document_sha256,status,created_at) on public.studio_contracts to authenticated;
create policy contracts_read on public.studio_contracts for select to authenticated using(account_id=(select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('studio-avatars','studio-avatars',false,2097152,array['image/jpeg','image/png','image/webp']);
create policy avatar_read on storage.objects for select to authenticated using(bucket_id='studio-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy avatar_create on storage.objects for insert to authenticated with check(bucket_id='studio-avatars' and name=(select auth.uid())::text||'/avatar');
create policy avatar_change on storage.objects for update to authenticated using(bucket_id='studio-avatars' and name=(select auth.uid())::text||'/avatar') with check(bucket_id='studio-avatars' and name=(select auth.uid())::text||'/avatar');
create policy avatar_remove on storage.objects for delete to authenticated using(bucket_id='studio-avatars' and name=(select auth.uid())::text||'/avatar');
commit;
