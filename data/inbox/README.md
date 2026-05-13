# Inbox - drop new question batches here

Any JSON file dropped into this directory that conforms to the schema
will be automatically loaded by the site on next page refresh.

## Workflow

1. **External generation**. Use any LLM with the copy-paste prompt from
   the in-app "How to add" modal (or `scripts/add-questions.sh`).
2. **Drop the resulting JSON array** here as `<descriptive-name>.json`.
3. **Append its filename** to `data/inbox_manifest.json`:
   ```json
   { "inbox": ["inbox/your-new-file.json", ...] }
   ```
4. **Commit + push**. GitHub Pages will serve it within a minute.

## Schema

Each file is a JSON array of question objects matching the schema in
the in-app "How to add" prompt (id, topic, subtopic, difficulty, tags,
stem, data_table, lead_in, options[5], explanation, sources[],
reference_ranges[], created).

## Audit

When the project maintainer is next asked to add more questions, they
will audit every file in this inbox: bell distribution, stem-length
floors, source-citation completeness, distractor hooks, length-balanced
options, correct-letter randomisation, em-dash count, no uni
references. Passing batches are moved to `_merged/`; rejected files
move to `_rejected/` with a note.

