# Physics Path

A mobile-first NEET Physics MVP built from the supplied October 2026 technical specification. React + TypeScript frontend, Hono Worker API, D1, Better Auth, IndexedDB and a Razorpay subscription integration. No AI provider, inference service or AI key is used.

## Try it on your own computer

See [LOCAL-TESTING.md](LOCAL-TESTING.md) for downloadable guest-preview and full-source instructions. The full local workflow is `npm ci` followed by `npm run local`. Use the Feedback panel to save notes and export a report; notes are never sent automatically.

## Run locally

Node 24 LTS is recommended (minimum 22.12). From the existing checkout:

```sh
npm ci
npm run build
npm run db:migrate
npm run dev:api
```

In a second terminal, `npm run dev`. Vite proxies `/api` to the local Worker. The Worker also serves the built app directly on its configured port. No credentials are required for guest practice. On restricted cloud machines, set `npm_config_cache=/workspace/.npm-cache` and `XDG_CONFIG_HOME=/workspace/.config` for writable tool caches.

```sh
npm test                          # bundles the Worker, then unit + real local D1 tests
npm run test:e2e                  # Playwright; install Chromium first if needed
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e  # use a system browser
npm run content:validate
```

Tests build their own isolated D1 database and synthetic signed sessions. They never use production credentials or learner data. `npm test` requires a client build because Wrangler also validates the static assets directory.

## What works now

- Responsive Practice dashboard, searchable 30-topic catalogue, practice history, Study circle and plan screens.
- 18 original starter questions across Electrostatics, Current Electricity and Ray Optics; six-question missions, deliberate selection/check actions, staged hints, explanations, mistake revision and one-tap resume.
- Linked concept lessons for all starter items, with 16 concept notes, worked examples, an inverse-square visual and a device-local saved reading list. Lessons remain development content awaiting educator review.
- Rule-based end-of-mission analysis by specific question type and selected distractor; targeted question revision and results that can be reopened from history. No AI calls or verified weakness diagnosis.
- A clearly labelled sample leaderboard: the learner’s mission score alongside eight fictional comparison entries, using +4/−1 scoring and shared ranks for ties. This is not live peer ranking or a NEET percentile.
- Guest history in IndexedDB; installable web manifest and production service worker; previously visited app assets and starter practice work offline. A first visit still needs connectivity, and browser storage is not a durable backup.
- Better Auth native D1 integration, Google OAuth configuration, signed cookie sessions, protected API routes, origin checks, bounded input, database rate limiting and invitation-only groups.
- Server-created six-item practice missions from a private reviewed bank, key-free question payloads, canonical grading, immutable first answers, conflict checks, safe retries and one mission completion XP award within a UTC daily cap.
- Account practice is connected to the frontend when accounts and a reviewed bank are available. It resumes through the server after reload. Guest practice and account missions remain distinct.
- ₹149/month plan presentation, server-bound hosted Razorpay subscription creation and raw-body HMAC webhook verification. Billing is OFF; no checkout can charge users by default.

The 18 starter items are **unreviewed development examples**, not an approved NEET question bank. Their answers are intentionally public for local demo use. They never create readiness or ranked evidence. No licensed question bank or third-party application source has been copied.

## MVP boundaries

This is a working guest MVP and backend foundation, **not the complete paid release described by all acceptance gates in the specification**. Account and billing feature flags default off. These remain before the paid beta:

- Independent educator review and the 600-item private bank (450 practice, 150 assessment). Only three of the 30 catalogue topics currently have starter questions.
- Evidence-aware adaptive selection (three target, two review, one transfer), exposure history, local-time XP, scheduled review projections and accurate cloud readiness. The current server selects least-attempted published practice families. All attempts remain assessment-ineligible; no readiness claim is made. Pure readiness/revision rules have tests but are not commissioned projections.
- Guest-to-account import, private offline account outbox and account progress/history UX beyond mission resume and XP. Guest history is not uploaded or sold as verified progress.
- Ten-item timed challenges, server deadlines, final-only grading, rankings, quarantine/adjudication tools and private content publishing/reconciliation tooling. The group shell and membership API work; challenges are gated.
- Real OAuth consent/callback checks, logout on the live domain and Free Worker CPU/100-learner quota benchmarks.
- Merchant approval; provider sandbox and live-event validation; refund/dispute handling, account export/deletion and applicable age/parental consent, legal/refund terms and backup ownership.

The billing integration deliberately fails closed on uncertain provider state. Pending creation is durable so a retry cannot create a second subscription. A provider response lost before its ID is persisted requires operator reconciliation using `notes.app_subscription_id`. Captured-payment processing verifies the payment and invoice and does not grant access from a redirect or mandate authorisation. Refund/dispute automation is not complete: do not enable billing yet. Do not advertise premium deliverables as available until their release gates pass.

## Public deployment later

See [DEPLOYMENT.md](DEPLOYMENT.md). There is no live URL yet; no Cloudflare, Google or Razorpay account was supplied or created. You can first deploy the guest MVP with accounts and billing disabled, then commission the paid capabilities separately.

## Open-source foundation

Public project documentation and installed packages used:

- [React](https://github.com/facebook/react), [Vite](https://github.com/vitejs/vite), [Hono](https://github.com/honojs/hono)
- [Better Auth](https://github.com/better-auth/better-auth): public Hono integration and SQLite/D1 implementation; the checked-in auth migration is generated against the pinned dependency.
- [Dexie](https://github.com/dexie/Dexie.js), [KaTeX](https://github.com/KaTeX/KaTeX), [Lucide](https://github.com/lucide-icons/lucide)
- [Workers SDK](https://github.com/cloudflare/workers-sdk), [Vitest](https://github.com/vitest-dev/vitest), [Playwright](https://github.com/microsoft/playwright)

Versions are exact in `package.json` and `package-lock.json`; package license notices remain in installed distributions. Fonts are bundled through Fontsource and do not call Google Fonts. Public references were used as implementation guidance, not as instructions authorizing account creation or paid resources. The existing repository license remains unchanged.
