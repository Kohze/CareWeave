# Submission package

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

CareWeave feature-detects `document.modelContext.registerTool` and registers 32 imperative site tools. Runtime schemas validate inputs; tool annotations distinguish read-only, mutating, and untrusted-content operations; all handlers reuse the same domain functions as the touch UI; revisions prevent stale writes; and partial registration is rolled back. The judged path requires no account or database: each judge receives deterministic, resettable fictional state in the same open page used by the agent.

## Judging alignment

- WebMCP leverage: 32 narrow imperative tools; runtime input validation; rollback-safe registration; read-only and untrusted-content annotations; UI and agent share domain functions and visible focus.
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
- Add the public YouTube URL after uploading the narrated demo; do not add a placeholder link to the public README.

## Final external checklist

Current deadline: **4 September 2026 at 10:00 AM GMT+2**.

- Confirm [the production deployment](https://care-weave.vercel.app/) loads over HTTPS.
- Push this repository publicly with the MIT license visible.
- Test the deployed top-level page in the supported ChatGPT browser.
- Complete every item in the [production-host smoke test](WEBMCP_EVALS.md#final-production-host-smoke-test).
- Record and upload the under-three-minute video with audible narration.
- Add `https://care-weave.vercel.app/`, the public repository URL, video URL, team details, technologies, and this description to Devpost.
- Verify every link in a signed-out browser before submitting.
- Keep Supabase/Auth integration out of the submitted build; it is post-challenge production work, not part of the judged WebMCP path.
- After the submission deadline, do not change the Devpost entry, submitted repository, or live deployment until judging ends. Continue only in a separate fork.
