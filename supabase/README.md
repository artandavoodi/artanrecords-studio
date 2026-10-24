# Studio Backend Activation

## Active shared identity

Artist catalogue metadata and release/track drafts were added on 2026-10-20 by
the Store-owned `202610200002_studio_metadata.sql` migration. Hosted tests verified
owner-only reads/updates, immutable ownership, schema constraints and anonymous
denial, including rows with requested public visibility. All synthetic fixtures
were rolled back. These are private records, not direct publishing or distribution.
`content/metadata.json` owns field definitions and publication allowlists.
`tools/export-catalogue.mjs` remains an owner-run, documented-review export for
catalogue drafts. Separately, approved artist pages use `studio_artist_pages`:
selected profile fields refresh on save after first publication and username
approval. Release drafts are not automatically published. No account email,
phone, billing, private listening references or contributor legal names are exported.

### Private release artwork, October 24, 2026

Store-owned `202610240002_release_artwork.sql` is applied to the shared project.
The private `studio-release-artwork` bucket accepts JPEG/PNG originals up to
10 MB. Object paths bind the authenticated owner, an existing owned release
draft and a unique asset ID. Only that owner can insert/read; replacements use
new immutable objects, with no client update/delete or public grants.
Hosted transaction tests verified owner access, unknown-draft rejection, foreign
insert/read denial and anonymous denial; all fixtures were rolled back.

Studio validates square images from 1000 to 6000 pixels per side and recommends
3000. `content/release-artwork.json` owns these intake limits and field grouping.
Draft text is saved before upload so a failed cover upload can be retried without
duplicating the draft. Metadata attachment is explicit and private. These client
image checks are intake guidance, not a server-side distributor approval system.
No original cover is exported publicly or delivered by saving a draft; reviewed
publication and distributor asset delivery remain separate implementation gates.

### Selected artist images, October 23, 2026

Store-owned `202610230001_artist_media_publication.sql` was applied to the shared
project. Owner-only `studio_artist_media` preferences default to private. A public
snapshot projects a portrait/header path only when that artist selected it and
the corresponding object exists. The buckets remain private. Anonymous reads
allow only get operations for paths in an existing published snapshot, never
bucket listing or signing operations. Public pages fetch those selected images
with the publishable key and `cache: no-store`; no service credential is shipped.
Saving an image refreshes an existing publication, never first-publishes a page.
Withdrawal/unpublishing blocks new downloads; previously downloaded copies cannot
be recalled. Hosted rollback-only tests verified isolation, explicit publication,
selected reads, listing denial, withdrawal and unpublishing. The selected founder
portrait was also retrieved through the anonymous Storage API and displayed in
the local public catalogue. No header was fabricated where no upload existed.

On 2026-10-20 the owner approved reusing the existing Store Supabase project.
No project, organization, customer record or existing service was removed or
paused. Store owns the additive migration
`supabase/migrations/202610200001_shared_studio_profiles.sql`; it creates only
private Studio profiles, billing addresses and the private studio-avatars bucket.
The migration was applied through the hosted SQL editor. Two synthetic identities
verified own-record updates, cross-account denial, anonymous denial and avatar
isolation in a transaction that was fully rolled back.

Store's Site URL and existing callback URLs were preserved. Exact hosted Studio
account/recovery callbacks and the local 127.0.0.1:9038 equivalents were added.
Google and email registration were verified as enabled in the existing provider
settings. Studio uses its own session-storage key and local-scope sign-out;
password changes still affect the shared identity. Payments, signing, financial
records, submissions and automatic artist approval remain disabled.

The dedicated-project migrations below are a separate future deployment path;
do not apply them to Store. Email delivery and recovery must be checked with a
real new registration/recovery journey before claiming those journeys verified.

## Shared Store project review

Reviewed 2026-10-20 at the owner's request; the narrow profile activation above
was subsequently approved, not a blanket migration of all Studio services.
The existing Store project can technically serve a second first-party application
without creating a third project, subject to its shared free-plan quotas.
Supabase supports explicit per-application redirect URLs:
https://supabase.com/docs/guides/auth/redirect-urls

Required decisions and checks before enabling this option:

- Store and Studio would share auth.users identities, credentials, provider
  configuration, email templates, quotas and backend availability. Browser
  sessions are still origin-scoped; the website should continue sending users
  to Studio's single account entry rather than copying sessions in URLs.
- Password changes, recovery, global sign-out and deletion need an account-wide
  policy. A Store deletion workflow must not silently delete an artist identity,
  contracts or legally retained financial records.
- Keep Store tables and buckets unchanged. Prepare a separately reviewed,
  additive Studio migration, separate profile/billing/avatar ownership and
  staff-managed artist memberships. Do not apply the existing dedicated-only
  migration blindly and do not reuse Store checkout privileges for royalties.
- RLS restricts records by identity, not the website from which a token came.
  A shared first-party token may access that same customer's permitted data in
  either application; this is not equivalent to separate-project isolation.
  Never treat client-editable metadata as staff or artist approval.
- Preserve the Store Site URL, Google callback and recovery routes. Add only
  reviewed exact Studio callback/recovery URLs. Review shared confirmation,
  recovery and Google consent wording so it accurately names both applications.
- Review privacy disclosures, then run real two-user isolation tests and hosted
  signup, Google return, recovery and logout journeys for both applications.

The review itself made no hosted changes. The later approved profile and redirect
activation is recorded above; Neuroartan is still explicitly rejected as a Studio
backend, and Store identity is accepted only in explicit shared-store mode.

## Dedicated project path

This is a separate project, not the Store or Neuroartan project. No hosted migration has been applied and no project credentials are configured.

1. The owner reviews and purchases a plan if desired, then creates a dedicated project and enters its database password privately.
2. Apply both migrations in timestamp order in this project only; run real two-account RLS tests, including billing addresses, avatar path attacks, membership escalation and contract writes.
3. Configure the canonical Studio URL and explicit local callback allowlist. Require email confirmation, configure rate limits and CAPTCHA, and verify actual email delivery before opening registration.
   For confirmation and recovery links that work across tabs/devices, configure the dedicated templates with Studio's /account/ callback, token_hash and the matching type. The client supports verifyOtp for those templates and PKCE code exchange for same-tab provider returns; it scrubs one-time credentials from the address bar. Do not claim cross-device recovery until the deployed template and actual mail journey are tested.
4. Add only the public project URL and publishable key to content/account.json. Never add a service-role key to the browser or repository.
5. Test creation, confirmation, sign-in, expired links, recovery, profile persistence, private avatar reads and sign-out on hosted desktop and Safari.
6. Google requires a dedicated reviewed OAuth client/branding configuration. SMS requires a separately approved provider and charges; both remain disabled.

## Artist Access

Authentication identifies an account; it does not approve an artist or grant label staff access. Memberships are staff-managed records, not editable metadata. Submissions are private account-owned drafts; audio upload and actual delivery remain unconnected. Client requests may not create contract records, mark agreements signed, or alter financial data.

## Contracts And Financial Services

Contract records prepare private account assignment, version and content-hash tracking. A signing provider, signer verification, consent process, immutable provider events, document storage and legal review are required before signing is enabled. No handwritten signing imitation or claim of legally binding signature is implemented.

Stripe Connect is the contemplated separate onboarding/payout boundary, not a reused Store checkout key. Account eligibility, country support, agreements, charges, reconciliation and signed idempotent webhooks must be reviewed before implementation. No payment, payout or royalty balance is active. Never store card numbers, bank details or tax documents in profile fields.

## Partnership Preparation

`202610190001_studio_partnerships.sql` prepares agreement-specific, versioned
service scope and revenue allocation in integer basis points. It does not seed
commercial defaults, enable signing, calculate balances or process payouts.
Only trusted staff services may assign terms; clients receive account-scoped
read access through the associated contract. This migration has not been applied
to a hosted project. Database-level isolation tests are required before activation;
source assertions are not a substitute for those tests.

## Public Discovery

Only the introduction and public legal notices are indexable. Private account, submission, agreement, analytics and financial routes stay noindex and require database authorization for their records. A sitemap is a discovery hint, not a ranking guarantee. Search currently indexes public explanatory text and route names only, never private account records.
