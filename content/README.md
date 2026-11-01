# Content release gate

The 18 original items in `app/demo.json` are development fixtures, not educator-reviewed NEET content. They are public guest-only practice and never contribute to readiness or rankings. Do not import these into the private bank as reviewed items.

Place approved question records in `content/reviewed.json` with the Question fields plus `reviewer`, `provenance`, `language`, `syllabusVersion`, `pool` (practice or assessment) and `status` (published). An educator must independently check wording, keys, explanations and distractors. Run `npm run content:validate` before `npm run content:import`. Source files remain private; do not publish the repository when it contains licensed private content. The 600-item, 30-topic target has not been supplied or completed.

## Concept notes and rule-based analysis

`shared/concepts.json` supplies 16 original starter concept notes. `app/demo.json` maps each item to `conceptId`, a specific `questionType`, and optional selected-option `misconceptions`. These are development examples with educator review pending. The concept card is linked only after checking an answer. Generic concept lessons do not substitute for independent assessment evidence.

The private import schema supports the same optional metadata. The API excludes `misconceptions`, keys, hints and solutions before an answer, returning only the selected error suggestion after grading. Concept IDs must resolve to an appropriate released lesson before using them in a reviewed content bank. Legacy items without a linked lesson show an explicit preparation message. The current account practice remains assessment-ineligible.

Sample ranking rows are fictional fixtures in `shared/learning.ts`; no real participants, population percentile or live rank is implied. Rule-based summaries use first answers in the current mission and keep possible error reasons tentative.
