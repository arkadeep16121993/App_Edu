# MVP validation — 25 October 2026

Verified in the current cloud workspace:

- Frozen `npm ci` installation, TypeScript check and Vite production build passed. Vite reports a large initial JavaScript chunk; further bundle splitting is a performance improvement before a constrained-network launch.
- Both D1 migrations applied successfully; a second run reported no migrations pending.
- 11 unit/integration tests passed: readiness evidence limits, stale/future evidence, review reset, scoring, private question fields, exact-body webhook HMAC, signed Better Auth session through D1, canonical answer retries/conflicts, mission resume, cross-account isolation, completion/XP uniqueness, origin checks, disabled billing and private invitations.
- 4 Chromium browser journeys passed against the built Worker: six-question mission and reload/resume; 360px topic search/practice without horizontal overflow; service-worker offline reload and continued practice; account-mission grading/completion against an explicitly mocked API.
- Direct local Worker health/config requests succeeded; anonymous private progress returned JSON 401 with no-store caching.
- Production dependency audit reported zero known vulnerabilities.
- Starter-content validator confirmed that no reviewed question bank was supplied. This is not a content quality approval.
- Desktop and mobile screenshots were inspected. See `docs/preview.png` for the desktop dashboard.

Not tested or completed: public deployment, real Google OAuth, actual Razorpay sandbox/live subscriptions or reconciliation, native Android hardware/connection targets, 100-learner Worker CPU/quota benchmarks, reviewed 600-item content, adaptive evidence projections, ranked challenges, account privacy/consent workflows and production backup/restore. The account browser test uses fixtures; the D1 signed-session test does not contact Google. Billing flags remain disabled. No credentials or live subscriptions were created.

Reusable cloud install/start instructions were saved separately in the environment draft. Saving a draft is not publication of the environment or website, nor verification in a fresh task.

## Portable preview and feedback follow-up

The prebuilt guest ZIP was extracted and served by its bundled Python standard-library launcher. All 5 browser journeys passed against it, including note persistence, JSON feedback export, deletion, focus restoration and offline reload. The account journey remains a mocked-API integration check. The full-source `npm run local` workflow builds, migrates and serves the app with a matching local origin; a separate port was used to avoid disturbing the existing server. Python/Linux launch was tested here; the Windows batch wrapper and macOS browser auto-open were not tested on those operating systems.

Matt Pocock skills v1.3.1: 27 unmodified project-local skill directories installed with upstream MIT license and pinned source provenance in `docs/matt-pocock-skills.md`. Global marketplace registration was blocked by a read-only Codex home; no global plugin install is claimed.

The final source ZIP was extracted into a separate directory, installed using `npm ci`, and launched via `npm run local` with a fresh local D1 database. Static HTML, health and configuration requests all returned HTTP 200; accounts and billing remained disabled. This confirms the package does not depend on the original checkout's node_modules or database files.

A self-contained HTML guest preview is also packaged. Practice, reload/resume and feedback export passed using an HTTP harness with zero external asset requests or JavaScript exceptions. Direct file navigation could not be tested because this cloud Chromium blocks file URLs by administrator policy; no macOS browser test is claimed.

## 1 November 2026 — audience, pathway and roadmap

The homepage now identifies NEET-UG Physics and Class 11, Class 12 and repeat aspirants. It includes a four-step preparation path, an actionable topic link, and separate available/planned feature panels. The production build and all five existing browser journeys passed. Direct checks verified the topic and planned-plan navigation and a 360px layout without horizontal overflow; desktop/mobile screenshots were refreshed. Adaptive diagnosis, concept lessons, drill branching and mocks remain a design proposal in `docs/learning-loop-proposal.md`, updated with the user's preference for self-paced topic coaching and honest peer benchmarks.

## Concept feedback, rule-based analysis and sample ranking

Implemented links after both correct and incorrect answers to 16 concept notes covering all 18 starter items. Lessons include the governing idea, formula, assumptions, steps, a worked example and common pitfall; inverse-square scaling includes a visual comparison. Device-local concept bookmarks appear in My progress. Lessons and starter content still await educator review.

Mission results now group first answers by specific question type, show wrong/total and hinted counts, explain possible option-specific mistakes, link back to concepts and support targeted revision. Completed results reopen from practice history. Suggestions remain provisional; no readiness or NEET percentile is inferred from demo or repeated practice.

Added a labelled sample leaderboard with eight fictional comparison entries, the learner's mission score, +4/−1 scoring and shared ranks for ties. This does not call a ranking service or imply actual peers. No AI service is called.

The production build, 17 unit/D1 integration tests, and six Chromium browser journeys passed. Browser checks covered lessons after right/wrong answers, focus restoration, bookmark persistence, mission resume, specific inverse-square error analysis, result reopening, targeted revision, tied mock ranks and the 360px result layout. The standalone HTML bundle also passed a complete six-question journey with concept reading/saving, analysis and ranking, zero external asset requests and zero JavaScript exceptions. Direct Mac file-origin testing remains unverified because the managed Chromium blocks file URLs.
