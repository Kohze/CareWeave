# CareWeave security audit — 2026-09-03

## Executive verdict

- **Fictional hackathon demo:** acceptable to demonstrate. The build, unit
  suite, and browser suite pass, secrets were not found in the production
  bundle, and the Gmail/voice boundaries already contain useful safeguards.
- **Public use with real household or Gmail data:** **not ready yet**. The
  current app has no CareWeave account boundary, uses browser local storage as
  its database, and does not bind Gmail or voice API calls to a verified user.
- **Supabase design:** conditionally sound after the changes made during this
  review, but it is still a design document. No project, migration, RLS policy,
  Auth flow, Realtime subscription, or cross-account test exists to verify.
- **Anonymous demo login:** safe in the proposed form only: each guest gets a
  unique Supabase Auth user and isolated fictional household; guests receive no
  Gmail or external-side-effect capability.

This was a source/configuration review plus local automated testing. It was
not a penetration test of a deployed Vercel, Supabase, Google, or OpenAI
environment because those production resources are not connected.

## Findings

| ID | Severity | Finding | Required resolution |
|---|---|---|---|
| CW-01 | Blocker | Supabase is not implemented. `package.json` has no Supabase packages and `src/lib/app.ts` still treats `localStorage` as canonical. | Apply and test the setup in `SUPABASE_HANDOFF.md`; do not claim cross-device sync before two-account RLS tests pass. |
| CW-02 | High | The proposed cookie-SSR flow cannot run under the current `adapter-static` and global `prerender = true` configuration. | Move to a Vercel server-capable SvelteKit deployment and authenticated server routes before adding SSR Auth. |
| CW-03 | High | `/api/realtime/session` has origin and in-memory rate checks but no user authentication. Gmail endpoints trust only possession of the browser-specific encrypted token cookie. | Verify a Supabase JWT on every voice/Gmail endpoint, derive the user ID from verified claims, and bind Gmail tokens to that user and household. |
| CW-04 | High | Gmail draft creation accepts arbitrary `to`, `subject`, and `body` values from same-origin browser code. The visible review plan is not revalidated by the server. | Accept a plan ID, reload and verify the current unexpired plan/revision server-side, use the stored payload, and add idempotency before calling Gmail. |
| CW-05 | High for multi-user use | Supporter/carer tools accept `supporter_person_id` or `carer_person_id` from the caller. The confirmed-change WebMCP tools trust a boolean assertion from the host. These are honest demo controls, not authentication or proof of external confirmation. | Build role-specific server mutations from the authenticated identity. Keep consequential reconciliation behind a deliberate UI confirmation or independently verifiable provider event. |
| CW-06 | High for real data | Household state, Gmail-derived snippets, outbox bodies, and twelve undo snapshots are stored unencrypted in origin `localStorage`. They persist on a shared iPad and are readable by any future same-origin XSS. | Make Supabase canonical, namespace/validate any offline cache by user, minimize cached content, clear it on sign-out/account change, and add a restrictive CSP. |
| CW-07 | High after SSR integration | The service worker caches every successful same-origin non-API GET. If authenticated SSR is added unchanged, it can retain user-specific HTML and serve it after account changes or offline. | Exclude `/auth/*` and every personalized SSR route, or cache only immutable public assets. Delete private caches during sign-out. |
| CW-08 | Medium | The warm-instance voice rate limiter is neither distributed nor a usage entitlement. A public visitor can consume OpenAI calls, and parallel serverless instances do not share counters. | Require Auth, limit by verified user and IP, set OpenAI project budgets, and configure Vercel WAF/distributed quotas. |
| CW-09 | Medium | Security headers include `nosniff`, Referrer Policy, and a partial Permissions Policy, but no CSP or anti-framing rule. | Add and test a restrictive CSP including `frame-ancestors 'none'`; explicitly allow only required Supabase, OpenAI, OpenStreetMap, and Apple Maps destinations. |
| CW-10 | Medium/external | `gmail.readonly` and `gmail.compose` are Google restricted scopes. A public app can require OAuth verification and, when restricted data is stored or transmitted server-side, a security assessment. | Keep Gmail limited to approved testers for the hackathon; complete Google's review requirements before general availability. |
| CW-11 | Low | `npm audit` reports the transitive `cookie@0.6.0` advisory through `@sveltejs/kit`; no automatic fix is currently offered. Production dependencies report zero vulnerabilities, and CareWeave's current OAuth cookie code does not use that package. | Track the SvelteKit dependency and retest before moving SvelteKit itself into the dynamic production request path. |

## Anonymous-login security requirements

Supabase anonymous users have the `authenticated` database role and a unique
`auth.uid()`; they are not the database `anon` role. The implementation must:

1. Create one unique fictional household per anonymous user.
2. Keep all `anon` table grants revoked and rely on owner-scoped RLS.
3. Enable Turnstile/invisible CAPTCHA and conservative signup limits.
4. Block Gmail, exports, invitations, notifications, and external writes for
   JWTs carrying `is_anonymous: true`.
5. Apply durable voice and state-write quotas by both user and IP.
6. Explain that a guest loses the account after sign-out/storage clearing
   unless they first link and verify an email identity.
7. Delete stale anonymous users and cascading fictional data after 30 days.
8. Test two guest sessions and prove neither can query or subscribe to the
   other's household.

Supabase currently provides no automatic cleanup for anonymous users and
explicitly recommends CAPTCHA/Turnstile for abuse prevention. See the
[anonymous sign-in documentation](https://supabase.com/docs/guides/auth/auth-anonymous).

## Controls that passed review

- `.env` files are ignored, only placeholders are tracked, and no apparent
  OpenAI, Google, or Supabase secret was found in source or the built client.
- The OpenAI API key stays in the Vercel/dev server boundary; SDP responses are
  non-cacheable and bounded.
- Gmail uses OAuth state, PKCE, AES-256-GCM authenticated encryption, HttpOnly
  production-Secure cookies, narrow cookie paths, and same-origin checks for
  mutations.
- Gmail exposes draft creation but no send endpoint. Recipient, subject, and
  body inputs are bounded; subject newlines cannot inject MIME headers.
- Gmail API responses and voice session responses use `Cache-Control:
  no-store`; the service worker excludes `/api/*`.
- Imported mailbox text is normalized, bounded, marked untrusted, and cannot
  directly send mail or silently change a confirmed appointment.
- No raw Svelte `{@html}` rendering was found. Leaflet's HTML use is limited to
  hard-coded marker symbols and attribution.
- The weather proxy has a fixed upstream origin, validates coordinates, rounds
  them to district-level precision, and does not accept an arbitrary URL.
- The revised Supabase handoff now includes least-privilege grants, owner-only
  RLS, atomic compare-and-swap writes, append-only audit inserts, document
  version/revision/size checks, server-only OAuth rows, isolated anonymous
  households, and `UPDATE`-only Realtime subscriptions. Supabase notes that
  Postgres Changes cannot apply RLS to delete records, which is why delete
  subscriptions are excluded. See [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

## Verification performed

- `npm run test`: 40/40 unit tests passed.
- `npm run check`: zero Svelte errors or warnings.
- `npm run build`: static production build succeeded.
- `npm run test:e2e`: passed; the suite's last-run record reports no failures.
- `npm audit --omit=dev`: zero production vulnerabilities.
- Full `npm audit`: three linked low-severity entries caused by the one
  transitive `cookie` advisory; zero moderate, high, or critical entries.
- Production bundle pattern scan found no apparent application secrets.

## Mandatory go-live gates

Do not load real household or Gmail data until all of these are complete:

1. Supabase migration applied and Security Advisor reviewed.
2. Permanent-user, anonymous-user, cross-user, revoked-user, and stale-revision
   tests run against the actual project.
3. API JWT verification and anonymous restrictions covered by tests.
4. Server-validated, idempotent Gmail plan execution implemented.
5. Service-worker/private-cache separation and sign-out clearing verified on
   desktop Safari/Chrome and iPad Safari/PWA.
6. CSP deployed in report-only mode, corrected, then enforced.
7. Vercel WAF and OpenAI usage budgets enabled. Vercel documents WAF rate
   limiting specifically for abuse and cost control: [Vercel WAF rate
   limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).
8. Google OAuth testing/verification status matches the audience. Google lists
   both requested Gmail scopes as restricted: [Gmail scope
   classification](https://developers.google.com/workspace/gmail/api/auth/scopes).
9. Backup/restore, account deletion/export, token revocation, log redaction,
   privacy policy, consent, and jurisdiction-specific legal review completed.

Only after these gates pass should CareWeave be described as secure for real
cross-device care data. Supabase's publishable key is intentionally public;
the security boundary is verified Auth plus RLS. Its secret key bypasses RLS
and must remain server-only: [Supabase API key
security](https://supabase.com/docs/guides/getting-started/api-keys).
