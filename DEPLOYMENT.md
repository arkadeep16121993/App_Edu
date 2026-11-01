# Deployment and paid-beta gates

## Publish the guest MVP

1. Create a Cloudflare account when ready. Do not enable a paid plan automatically.
2. Authenticate Wrangler using `npx wrangler login` on a trusted local machine, or supply a narrowly scoped Cloudflare API token using the provider's secret store. Never paste credentials into chat or Git.
3. Create separate staging and production D1 databases: `npx wrangler d1 create physics-path-staging` and `npx wrangler d1 create physics-path-production`. Keep separate Wrangler configurations or environments; do not reuse local database IDs remotely.
4. Replace the all-zero placeholder database ID in the deployment configuration with the staging ID, set `APP_ORIGIN` to the actual HTTPS origin, and leave `ACCOUNTS_ENABLED=false` and `BILLING_ENABLED=false`.
5. Run `npm ci`, `npm run build`, `npm test` and the browser journeys. Back up existing remote data before any forward migration.
6. Run `npx wrangler d1 migrations apply DB --remote` against staging, then `npm run deploy`. Wrangler reports the real public Workers URL; do not invent it in advance.
7. Check `/api/health`, `/api/v1/config`, six-question guest completion, reload/resume, offline return, 360px layout and blocked account/checkout routes on the deployed HTTPS origin. Staging is not a public paid launch. Repeat on the isolated production database after validation.

Guest-only deployment collects no cloud learner data; it stores practice on the visitor's device. State this clearly before sharing with testers. Device storage is removable via About this pilot. Use a private repository if you later add private or licensed content.

## Connect Google after account protections are completed

Create a Google OAuth web application and consent screen. Register the exact HTTPS callback `https://YOUR_HOST/api/auth/callback/google` and the exact application origin. Store `BETTER_AUTH_SECRET` (strong unique random secret) and `GOOGLE_CLIENT_SECRET` via `wrangler secret put`; configure `GOOGLE_CLIENT_ID`. Use a separate set per environment. Set the actual `APP_ORIGIN` and only then enable accounts after resolving younger-user consent, privacy, export/deletion, and live session tests. OAuth does not supply parental consent.

A D1 adapter/signed-session integration test is present; it does not prove Google's consent flow or live Worker CPU performance. Test those with real staging credentials. Local Vite origin is `http://localhost:5173`; an IP origin is intentionally rejected for authenticated mutations unless configured explicitly.

## Review content

Read `content/README.md`. Never mark generated starter items reviewed without educator approval. Import reviewed practice records locally with `npm run content:import`. The current script is local-only to prevent accidental production content publication. Before production, implement an audited authenticated publishing/quarantine path and safely seed the reviewed bank. Answer keys never belong in static assets except the expressly public guest demo.

## Connect payments only after the paid-beta gaps are closed

Merchant eligibility is not guaranteed for the business's jurisdiction. Create an approved Razorpay account, use sandbox first, create one INR 149 recurring monthly plan, and configure `RAZORPAY_PLAN_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` server-side. Never expose key secrets in Vite variables.

Webhook URL: `/api/billing/webhook`. Validate Razorpay's actual invoice billing-period fields against the pinned integration; ambiguous events remain pending and grant no access. Complete cancellation, full/partial refund, dispute and out-of-order reconciliation before switching billing on. Reconcile `payment_events.status='pending'` and `subscriptions.status='creating'` with provider records daily. Do not delete uncertain records to bypass duplicate protection. Verify the fixed plan is monthly, INR 149, and associated with the intended merchant.

Test duplicate clicks; timeouts after provider creation; duplicate/invalid/delayed webhooks; payment belonging to another subscription; failed renewals; cancellation with paid time remaining; partial/full refunds; disputes; and manual reconciliation replay. A redirect never grants access. Keep `BILLING_ENABLED=false` until the complete paid feature set, provider tests and legal terms are ready.

## Operations to commission

Assign a backup owner. Export an encrypted D1 backup daily to founder-controlled storage, rehearse restoration in staging, and back up before migrations. No scheduled backup is installed by this MVP. Set retention/deletion procedures before cloud learner data is collected. Monitor actual Worker CPU, errors, D1 scans/writes/storage; run the specification's 100-learner fixture before paid invitations. Alerts at 50%, reduced optional usage at 70%, no automatic paid-plan upgrade. No production performance or cost benchmark has been claimed.
