-- Prepared human-review workflow, not an automated AI-authorship verdict.
begin;
create table public.studio_provenance_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.studio_submissions(id),
  policy_version text not null,
  status text not null check(status in ('awaiting_review','clarification_requested','approved','declined')),
  artist_visible_reason text not null default '' check(length(artist_visible_reason)<=2000),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.studio_provenance_reviews enable row level security;
revoke all on public.studio_provenance_reviews from anon,authenticated;
grant select on public.studio_provenance_reviews to authenticated;
create policy provenance_owner_read on public.studio_provenance_reviews for select to authenticated
using(exists(select 1 from public.studio_submissions s
  where s.id=submission_id and s.account_id=(select auth.uid())));
-- Review decisions are trusted-staff writes. No detector score can auto-approve a release.
commit;
