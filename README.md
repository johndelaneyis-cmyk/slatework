# Slatework

Free privacy-first toolkit for independent language tutors.

10 free tools across business setup, pricing, client acquisition, and lesson delivery — country-aware for US, UK, Canada, Australia, New Zealand, Ireland, and Hong Kong at launch.

Sibling project to [Authorly](https://authorly.tools) — same maker, same stack, sharper niche.

## Status

Pre-build. Design spec approved 2026-05-06.

## Spec

See [`docs/superpowers/specs/2026-05-06-slatework-design.md`](docs/superpowers/specs/2026-05-06-slatework-design.md) for the full design.

## Pre-launch checklist (manual one-offs)

These are the steps the codebase can't automate:

1. **Cloudflare Pages deploy** — connect the GitHub repo at dash.cloudflare.com/pages.
2. **Cloudflare Web Analytics** — Analytics & Logs → Web Analytics → Add a site → enter `slatework.tools` → copy the site_tag → replace `REPLACE_WITH_CF_BEACON_TOKEN` in `feedback.js`.
3. **KV namespaces** — create `RATE_LIMITS`, `FX_CACHE`, `FEEDBACK` in dash.cloudflare.com → Workers & Pages → KV. Bind each to the Pages project.
4. **Environment variables** — add `ANTHROPIC_API_KEY` and `BUTTONDOWN_API_KEY` as Pages env vars (production scope).
5. **Custom domain** — add `slatework.tools` in Pages → Custom domains; CF will auto-bind since the zone is already on Cloudflare.
