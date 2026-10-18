# Artan Records Studio

## Account Upgrade, October 18, 2026

Header account/search tools now occupy the label's canonical action slot and inherit
its scroll collapse. Search and account access mount as native dialogs outside main.
Store search ranking, focus notifications, dialog scroll restoration, close-button
primitive and presentation rules are pinned in app/design-manifest.json. Refresh
that distribution explicitly with node tools/build-app.mjs --sync-design; never
manually edit app/shared/. Search indexes public guidance only, not artist records.

Studio-owned application modules are in app/ and backend preparation is in supabase/. The shared label shell remains pinned and checksum-verified. The duplicate body logo is removed; public search, account routes, private profile and release-draft clients, cookie choices and legal notices are implemented locally. Public introduction and legal pages are indexable; workspace routes are not.

No Studio backend is activated: the free-project quota is exhausted and the owner deferred reviewing the Pro purchase. Do not reuse Store/Neuroartan projects or enable registration until a dedicated project, migrations, email delivery, CAPTCHA/rate limits and two-account RLS tests are verified. Phone, Google, Stripe Connect, real financial reporting and digital signature delivery remain inactive. See supabase/README.md for activation and contract-management gates. A build or mock test is not evidence of hosted operational readiness.

Target domain:

`https://studio.artanrecords.com`

## Purpose

Artan Records Studio is the future authenticated operational platform for accepted artists.

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
