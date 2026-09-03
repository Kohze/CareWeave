# WebMCP task-level evaluation

This evaluation checks the experience CareWeave is submitting: an agent and a person understand the same care plan, move the shared interface to the relevant context, and prepare a consequential request without silently changing reality.

## Evidence status

| Layer | Status | What it proves |
| --- | --- | --- |
| Unit and domain tests | Automated | Runtime input validation, revision checks, stale-plan rejection, untrusted email handling, appointment state transitions, permissions, and voice-tool filtering. |
| Simulated WebMCP host in Playwright | Automated | All 32 tools register through the same browser API shape, execute against the real page, change the visible shared focus, and fail closed if registration is partial. |
| Judge-journey browser eval | Automated | The exact briefing → pacing → focus → route → draft flow succeeds while the confirmed appointment remains unchanged and the review dialog is visible. |
| Deployed ChatGPT in-app browser | Final manual check required | Confirms the current host discovers the tools and chooses the intended sequence on the production origin. |

The automated browser host intentionally implements only the `registerTool` contract needed to exercise the production tool definitions. It is not presented as proof that a particular ChatGPT host build is available. Record the final host result in the checklist below.

Latest clean local result on 3 September 2026: 41/41 unit tests and 100/100 applicable browser checks passed across iPad landscape, iPad portrait, and mobile; 38 viewport-specific checks were deliberately skipped.

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

## Final production-host smoke test

Open [care-weave.vercel.app](https://care-weave.vercel.app/) in ChatGPT's in-app browser and run the following before submission:

- [ ] Confirm the page reports “WebMCP: 32 site tools connected.”
- [ ] Ask: “What matters today, and is tomorrow rushed?”
- [ ] Confirm the answer uses the day brief and pacing data rather than guessing from pixels.
- [ ] Ask: “Show me tomorrow and put the route to Dr Patel on screen.”
- [ ] Confirm the visible day and route panel both change in the open CareWeave page.
- [ ] Ask: “Prepare a request to move the appointment to a calm morning.”
- [ ] Confirm the review dialog shows the exact recipient, subject, and message.
- [ ] Confirm nothing is sent and the appointment remains confirmed at the original time.
- [ ] Reload and repeat the first prompt once to rule out a one-off registration race.

If any item fails in the live host, record the exact prompt, host/browser version, available tool count, and console error. Do not replace this with a claim based only on the simulated host.
