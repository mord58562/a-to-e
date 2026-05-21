# Legacy admin migration - removal guide

Once you've claimed admin on a cloud account, this entire feature should be deleted from the site. It's a one-time bootstrap and nothing else uses it.

## What it does (until you delete it)

- Lets a new cloud signup pass an optional `legacy_admin_secret` field. If the SHA-256 of that secret matches the original local-gate password hash, the user is created with `is_admin = 1`.
- Lets an existing cloud user prove they know the legacy secret via `POST /api/account/claim-admin` and be promoted to `is_admin = 1` in place.
- Surfaces both flows in the UI: a "Claim admin (optional)" disclosure on the signup pane of the gate, and a "Claim admin rights" block on the Account tab of the Admin modal for non-admin cloud users.

## How to delete cleanly

Every byte of the feature is wrapped in sentinel comments. Search the repo for `LEGACY_ADMIN_MIGRATION` and delete everything between matching `LEGACY_ADMIN_MIGRATION-START` and `LEGACY_ADMIN_MIGRATION-END` markers.

```bash
cd ~/y4-mcq
grep -rln 'LEGACY_ADMIN_MIGRATION' .
```

Files that contain the markers (May 2026):
- `cloudflare-worker/src/worker.js` - 4 blocks (constant + helper, `is_admin` branch inside `handleRegister`, `handleClaimAdmin` function, route registration)
- `index.html` - 1 block (the `<details class="gate-extra">` on the signup form)
- `assets/app.js` - 4 blocks (`cloudSignUp` legacy payload key, `cloudClaimAdmin` function, account-tab claim block + wiring, single signup-form line passing the legacy field)
- `assets/styles.css` - 1 block (`.gate-extra`, `.account-claim-admin`, `.claim-row` styles)

A safe one-shot removal (review the diff before pushing):

```bash
cd ~/y4-mcq
python3 - <<'PY'
import re, pathlib
TARGETS = [
  'cloudflare-worker/src/worker.js',
  'index.html',
  'assets/app.js',
  'assets/styles.css',
]
# Matches both block-style markers (between START and END) and the
# single-line "LEGACY_ADMIN_MIGRATION: remove the line below" markers.
for p in TARGETS:
    txt = pathlib.Path(p).read_text()
    # Remove paired START..END blocks (any comment syntax).
    txt = re.sub(r'^[ \t]*[^\n]*LEGACY_ADMIN_MIGRATION-START[\s\S]*?LEGACY_ADMIN_MIGRATION-END[^\n]*\n?', '', txt, flags=re.M)
    # Remove "remove the line below" single-line markers + the line after.
    txt = re.sub(r'^[ \t]*[^\n]*LEGACY_ADMIN_MIGRATION:[^\n]*\n[^\n]*\n', '', txt, flags=re.M)
    pathlib.Path(p).write_text(txt)
print('Removed LEGACY_ADMIN_MIGRATION markers from', TARGETS)
PY
```

Then redeploy the worker:

```bash
cd cloudflare-worker && npx wrangler deploy
```

And bump the cache query string at the bottom of `index.html` (`?v=YYYYMMDDx`) so the new bundle is fetched.

## Nothing else depends on this

`is_admin` flags already set on user rows in D1 are not touched by removal. The deletion only removes the *mechanism* to grant new admin via the legacy secret - existing admins stay admin.

If you ever need to grant admin again post-removal, the simplest path is a direct D1 update:

```bash
cd ~/y4-mcq/cloudflare-worker
npx wrangler d1 execute a-to-e --command "UPDATE users SET is_admin = 1 WHERE email = 'you@example.com'" --remote
```

Or grant from inside the app: any existing admin can use the Users tab in the Admin modal to promote anyone via the `/api/admin/users/:id/promote` endpoint.
