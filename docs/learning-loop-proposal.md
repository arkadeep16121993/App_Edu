# Proposed learning loop: quiz → understand → drill → check again

Status: product proposal with partial implementation. Concept links/notes, device-local saved concepts, rule-based mission analysis and explicitly fictional sample ranking are now implemented. Learner-stage onboarding, adaptive drill selection, delayed evidence projections and timed mocks remain proposed. The clearer NEET audience message, four-step pathway and available/planned feature sections have been implemented separately. This proposal describes the next learning changes; it does not expand current readiness or payment claims.

## Audience and first visit

The current exam is NEET-UG Physics. Ask two different questions, without treating school year as a measure of ability:

1. Where are you in your preparation? Class 11 / Class 12 / repeat aspirant.
2. What are you working on now? Learning concepts / revising chapters / practising under exam conditions / not sure yet.

Offer a skippable start and keep the first guest mission available without sign-in. Ask the target exam year and an optional daily time goal later, not in a long registration form. All choices remain editable. A diagnostic can inform recommendations but cannot establish topic readiness from one short session.

The home screen recommends an action and explains why: “You’re revising. Start with a light quiz”; “You missed two independent inverse-square questions. Try a focused drill”; or “Your saved concept check is due.” Learners can choose another mode. Do not infer exam readiness from self-reported stage.

## Three modes

| Mode                       | Purpose                       | Initial design                                                                                | Feedback                                                                                                              |
| -------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Light quiz                 | A low-friction daily start    | Six mixed or chapter-focused questions; roughly 5–8 minutes                                   | Feedback and reviewed hints after each answer; optional concept reading                                               |
| Focused drill / High drill | Repair a specific gap         | About 10–12 questions around one or two skills, with fresh families and increasing variety    | Brief explanation, concept card, then a different application; original responses stay immutable                      |
| Mini-mock                  | Check independent performance | Start with a clearly scoped 10-question timed chapter/unit test from reserved, unseen content | No hints, correctness or solutions during the attempt; review after final submission; +4 correct, −1 wrong, 0 skipped |

These sizes/durations are proposed product choices. Full Physics mocks require sufficient reviewed coverage and a verified current exam pattern. Never call a three-unit pilot a complete NEET mock. The user clarified that real-time multiplayer is not required. Self-paced, topic-specific adaptation is the priority; quizzes may take around ten minutes. Do not label self-paced quizzes live. Friend comparison belongs in a separate common benchmark, not the personalised drill score.

## Clarified goal: a topic coach, not a fixed quiz catalogue

The learner chooses a precise subtopic or follows a recommendation. An initial short diagnostic samples prerequisites, core application and transfer, then a deterministic rule selects the next useful difficulty and concept. Begin with six items (approximately two prerequisite/foundation, two applications and two transfer items) when the bank supports that coverage. A learner can stop early; show that the estimate is incomplete. Do not pretend six items establish a reliable percentile.

Proposed starting adaptation rules, to validate with reviewed items and learner trials:

- Two correct, unassisted responses on fresh families permit trying the next difficulty; they do not award mastery.
- Two related errors suggest a prerequisite check or concept lesson, then a fresh easier variation. One error alone can show help without labelling the whole topic weak.
- Wrong after reading a lesson: check the prerequisite and offer a different explanation. Avoid an endless sequence of near-identical questions.
- Correct after a hint: retain the practice success, then schedule an independent check. Do not count it as unassisted evidence.
- At the end, explain the next recommendation: “You handled basic Coulomb-force calculations. Your next drill focuses on distance scaling.”

A six-question mission remains a frozen sequence for retry and evidence integrity. Between missions, select the next drill from the last canonical results. If within-session branching is introduced, represent it as explicit server-assigned drill segments with versioned reasons; never silently replace frozen mission questions or regrade history.

## Motivation and honest peer comparison

The ambition can be exceptional topic performance, but “99.99th percentile” must not be promised as an outcome or displayed from a handful of questions. Finite, exposed, personalised practice does not establish a population percentile.

For a small pilot show “Your best common-benchmark score”, “2nd of 8 eligible friends” and “Inverse-square scaling: 3 fresh checks to revisit.” Compare peers only on the same reserved unseen benchmark, scoring, assistance rules and server window. Personalised drill difficulty is deliberately different, so its XP, accuracy or difficulty level cannot become a fair friend rank.

Percentiles would later require a defined, sufficiently large and representative comparison cohort, declared computation/tie handling, comparable independent evidence, participant counts and uncertainty. A 0.01-percentile rank step requires at least 10,000 comparable results; that alone does not establish statistical reliability or NEET-wide representativeness. Do not report an app topic rank as a NEET or All India percentile.

The repeat-quiz invitation should be concrete: “Try three fresh distance-scaling questions later today”; “Can you improve your last common benchmark?”; or “Ready for a harder application?” A visible progress path should show what changed, while retaining enough challenge and a clear stopping point. Do not fabricate other users, ranks, gains or mastery percentages.

## A wrong answer must point to a learnable concept

Example: “The distance between two point charges is doubled. What happens to their force?”

Concept trail: **Electrostatics → Coulomb’s law → inverse-square dependence → comparing forces when distance changes.** Hold charges and medium fixed. The ratio is:

F₂/F₁ = (r₁/r₂)². With r₂ = 2r₁, F₂ = F₁/4.

No differentiation is necessary. If the learner selects F/2, the reviewed distractor may suggest that they used an inverse-distance rule instead of inverse-square scaling. Present that as a possible error, not a certain diagnosis.

The feedback card should contain:

- The named concept and a short explanation of why this answer follows.
- An optional confirmation: concept / formula / algebra / units / misread question / guessed. The learner can disagree with the suggested reason.
- **Understand this concept**: a 60–90-second reviewed lesson containing the idea in words, variable meanings, assumptions, a simple visual and a worked comparison. Add links to verified official readings or an appropriate NCERT chapter when available; do not invent page numbers.
- **Save for review**: bookmark the specific concept and error pattern, not merely the question.
- **Practise a similar idea**: queue a different question family for a repair drill. It must not silently replace the pinned questions or overwrite the original answer in the current mission.

Reading is optional during a light quiz or drill. A learner can preserve their flow and study after the result. In a mock, only mark-for-review is available; explanations and reading unlock after final submission. An exposed or assisted answer is useful learning but not independent readiness evidence.

## Results need a repair plan, not just a score

Group errors by concept and by supported error pattern. Show counts and assistance status. Example: “Inverse-square scaling: missed 2 of 3 starter questions. Revisit the concept, then try three fresh variations.” This is a practice observation, not a verified weakness diagnosis.

Each result screen should suggest one manageable next step: a saved lesson, a focused drill, or a future fresh check. Show topic → skill → error detail so that “Electrostatics is weak” does not hide the actual problem. Preserve correct responses as well as mistakes so the denominator is visible.

Suggested evidence rules, consistent with the existing specification:

- Use up to 12 recent eligible, unassisted answers per skill within 30 days. Exclude demos, guest imports, offline answers, exposed families and hints from verified readiness. They can still appear in clearly labelled practice history.
- Fewer than five eligible answers: **Not enough evidence**. One wrong answer can trigger a helpful lesson, but never establishes a weak topic.
- At least five eligible answers and accuracy below 60%: **Needs practice**, with the item count shown. This threshold is a proposed new product decision, not an existing validated rule.
- Otherwise **Developing**, until Secure requirements are met: at least eight eligible answers on two days, 75% accuracy and two successful fresh delayed checks. After 14 days without a check, show **Review due**.
- Two independently reviewed distractor matches on distinct question families can flag a **possible recurring error**. Learner confirmation and later checks strengthen the hypothesis; never assert a psychological diagnosis.
- Repeating a question immediately after seeing its solution cannot establish mastery. After a fresh success, use scheduled reviews at 1, 3, 7 and 14 days; failure resets to one day. A same-day repair is learning practice, not one of these delayed checks.

## Encourage a useful second visit

First visit: a light quiz and one identified next step. Later visit: a saved concept plus a short fresh repair check. Example home copy: “Earlier today you practised force ratios. Ready to try another variation?” Later reviews use the longer spaced schedule.

Use a visual preparation path and clear progress states: **Explore → Practise → Repair → Recheck**. Small completion celebrations and concept milestones should reflect actual actions. Distinguish practice XP from evidence of understanding. Keep one streak credit per learner day, optional rest days, unique XP award sources and the existing 30 XP daily cap. A wrong answer costs no XP. Do not reward fast tapping, repeated solution exposure, or unlimited sessions.

The second visit is an invitation, not a requirement to avoid losing progress. Start with in-app due cards; email, push and background reminders remain outside the current pilot. If notifications are added later, use opt-in timing and quiet hours. Do not promise an in-app card will notify someone when the app is closed.

Measure meaningful return sessions rather than opens: two sessions at least 30 minutes apart in a learner's local day, each containing actual practice or a completed repair. Also track saved concepts revisited, next-day fresh accuracy and D1/D7 retention. Treat these as product hypotheses; do not imply that two visits per day is automatically better learning.

## Minimal data additions

- Learner profile: preparation stage, study intent, target year, timezone and optional time preference.
- Reviewed concepts: topic/skill IDs, lesson content, assumptions, reading references and version/reviewer.
- Versioned questions: more precise concept/subskill tags and option-specific, reviewed error mappings. The current `error` string is question-wide and cannot support confident option-specific analytics on its own.
- Canonical attempt evidence: pinned item/family, mode, first response, assistance/exposure, optional learner error reason, server time and eligibility.
- Concept review queue: saved reason, source attempt, due time, review step and completion history.

Server evidence owns account readiness and XP. Local feedback and guest/demo observations remain distinguishable. No model API is required for this design.

## Recommended next implementation slice

1. Skippable learner-stage check-in and a personalised home recommendation.
2. Build one reviewed concept lesson and option-specific error mapping for inverse-square scaling; add Understand now / Save for review to feedback.
3. Add a concept-level mission summary and a small fresh repair drill, preserving first-answer evidence.
4. Add the later-visit queue and meaningful, capped progress rewards.
5. Add timed mini-mocks only after reserved reviewed content and server finalisation are ready. Add real-time quiz rooms if the user selects them, with a separate release gate.

This slice proves whether learners can repair a misconception before expanding the question bank and mode catalogue.
