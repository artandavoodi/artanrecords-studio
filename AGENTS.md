# Surface ownership

Public brand: Artanrecords, one word. Normalize transcription variants in copy,
browser titles and metadata; preserve registered domains and stable identifiers.

This repository publishes public files from main at repository root.
Content belongs to content/site.json. Generated HTML must not be edited manually.
foundation/ and assets/ are checksum-verified copies from artandavoodi/artanrecords.
Change shared assets in that repository and run its tools/sync-surfaces.mjs with
this repository as the explicit target. Commit the source first so the manifest
identifies its exact revision. Do not add independent icons, colors or fonts.
Run npm run build and npm run check before committing. CI verifies regeneration.
Never commit private artist data, Business.md, contracts, secrets or financial data.
Accounts and private profiles use the approved shared Store identity with owner-only
access. Artist acceptance, submissions, signing and financial services remain gated;
never infer those permissions from account creation or editable profile metadata.
Studio-owned application code belongs in app/, configuration in content/, and
isolated backend migrations in supabase/. Do not edit foundation/ or assets/
directly. Account activation requires a dedicated configured project, applied
and tested RLS, verified delivery and owner approval; prepared code is not a
deployed service. Index only public introduction and notices, never private data.

Header tools use the label's header action mount, never page-body shortcuts.
Account access and search use dialogs outside main; profile management remains
account-owned. Preserve native dialog focus restoration and page scroll position.
app/shared/ is a generated, checksum-verified Store distribution. Its search,
dialog helper, close primitive and presentation rules are not independently owned
here. Update only via tools/build-app.mjs --sync-design against a verified Store
commit; CSS extraction boundaries must fail if the owning source changes.
