# Content release gate

The 18 original items in `app/demo.json` are development fixtures, not educator-reviewed NEET content. They are public guest-only practice and never contribute to readiness or rankings. Do not import these into the private bank as reviewed items.

Place approved question records in `content/reviewed.json` with the Question fields plus `reviewer`, `provenance`, `language`, `syllabusVersion`, `pool` (practice or assessment) and `status` (published). An educator must independently check wording, keys, explanations and distractors. Run `npm run content:validate` before `npm run content:import`. Source files remain private; do not publish the repository when it contains licensed private content. The 600-item, 30-topic target has not been supplied or completed.
