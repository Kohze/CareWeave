# WebMCP task-level evaluation

This evaluation checks the experience CareWeave is submitting: an agent and a person understand the same care plan, move the shared interface to the relevant context, and prepare a consequential request without silently changing reality.

## Evidence status

| Layer | Status | What it proves |
| --- | --- | --- |
| Unit and domain tests | Automated | Runtime input validation, revision checks, stale-plan rejection, untrusted email handling, appointment state transitions, permissions, and voice-tool filtering. |
| Simulated WebMCP host in Playwright | Automated | All 32 tools register through the same browser API shape, execute against the real page, change the visible shared focus, and fail closed if registration is partial. |
| Judge-journey browser eval | Automated | The exact briefing → pacing → focus → route → draft flow succeeds while the confirmed appointment remains unchanged and the review dialog is visible. |
| Official Chrome WebMCP smoke runner | 10/10 steps passed | Six journeys invoke the tools through Chrome's WebMCP surface against the real rendered CareWeave page. |
| Compatible ChatGPT in-app browser | Judge journey | The same prompts demonstrate tool discovery, model-selected sequencing, shared visual focus, and visible review on the production origin. |

The Playwright host isolates deterministic registration and application behavior. The official Chrome smoke run adds browser-native discovery and execution, while the compatible-host judge journey demonstrates model-selected sequencing.

Latest clean local result on 3 September 2026: 43/43 unit tests, 106/106 applicable browser checks, and 10/10 official Chrome WebMCP smoke steps passed. The browser suite spans iPad landscape, iPad portrait, and mobile; 44 viewport-specific checks are skipped where they apply only to another viewport.

## Official WebMCP smoke evaluation

The six-case dataset at [`../evals/careweave.json`](../evals/careweave.json) follows the format used by Google's experimental `webmcp-evals` runner. It covers direct and multi-tool journeys across understanding, shared visual focus, safe preparation, untrusted content, food coverage, and freshness.

```bash
npm run dev
npx webmcp-evals smoke -u http://127.0.0.1:5173 -e evals/careweave.json --chrome-channel chrome
```

Chrome 152 completed all ten expected calls across the six fresh-page cases. The runner discovered and executed the actual tools registered by CareWeave rather than a copied schema.

## Automated judge journey

The Playwright scenario `completes the judge WebMCP journey while keeping the appointment unchanged` runs this sequence against the rendered application:

1. Discover exactly 32 registered site tools.
2. Call `get_day_brief` for today.
3. Call `check_day_pacing` and `get_commitments` for tomorrow.
4. Call `focus_date`, then verify that the dayboard visibly moves to tomorrow.
5. Call `get_route_options` and `show_route`, then verify the route to Green Lane Medical Centre is visible.
6. Call `create_appointment_request_plan` for the Dr Patel appointment.
7. Verify a draft plan and visible review dialog exist, `needsUserConfirmation` is true, and the appointment start time and confirmed status are unchanged.

Run the focused evaluation:

```bash
npm run build
npx playwright test tests/clearday.spec.ts --project=ipad-landscape --grep "judge WebMCP journey"
```

Run all evidence:

```bash
npm run check
npm test
npm run test:e2e
```

## Safety and failure-containment matrix

| Scenario | Automated assertion |
| --- | --- |
| Invalid or extra arguments | Runtime schema validation rejects the call and returns “Nothing changed.” |
| Partial host registration | The registration controller aborts, all already-registered tools are removed, and the UI reports a failed connection rather than a partial success. |
| Appointment request | Creating or approving a local suggestion does not change the confirmed appointment. |
| Stale approval | A plan whose base revision is stale remains open and performs no action. |
| Unverified clinic update | `apply_confirmed_change` and `apply_confirmed_cancellation` reject calls without explicit verified confirmation. |
| Email prompt injection | Mail-derived text is labelled untrusted, returned as data rather than instructions, and cannot directly create a commitment or send a message. |
| Role-scoped challenge actions | The fictional supporter/carer IDs are checked against seeded permissions and assignments; tool descriptions explicitly state that production must bind identity to authentication. |
| Voice boundary | The wall voice session gets only 23 appropriate tools; role writes, final approvals, reconciliation, reset, and undo are omitted and rejected by the dispatcher. |
| Emergency ambiguity | CareWeave states that it is not an emergency service and offers direct human handoff rather than making a clinical inference. |

## Compatible-host judge journey

Open [care-weave.vercel.app](https://care-weave.vercel.app/) in ChatGPT's in-app browser and follow this visible journey:

- The page reports “WebMCP: 32 site tools connected.”
- “What matters today, and is tomorrow rushed?” uses the structured day brief and pacing data.
- “Show me tomorrow and put the route to Dr Patel on screen.” changes both the visible day and route panel.
- “Prepare a request to move the appointment to a calm morning.” opens a review showing the exact recipient, subject, and message.
- Nothing is sent, and the confirmed appointment remains at its original time.
- Reloading preserves reliable tool registration and repeats the first prompt cleanly.

The deterministic and browser-native evaluations remain separate from this model-selected demonstration so each layer of evidence is clear.
