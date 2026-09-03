# Submission package

## One-line pitch

ClearDay turns email, appointments, care, food, shopping, and routes into a calm voice-controlled household dayboard for older adults—while keeping every consequential action reviewable and every appointment state truthful.

## Suggested description

Older adults often face a fragmented operational burden: clinic emails, carer changes, grocery needs, transport details, and a calendar designed for office workers. ClearDay is a wall-iPad dayboard that uses WebMCP to let a person talk naturally with a browser assistant about the same simple visual plan.

Its 32 imperative tools cover mailbox extraction and connector ingestion, information freshness, reminders, calendar integrity, privacy-scoped support, explainable planning, shared visual focus, and safe action. A person can ask what matters today, see when to leave, find calm time options, ask a trusted person for help, and prepare a clinic email. Consequential work is staged as an expiring action plan that reveals the exact recipient, subject, message, and state effects before approval. Sending a reschedule or cancellation request never changes a confirmed appointment; only verified external confirmation can apply the new time or final cancellation.

Email-derived content is marked untrusted, mutations are revision-checked and audited, and local changes can be undone. The reproducible challenge build uses fictional relative-date mail by default, with an optional server-only Gmail OAuth path that reads bounded previews and creates drafts but never sends. Outlook, calendar providers, and live routing remain adapter boundaries. Built as an installable SvelteKit PWA for an iPad on the wall.

## Judging alignment

- WebMCP leverage: 32 narrow imperative tools; runtime input validation; rollback-safe registration; read-only and untrusted-content annotations; UI and agent share domain functions and visible focus.
- Execution: polished responsive PWA, offline shell, deterministic seed, tests, explicit state machine, audit history, undo.
- Impact: reduces cognitive load and protects autonomy for older adults while coordinating carers, family, clinics, food, and travel.
- Creativity: treats a calendar as a household operating system with “general input, calm output,” rather than adding chat to a conventional planner.

## Final external checklist

- Deploy `build/` to a public HTTPS URL.
- Push this repository publicly with the MIT license visible.
- Test the deployed top-level page in the supported ChatGPT browser.
- Record and upload the under-three-minute video with audible narration.
- Add live URL, public repository URL, video URL, team details, technologies, and this description to Devpost.
- Verify every link in a signed-out browser before submitting.
