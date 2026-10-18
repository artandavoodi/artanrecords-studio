# Surface ownership

This repository publishes public files from main at repository root.
Content belongs to content/site.json. Generated HTML must not be edited manually.
foundation/ and assets/ are checksum-verified copies from artandavoodi/artanrecords.
Change shared assets in that repository and run its tools/sync-surfaces.mjs with
this repository as the explicit target. Commit the source first so the manifest
identifies its exact revision. Do not add independent icons, colors or fonts.
Run npm run build and npm run check before committing. CI verifies regeneration.
Never commit private artist data, Business.md, contracts, secrets or financial data.
Studio is a public foundation, not a secure account platform.
Studio-owned application code belongs in app/, configuration in content/, and
isolated backend migrations in supabase/. Do not edit foundation/ or assets/
directly. Account activation requires a dedicated configured project, applied
and tested RLS, verified delivery and owner approval; prepared code is not a
deployed service. Index only public introduction and notices, never private data.
