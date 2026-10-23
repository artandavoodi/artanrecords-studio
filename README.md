# Artanrecords Studio

## Development Registration

Every major and minor development change must follow the canonical [Control Center development-registration policy](https://github.com/artandavoodi/control-center/blob/main/docs/development-registration.md). Commit in the owning repository; never copy code, tokens or vectors to register a change. Private repository history remains private until its authorized connector is available.

## Shared Platform Controls

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

Studio should use the Artan Records shared visual foundation while prioritizing:

- clarity
- trust
- legibility
- accessibility
- responsive operation
- precise financial presentation

It should not become generic SaaS or fintech in appearance.

## Deployment

This directory will eventually deploy independently to:

`studio.artanrecords.com`

Do not configure production deployment until the runtime/security architecture is approved.
