# CareWeave WebMCP Challenge alignment audit

Audit date: 3 September 2026  
Decision: submit the account-free fictional build; defer database integration.

## Executive verdict

CareWeave is a strong fit for the challenge because WebMCP is part of the product interaction, not an integration badge. The agent reads structured household state, changes the same visual focus the person sees, applies domain-specific planning rules, and prepares consequential work behind a human review boundary.

Supabase would be helpful for a production service with real households, multiple devices, and authenticated supporters. It does not improve the judged same-page WebMCP loop. Adding it to the challenge build would introduce account friction, session and routing changes, RLS risk, service-worker changes, and more ways for a judge's first run to fail. It remains separate production groundwork rather than part of the submitted experience.

## Criteria scorecard

| Criterion | Current evidence | Main risk | What the demo must prove |
|---|---|---|---|
| **WebMCP leverage** | 32 validated tools support reading, planning, visible focus, reviewable actions, revisions, and recovery. | The tool count can look like breadth without depth. | Show one multi-tool workflow whose result appears on screen and ends at a safe human decision. |
| **Execution** | Deployed responsive PWA, deterministic seed, maps, weather, voice, offline shell, accessibility work, and automated tests. | Optional integrations or stale deployed assets can distract from the reliable path. | Start signed out with no setup and complete the core flow on the production URL. |
| **Potential impact** | A defined audience faces fragmented, high-cognitive-load coordination where state mistakes matter. | A broad feature tour can obscure the human problem. | Frame one believable care scenario and show reduced effort without loss of autonomy. |
| **Creativity and ambition** | The agent and person share attention through the dayboard; requested and confirmed state are deliberately different. | It may be mistaken for a calendar with chat if the agent only narrates. | Make the agent move the UI, reason with care-specific rules, and prepare a visible review plan. |

## Winning demonstration path

The video should tell one story rather than inventory features:

1. **0:00-0:20 — Problem.** An older adult should not have to reconcile a clinic email, tomorrow's schedule, travel, and family availability across several apps.
2. **0:20-0:50 — Structured understanding.** Ask, “What matters today, and is tomorrow rushed?” Show the agent using CareWeave tools rather than reading pixels.
3. **0:50-1:20 — Shared visual focus.** Ask it to show tomorrow and open the route to Dr Patel. The dayboard visibly follows the conversation.
4. **1:20-2:25 — Safe collaboration.** Ask for a calmer appointment time and a clinic request. Show the exact expiring plan, recipient, subject, body, and effects. Emphasize that the confirmed appointment has not changed and nothing was sent.
5. **2:25-2:50 — Trust.** Briefly show revision checks, requested-versus-confirmed state, or undo—not a second unrelated feature tour.
6. **2:50-3:00 — Close.** “CareWeave lets people and agents understand together, focus together, and prepare safely while the person stays in control.”

## Database decision

| Choice | Recommendation | Reason |
|---|---|---|
| Require accounts or Supabase for judges | **No** | Adds friction and no direct WebMCP leverage. |
| Keep deterministic device-local fictional state | **Yes** | Immediate, safe, resettable, and reliable for every judge. |
| Create the Supabase project/migration separately | **Optional** | Useful production groundwork without destabilizing the submission. |
| Claim cross-device synchronization now | **No** | It is not implemented and would weaken trust. |
| Integrate Supabase after judging | **Yes** | Necessary before real household data or multi-device production use. |

## Submission presentation

1. The deployed URL opens directly into the fictional household and the three core prompts form the judge path.
2. The under-three-minute demo follows one coherent workflow with visible WebMCP calls and UI effects.
3. The public repository presents the MIT license, live URL, judge path, and reproducible evidence prominently.
4. The submission description in `docs/SUBMISSION.md` leads with the human problem and shared WebMCP experience rather than optional integrations.

## Completed repository hardening

- Added a task-level browser evaluation for the exact judge journey, including visible route focus and an assertion that drafting leaves the confirmed appointment unchanged.
- Added an explicit evaluation matrix and a compatible-host judge journey.
- Added the official-format six-journey WebMCP dataset; Chrome's browser-native smoke runner passed 10/10 tool steps.
- Added `consequentialHint` to nine meaningful decision and reconciliation tools, alongside the existing read-only and untrusted-content annotations.
- Clarified every fictional supporter/carer write tool so its description does not imply demo-supplied IDs are authenticated production identities.
- Created a 1672×941 Devpost cover and linked the strongest supporting screenshots from the submission package.

## Submission freeze

The FAQ says judges may evaluate only the description, images, and video, so those materials must stand alone. The project must remain free to test without restrictions until **21 September 2026 at 5:00 PM PT**.

The current Devpost schedule shows the extended submission deadline as
**4 September 2026 at 10:00 AM GMT+2**. Once that deadline passes, do not edit
the Devpost entry, submitted repository, or live site until winners are
announced. If development continues, fork the repository and use a separate
deployment so the submitted artifacts remain unchanged.

## Scope discipline

- Do not add authentication, database persistence, or another provider integration.
- Do not make optional Gmail or voice configuration necessary to understand the product.
- Do not demo all 32 tools; demonstrate one coherent chain deeply.
- Do not imply that a requested appointment change is confirmed.
- Do not describe CareWeave as production-ready for real health or household data.

The strongest submission is the smallest reliable proof of the central idea: a human and an agent working on the same trustworthy care surface, with useful agency and explicit human control.
