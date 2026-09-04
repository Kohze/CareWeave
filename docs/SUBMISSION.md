# Submission package

For copy-ready variants sized for common hackathon fields, see
[`SUBMISSION_COPY.md`](SUBMISSION_COPY.md).
The final Devpost story is available in [`DEVPOST_STORY.md`](DEVPOST_STORY.md).

## One-line pitch

CareWeave turns fragmented everyday care into one calm shared dayboard where people and WebMCP agents understand, focus, and prepare together—without taking control away from the person at the centre.

- **Live app:** [https://care-weave.vercel.app/](https://care-weave.vercel.app/)
- **Source:** [https://github.com/Kohze/CareWeave](https://github.com/Kohze/CareWeave)
- **Devpost cover:** [`artifacts/careweave-devpost-cover.png`](../artifacts/careweave-devpost-cover.png)
- **WebMCP evidence:** [`docs/WEBMCP_EVALS.md`](WEBMCP_EVALS.md)

## Suggested description

Older adults often face a fragmented operational burden: clinic emails, carer changes, grocery needs, weather, transport details, and calendars designed for office workers. CareWeave is an accessible wall-iPad dayboard that brings those moving parts into one calm visual plan and lets a person talk naturally with a WebMCP-compatible assistant about the same information.

Its 32 imperative tools cover mailbox extraction and connector ingestion, information freshness, reminders, calendar integrity, privacy-scoped support, explainable planning, shared visual focus, and safe action. A person can ask what matters today, see when to leave, find calm time options, ask a trusted person for help, and prepare a clinic email. Consequential work is staged as an expiring action plan that reveals the exact recipient, subject, message, and state effects before approval. Sending a reschedule or cancellation request never changes a confirmed appointment; only verified external confirmation can apply the new time or final cancellation.

Email-derived content is marked untrusted, mutations are revision-checked and audited, and local changes can be undone. The reproducible challenge build uses fictional relative-date mail by default, with an optional server-only Gmail OAuth path that reads bounded previews and creates drafts but never sends. Live local weather includes a seven-day and time-by-time forecast. Outlook, calendar providers, and live routing remain adapter boundaries. CareWeave is deployed as an installable SvelteKit PWA for an iPad on the wall.

## Why this use case is a strong fit for WebMCP

Care coordination is not one command. It is a chain of understanding the day, finding the relevant commitment, checking travel and workload, preparing a response, and making sure a request is not mistaken for a confirmation. WebMCP lets an agent perform that chain against structured state while the person keeps the same calm visual surface and remains in control of consequential steps.

Without WebMCP, an assistant would have to infer dates, event states, and controls from pixels or send the person back through several apps. With WebMCP, CareWeave exposes narrow, validated capabilities and returns structured results that include revisions, warnings, and next actions.

## What people and agents can do together

- Ask what matters today and whether another day is rushed.
- Move the shared screen to a date, event, route, or decision so both are discussing the same thing.
- Find a calm time or identify missing preparation using household rules rather than generic prose.
- Prepare an exact clinic request or help request for human review.
- Preserve the difference between **requested** and **confirmed**, preventing the agent from silently rewriting reality.

## How WebMCP is implemented

CareWeave feature-detects `document.modelContext.registerTool` and registers 32 imperative site tools. Runtime schemas validate inputs; `readOnlyHint`, `untrustedContentHint`, and `consequentialHint` make safety boundaries machine-readable; all handlers reuse the same domain functions as the touch UI; revisions prevent stale writes; and partial registration is rolled back. The judged path requires no account or database: each judge receives deterministic, resettable fictional state in the same open page used by the agent.

## Judging alignment

- WebMCP leverage: 32 narrow imperative tools; runtime input validation; rollback-safe registration; read-only, untrusted-content, and consequential annotations; UI and agent share domain functions and visible focus; 10/10 steps passed in the official Chrome WebMCP smoke runner.
- Execution: polished responsive PWA, offline shell, deterministic seed, tests, explicit state machine, audit history, undo.
- Impact: reduces cognitive load and protects autonomy for older adults while coordinating carers, family, clinics, food, and travel.
- Creativity: treats a calendar as a household operating system with “general input, calm output,” rather than adding chat to a conventional planner.

## Testing instructions

No CareWeave login or credentials are required. Open
[care-weave.vercel.app](https://care-weave.vercel.app/) in ChatGPT's in-app
browser, then ask:

1. “What matters today, and is tomorrow rushed?”
2. “Show me tomorrow and put the route to Dr Patel on screen.”
3. “Prepare a request to move the appointment to a calm morning.”

The third prompt must produce a visible review plan. Nothing should be sent,
and the confirmed appointment must remain at its original time.

The exact automated journey and the final production-host checklist are documented in the [WebMCP task-level evaluation](WEBMCP_EVALS.md).

## Submission media

- Use [`careweave-devpost-cover.png`](../artifacts/careweave-devpost-cover.png) as the 16:9 project cover.
- Use [`audit-final-careweave-route.png`](../artifacts/audit-final-careweave-route.png) to prove shared visual focus and route display.
- Use [`audit-final-review-dialog.png`](../artifacts/audit-final-review-dialog.png) to prove the human confirmation boundary.
- Use [`audit-final-family-support.png`](../artifacts/audit-final-family-support.png) to show the privacy-limited supporter experience.

## Submission configuration

Current deadline: **4 September 2026 at 10:00 AM GMT+2**.

- Hosted application: `https://care-weave.vercel.app/`
- Public source: `https://github.com/Kohze/CareWeave`
- License: MIT
- Judge access: account-free fictional household
- Demonstration: narrated video under three minutes following [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md)
- WebMCP evidence: [`WEBMCP_EVALS.md`](WEBMCP_EVALS.md) and [`../evals/careweave.json`](../evals/careweave.json)
- Production scope: Supabase/Auth remains post-challenge work and is not part of the judged WebMCP path.
- Submission freeze: the submitted repository and deployment remain unchanged during judging; subsequent development uses a separate fork.
