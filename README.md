# Artanrecords Studio

## Subscription and presentation update - 2026-10-26

Settings separates Subscription & billing from Artist payout setup. Subscription
status comes from the account-scoped server procedure, not editable Auth metadata;
only verified, active/trialing and unexpired access displays Pro. Checkout, card
collection and recurring charges remain disabled pending approved commercial terms
and provider integration. The supplied commerce briefs contain no Studio Pro
price, billing currency, trial duration or paid feature specification.

Graphics supports at most five colours, mutually exclusive surface assignments
and the logo target. Public theme/colour application remains opt-in. Appearance
reuses pinned Neuroartan breathing-circle and matte components; company/custom
themes enable those controls, while unsupported cinematic video and shader
controls stay disabled. Reduced-motion preferences disable breathing animation.

## Creator Store foundation

`/store/` provides private store preparation, product and collection drafts,
profile/shop domain requests and a gated finance notice. Drafts belong to the
verified account's stable creator/store IDs; table policies, composite foreign
keys and restricted column grants enforce ownership on the shared backend.
The canonical backend migration belongs to the existing artan-store repository,
not a second database or a new Supabase account. No existing storefront is moved.

Public route and commerce contracts are owned by Artanrecords
`docs/assets/data/commerce.json` and distributed through the checksum-verified
foundation; Studio copy and field configuration are owned by `content/commerce.json`.
Domain requests are not connected domains. Public shops, product publication,
DNS/TLS activation, seller onboarding, company collection, commissions and
withdrawals remain disabled pending their documented server and approval gates.
`tools/commerce.test.mjs` and the Store browser cases cover this boundary.

## Development Registration

Every major and minor development change must follow the canonical [Control Center development-registration policy](https://github.com/artandavoodi/control-center/blob/main/docs/development-registration.md). Commit in the owning repository; never copy code, tokens or vectors to register a change. Private repository history remains private until its authorized connector is available.

## Shared Platform Controls

The Studio wordmark uses the approved shared header dimensions imported from
`brand-header.tokens.css`. Do not add local size multipliers. Shared logo artwork
remains unchanged. Public artist links use `https://artanrecords.com/{username}/`;
the username and its label-approval requirement remain unchanged.

Studio owns its stationary header and copyright-only footer in
`app/shell-render.mjs`; marketing navigation does not own platform identity.
Workspace column dividers belong to the full-height rail, not its inner sticky
scroller. Studio hides scrollbar tracks while preserving native scrolling.
Search artwork travels to the menu position before registered close artwork is
revealed; primitive normalization must never discard that artwork.
Public Studio notices are authored in Artanrecords website's
`docs/assets/data/studio-legal.json`, published there, and imported through the
foundation manifest. Legacy Studio notice routes read that same source and are
not indexed. Privacy controls remain available in Settings, not the footer.

Neuroartan owns the consent panel, theme engine, radio and toggle primitives,
appearance markup, and category vectors imported under `app/neuroartan/`.
Run `node tools/sync-platform.mjs --sync` only against a committed Neuroartan
website source. `app/platform-manifest.json` pins the exact revision and hashes;
normal builds verify the snapshot without reading neighbouring repositories.
Do not edit those distributions or replace their vectors locally.

Studio's adapter owns its legal routes and storage policy: optional preference
memory permits persistent browser storage; otherwise interface choices remain
in tab-session storage. Consent records are necessary storage. Account preference
sync and background-rendering engines remain disconnected. Commercial plan and
service explanations belong to the public website and Docs, not workspace pages.

## Next Platform Priorities

These remain open, not implied by the public interface: isolated account and artist
membership activation; secure release assets and provenance; versioned agreements
and signing; distributor-neutral catalogue management; reconciled statement imports;
auditable royalty accounting; verified payout onboarding; account-owned support
requests; permission-aware private search; and hosted recovery/accessibility tests.
No balances, signed agreements, payout readiness or analytics should be fabricated
to fill an empty workspace. Public metadata describes available capabilities only.

## Platform Shell

Workspace navigation is owned by content/platform.json. Desktop uses a collapsible
rail; compact views use the same icon-driven destinations in the menu. Settings
provides appearance, privacy, account-security access and connection status.
The public overview carries SoftwareApplication metadata; private workspace
routes remain noindex. manifest.webmanifest prepares standalone browser launch;
there is no offline cache or service worker storing private records.

The approved shared Store identity, private profiles, metadata drafts and selected
public artist snapshots are connected. Streaming imports, royalty accounting,
payout onboarding and secure signing remain separate activation gates. No balances,
streaming totals, signed contracts or payment readiness are simulated.

## Account Upgrade, October 18, 2026

Header account/search tools now occupy the label's canonical action slot and inherit
its scroll collapse. Search and account access mount as native dialogs outside main.
Store search ranking, focus notifications, dialog scroll restoration, close-button
primitive and presentation rules are pinned in app/design-manifest.json. Refresh
that distribution explicitly with node tools/build-app.mjs --sync-design; never
manually edit app/shared/. Search indexes public guidance only, not artist records.

Studio-owned application modules are in app/ and backend preparation is in supabase/. The shared label shell remains pinned and checksum-verified. The duplicate body logo is removed; public search, account routes, private profile and release-draft clients, cookie choices and legal notices are implemented locally. Public introduction and legal pages are indexable; workspace routes are not.

On October 20 the owner approved the existing Store project for shared identity
and isolated Studio records; Neuroartan remains a separate identity system.
Google and email account clients use that approved shared configuration. Phone,
Stripe Connect, financial reporting and digital signatures remain inactive.
Selected public images were connected on October 23 with hosted isolation tests;
private buckets were not made public. See supabase/README.md for the exact scope.
A build or mock test is not evidence of every hosted account or business journey.

Target domain:

`https://studio.artanrecords.com`

## Purpose

Artanrecords Studio is the artist account and operational platform under development.

Long-term areas may include:

- Overview
- Releases
- Analytics
- Royalties
- Statements
- Payouts
- Agreements
- Profile
- Settings
- secure tax/payment onboarding

## Current status

Foundation only.

Do not present unfinished functionality as operational.

Do not create fake:

- balances
- royalties
- payouts
- analytics
- agreements
- artist data
- authentication

## Architecture requirement

Studio must not be permanently constrained to static-only hosting.

Its future architecture must be capable of supporting:

- authentication
- server-side authorization
- private artist data
- tenant isolation
- secure documents
- audit logs
- financial records
- APIs/databases where justified

## Design

### Bank and payout settings

The owner approved platform-collected store payments using Stripe Connect separate
charges and transfers on 2026-10-25. `content/bank.json` records that decision but
does not activate a financial service. Commission, withdrawal minimum and currency
remain unset; the illustrative 15% is not a policy. Recording royalties remain a
separate source from settled store sales.

Private billing addresses belong to Settings > Addresses, using the existing
owner-only address table. Settings > Payment & payout methods is reserved for
secure provider onboarding; never collect raw bank, card or identity documents
in public profile fields. Business > Bank owns Overview, Earnings, Analytics and
Withdrawals. The legacy `/payments/` entry links to its Settings destination.

Live activation still requires the owner's Artanrecords Stripe business-account
registration, supported-country and Connect configuration, approved commercial
terms, a server-owned financial ledger, signed idempotent webhook processing,
reconciliation and tested withdrawal authorization. The current Bank view has no
financial data source and deliberately presents unavailable balances, no charts
and a disabled withdrawal action. Account return redirects are not verification.
Do not activate these views by changing a client flag or infer money permissions
from an artist tier. Existing Store checkout and Stripe accounts are unchanged.

`app/bank.js` submits a private payout application through the authenticated
database procedure. Artists remain inside Studio and receive an under-review
status; the enabled CEO owner reviews applications in Control Center. No Stripe
handoff is created. Bank/card numbers, tax identifiers and identity documents
are not collected. Approval requires trusted provider evidence, whose connector
is not yet implemented; live money movement remains disabled. Browser fixtures
verify interface behaviour, not provider approval or financial activation.

Studio should use the Artan Records shared visual foundation while prioritizing:

- clarity
- trust
- legibility
- accessibility
- responsive operation
- precise financial presentation

It should not become generic SaaS or fintech in appearance.

## Deployment

This directory deploys independently to:

`studio.artanrecords.com`

Payout applications stay internal. Secure bank/tax intake and the trusted provider-evidence connector remain launch gates; an internal review is not provider verification. Live payments and withdrawals remain disabled.

Private account email and contact phone are managed in Settings > Account security. Profile saves cannot clear the private phone or change verification status. Public contact links remain separate, artist-selected metadata.

Artist colours have explicit optional targets for icons, header fade and header ribbon, saved by the owner-only graphics RPC. Unshared colours do not enter the public projection. Existing unassigned palettes preserve their prior mapping.

Agreements includes a local, non-binding signing preview with per-section initials and a downloadable preview record. It does not execute contracts, write signatures or grant entitlements. Real issuance remains blocked pending legal review, immutable server-side versions, identity checks, evidence retention and document finalization; qualified signatures may require an external qualified provider. Control Center's private agreement draft is a review aid, not an approved legal contract.
