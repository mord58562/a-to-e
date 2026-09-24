# Inbox

Staging for new questions. A file here is served only once it is listed in `data/inbox_manifest.json`.

## Adding a batch

1. Generate with `assets/prompt-template.txt` (the admin Content tab shows it with the live bank state filled in).
2. Save the JSON array as `data/inbox/<name>.json`.
3. From the repo root:
   ```sh
   python3 scripts/check_tokens.py data/inbox/<name>.json
   python3 scripts/dupe_gate.py --new data/inbox/<name>.json
   ```
   Both must exit 0.
4. `./scripts/merge_inbox.sh --dry-run`, then without the flag. Passing files move to `_merged/`, failing ones to `_rejected/` with the reason beside them.
5. Commit `data/`. The rebuild workflow refreshes the manifest hashes and `data/split/` on push.

A paste in the admin Content tab lands here and in the manifest on its own.

## Schema

A JSON array of question objects: `id`, `topic`, `subtopic`, `subtopic_detail`, `difficulty`, `model`, `tags`, `stem`, `data_table`, `lead_in`, `options` (five, each with `letter`, `text`, `correct`, `rationale`, `source_refs`), `explanation`, `sources`, `reference_ranges`, `created`. `assets/prompt-template.txt` is the full specification.
