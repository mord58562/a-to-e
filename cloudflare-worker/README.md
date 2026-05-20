# A to E - remote inbox + reports worker

Tiny Cloudflare Worker that lets the public site accept question uploads
and bug reports from any visitor (not just the laptop running
`scripts/server.py`). It commits to the GitHub repo via the Contents
API, so GitHub Pages picks up the change automatically.

## One-time setup

1. **Install wrangler**: `brew install cloudflare-wrangler` (or
   `npm i -g wrangler`).
2. **Log in**: `wrangler login` - opens a browser, takes ~10 s.
3. **Create a GitHub fine-grained PAT**:
   - <https://github.com/settings/personal-access-tokens/new>
   - Resource owner: your account (mord58562)
   - Repository access: only `a-to-e`
   - Repository permissions: **Contents: Read and write**
   - Expiration: 1 year (renew when it pops)
   - Copy the `github_pat_...` token once.
4. **Set the token as a secret**:
   ```sh
   cd ~/y4-mcq/cloudflare-worker
   wrangler secret put GITHUB_TOKEN
   # paste the token at the prompt
   ```
5. **Deploy**:
   ```sh
   wrangler deploy
   ```
   Wrangler prints the public URL, e.g.
   `https://a-to-e-inbox.<your-subdomain>.workers.dev`.
6. **Wire the site to the worker URL**: in `~/y4-mcq/assets/app.js`,
   set `WORKER_URL` to the printed URL. Bump the cache-bust `v=` in
   `index.html`, commit + push.

## Test

```sh
curl -X POST https://a-to-e-inbox.<subdomain>.workers.dev/report \
  -H "Content-Type: application/json" \
  -d '{"question_id":"paeds-001","issue":"test","profile":"guest"}'
```

Expected: `{"ok":true,"id":"report-..."}`. Check the repo - you should
see a new commit on main updating `data/reports.json`.

## Endpoints

- `POST /paste`         - body `{ questions: [...], model?: "Claude 3.5" }` -
  writes `data/inbox/pasted-<stamp>-<id>.json` and appends to
  `data/inbox_manifest.json`.
- `POST /report`        - body `{ question_id, issue, profile?, model? }` -
  appends to `data/reports.json`.
- `POST /apply-audit`         - body `{ batch_path, audit: { summary, kept[], dropped[] }, profile }` -
  promotes the audited batch's kept[] questions into the live
  per-topic files (paeds/obgyn/psych/medicine, bucketed by `topic`),
  removes the batch from `data/inbox_manifest.json` and zeroes the
  inbox file, appends to `data/audit_log.md`. Called by the in-app
  Audit Dashboard after Rob pastes Claude.ai's audit response.
- `POST /apply-live-audit`    - body `{ file_path, audit: { summary, kept[], dropped[] }, profile }` -
  re-audits an existing batch file or main questions file in place.
  Overwrites the file with the kept[] array, appends summary +
  dropped[] to `data/audit_log.md`. Used by the Live tab of the
  Audit Dashboard to audit content already in the bank.
- `POST /apply-report`  - body `{ resolutions: [ { report_id, question_id, action, resolution, fixed_question? } ] }` -
  updates `data/reports.json` status/resolution, and for fix/drop
  actions also edits the question in its containing live file.
  Called by the in-app Audit Dashboard after Rob pastes Claude.ai's
  report-audit response.

CORS is locked to `https://mord58562.github.io` by default. Change
`ALLOW_ORIGIN` in `wrangler.toml` for dev.

## Cost / limits

Cloudflare Workers free tier: 100k requests/day. The worker hits the
GitHub Contents API which has a 5000 req/hour limit on authenticated
calls; well within real-world usage for a question bank.
