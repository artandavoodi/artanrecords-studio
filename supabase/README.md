# Studio Backend Activation

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

## Public Discovery

## Partnership Preparation

`202610190001_studio_partnerships.sql` prepares agreement-specific, versioned
service scope and revenue allocation in integer basis points. It does not seed
commercial defaults, enable signing, calculate balances or process payouts.
Only trusted staff services may assign terms; clients receive account-scoped
read access through the associated contract. This migration has not been applied
to a hosted project. Database-level isolation tests are required before activation;
source assertions are not a substitute for those tests.

Only the introduction and public legal notices are indexable. Private account, submission, agreement, analytics and financial routes stay noindex and require database authorization for their records. A sitemap is a discovery hint, not a ranking guarantee. Search currently indexes public explanatory text and route names only, never private account records.
