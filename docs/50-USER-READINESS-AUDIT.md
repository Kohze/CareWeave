# CareWeave 50-user readiness audit

Audit date: 2 September 2026  
Scope: the current fictional SvelteKit/WebMCP challenge build  
Primary question: what is still needed for older adults and trusted supporters without turning CareWeave into a complex care-management system?

## Executive result

Fifty deliberately difficult example-user scenarios were walked through against the current product, data model, documented safety boundaries, and automated accessibility evidence.

| Result | Users | Meaning |
|---|---:|---|
| Works now | 14 | The person's main task is supported by the current interface and safety model. |
| Partial | 23 | The basic path works, but an important edge, assurance, or production control is missing. |
| Blocked | 13 | The task cannot yet be completed safely or truthfully in the current prototype. |

This is not a prediction that only 14% of real older adults could use CareWeave. The sample intentionally over-represents difficult combinations and production edge cases. It is a design stress test, not user research and not a clinical-risk assessment.

The core dayboard should stay simple. Most gaps can be addressed with four additions to existing surfaces:

1. A truthful freshness strip: **implemented** with current, delayed, and offline states.
2. A small reminder loop: **implemented** as **Done**, **Remind me later**, and **I need help**, with supporter acknowledgement.
3. A supporter setup sheet: **implemented as a local challenge demonstration** for invite state, scope, expiry, preview, and revoke.
4. Stronger calendar semantics: **implemented at prototype level** for weekly/daily expansion, named zones, source versions, overlap detection, and human-reviewed duplicate candidates. Per-occurrence exceptions and fully verified DST semantics remain production work.

The implementation deliberately did not add another everyday tab. Freshness sits beside the date, reminder actions appear only in event details, supporter administration is a protected sheet, and privacy/emergency handoffs are single-purpose controls.

## Method

Each example has a primary limitation or context, a realistic high-value task, and a result:

- **Works** means the current challenge build supplies a credible path without adding a new feature.
- **Partial** means a path exists but lacks a material assurance, accessibility, or recovery capability.
- **Blocked** means pretending to support the task would be unsafe or misleading.

The rescored review uses the current UI and source model, the current automated browser, domain, WebMCP, OAuth, and accessibility suites, the WCAG audit, and the standards cross-check at the end of this document. Synthetic users cannot reveal comprehension, trust, fatigue, speech-recognition quality, or real-world error rates; moderated sessions remain mandatory.

## Remaining concrete gaps after implementation

These are implementation findings, not speculative future features:

1. **The family and carer roles are demonstrations, not authorization boundaries.** The UI and tools enforce local permissions, assignments, expiry, and revocation, but the client still supplies fictional person IDs. Production needs authenticated sessions and server-side enforcement.
2. **Schedule sharing is category-coarse.** Owners can turn schedule, care, food, attention count, offers, and help responses on or off and preview the result, but cannot yet hide one health event while sharing another.
3. **Invitation and revocation are local.** The setup sheet records invitation states but sends no email and creates no account. Revocation does not terminate sessions on other devices.
4. **Reminder delivery stops at the visible board.** Done, snooze, help request, and supporter acknowledgement work, but web push, quiet hours, retry, escalation timers, and missed-reminder recovery are not connected.
5. **Care updates prove policy, not identity.** Assigned-carer and recent-timestamp checks work, completion cannot regress, and feed freshness updates; provider roster integration, authenticated employer identity, corrections, and professional audit remain missing.
6. **Calendar correctness is still incomplete.** Recurrence expansion, named zones, provider IDs/versions, overlap checks, and duplicate candidates exist, but per-occurrence exceptions, series editing, cross-zone DST conformance, merge UI, and provider reconciliation do not.
7. **Sensitive data is browser-local demo data.** Household data, support roles, outbox records, and history use `localStorage`; there is no account, encryption-at-rest boundary, multi-device sync, backup, retention control, or remote deletion. This is a production limitation, not a blocker for the deterministic fictional WebMCP challenge demo.
8. **Most connections remain adapters on paper.** Gmail now has a first-party OAuth read/draft path, but Microsoft Graph, calendar, care provider, production routing, and actual outbound sending are not connected. The Gmail cookie-backed token store is suitable only for a private demonstration until household authentication and server-side per-user token storage are added.
9. **Language support is a stored preference, not localisation.** Dates, UI copy, speech configuration, and summaries are still English-only.
10. **Accessibility evidence remains mainly automated.** The suite now covers all main views plus display, voice, support setup, urgent help, and privacy dialogs, but VoiceOver, Switch Control, magnification, mounted-distance use, real room acoustics, and comprehension by people with cognitive disabilities have not been demonstrated with users.

## The 50 example users

### A. Perception, hearing, dexterity, and physical context

| # | Example user and limitation | Task | Result | Smallest missing requirement |
|---:|---|---|---|---|
| 1 | Ruth, 78, reduced contrast sensitivity and 200% text | Read today's appointment and preparation | Partial | Test magnification and real viewing distance, not only CSS zoom and automated contrast. |
| 2 | George, 84, blind and using VoiceOver | Find the next appointment and route | Blocked | Complete manual VoiceOver rotor, focus-order, map-alternative, and live-announcement testing. |
| 3 | Mei, 73, red-green colour blindness | Distinguish confirmed, changed, and cancelled plans | Works | Current status text and icons do not depend on colour alone. |
| 4 | Alan, 81, hearing loss | Use voice while a television is playing | Partial | Repeat/replay, adjustable speech rate, and a tested noisy-room transcription path. |
| 5 | Fatima, 76, Deaf and non-speaking | Complete the same tasks without voice | Partial | Touch works and transcripts exist, but every future alert also needs a visual, persistent equivalent. |
| 6 | Joan, 86, hand tremor | Open details and undo a mistaken tap | Works | Large targets, safe dialogs, and undo cover the core path. |
| 7 | Peter, 79, arthritis | Operate the wall iPad with low precision | Works | Current touch targets meet the product's 44px floor. |
| 8 | Elena, 74, temporarily one-handed | Review a message and decline it | Works | Core actions do not require gestures or two-handed input. |
| 9 | Walter, 88, seated below a poorly mounted iPad | Reach navigation and voice controls | Blocked | A mounting/setup checklist plus optional remote or switch-control path. |
| 10 | Ingrid, 82, visual fatigue | Check the day in under 20 seconds | Works | Guided display mode keeps Today primary and visually emphasises the next plan without a new navigation mode. |

### B. Memory, cognition, language, and confidence

| # | Example user and limitation | Task | Result | Smallest missing requirement |
|---:|---|---|---|---|
| 11 | Margaret, 80, mild short-term memory loss | Know whether she already prepared her documents | Works | Visible reminder state supports Done, Later, and Help, with timestamps in the underlying audit state. |
| 12 | Denis, 85, early dementia | Resume after leaving the screen midway | Works | Guided mode persists, returns to the day-first home, and gives the first plan stronger emphasis. |
| 13 | Aisha, 87, moderate cognitive impairment | Recognise who is visiting | Blocked | Optional familiar photo/name cards configured by a trusted supporter. |
| 14 | Luis, 72, aphasia | Express that he needs transport help | Blocked | A small visual phrase/action board; free conversation alone is unsuitable. |
| 15 | Mary, 83, low literacy | Understand an email-derived schedule change | Partial | Plain-language summaries need moderated comprehension testing and optional read-aloud per card. |
| 16 | Halina, 77, speaks Polish and little English | Use the complete dayboard | Blocked | Localised UI, dates, speech, and source summaries; language is a household preference. |
| 17 | Brian, 79, difficulty interpreting clock time | Understand when to leave | Partial | Optional relative phrasing such as “after lunch” plus both leave and arrival times. |
| 18 | Sophie, 75, appointment anxiety | Request a change without fearing accidental cancellation | Partial | Existing staged review is strong; add a persistent request-state explanation and easy withdrawal. |
| 19 | Ahmed, 86, acutely confused today | Reliably interpret a normal-looking board | Partial | Freshness, exceptions, and human-help handoff are visible, but the app correctly does not infer capacity; a real support protocol is still needed. |
| 20 | Nora, 71, very low digital confidence | See today and open one event | Works | The day-first model and direct cards support this basic task. |

### C. Household, care, food, and health complexity

| # | Example user and limitation | Task | Result | Smallest missing requirement |
|---:|---|---|---|---|
| 21 | Colin, 69, independent and managing one appointment | See the appointment, preparation, and route | Works | Current core flow covers it. |
| 22 | Eva, 89, lives alone with occasional fall risk | Signal that expected help is needed | Works | **I need help** creates an explicit ordinary support request, while urgent help clearly says there is no fall detection or monitoring. |
| 23 | Rose, 90, receives two professional care visits daily | See whether each visit occurred | Partial | Multiple timestamped visits, responsible organisation, and freshness/source state. |
| 24 | Stanley, 84, care-team shifts change often | Know which carer is coming after a rota change | Blocked | Provider roster integration, versioned updates, and handoff/conflict handling. |
| 25 | Priya, 78, depends on meal delivery | Know whether today's meal is coming | Partial | Delivery state, expected window, source freshness, and a failure action. |
| 26 | Marta, 80, severe food allergy | Let relatives help shop safely | Blocked | Do not model allergy safety as free-text groceries; use a verified dietary profile or leave it out. |
| 27 | Frank, 76, diabetes requiring meal coordination | Align meals with treatment | Blocked | This crosses into clinical guidance; integrate a clinician-approved care plan rather than invent rules. |
| 28 | Grace, 85, complex medication schedule | Avoid a missed or duplicate dose | Blocked | Medication is a separate safety-critical domain with authoritative reconciliation and adherence rules. |
| 29 | Theo, 74, weekly physiotherapy for six months | Maintain the recurring series | Partial | Daily/weekly occurrence expansion works; exceptions, series editing, and cancellation semantics remain missing. |
| 30 | June, 82, newly discharged from hospital | Coordinate follow-ups, equipment, meals, and carers | Blocked | A lightweight, source-backed task bundle with owner and due state; not a new dashboard. |

### D. Family, professional supporters, privacy, and authority

| # | Example user and limitation | Task | Result | Smallest missing requirement |
|---:|---|---|---|---|
| 31 | Sam, nearby daughter and trusted supporter | Check today and offer shopping help | Works | This is the implemented challenge path. |
| 32 | David, son living eight time zones away | Offer a call at a sensible local time | Partial | Store both household and supporter time zones and label whose time is shown. |
| 33 | Kim and Alex, siblings who both coordinate help | Avoid duplicate offers and conflicting plans | Partial | Multiple local supporters, accepted-help ownership, and integrity checks work; authenticated identities and cross-device conflict handling do not. |
| 34 | Pat, a trusted neighbour for one week | Receive temporary food-only access | Partial | The setup sheet demonstrates narrow, expiring access and revocation, but sends no invitation or production credential. |
| 35 | Lee, paid home-care worker | Record a visit without seeing family details | Partial | Assigned-carer visit updates are narrowly validated; employer identity, provider integration, and server audit remain missing. |
| 36 | Mo, previously trusted but now revoked after a safeguarding concern | Lose access immediately on every device | Blocked | Server-enforced session revocation; the current local membership flag is not security. |
| 37 | Elsie, uses only a landline and wall iPad | Receive a family check-in | Works | Urgent help provides a visible telephone handoff to the chosen supporter and local emergency services. |
| 38 | Omar, cousin helping only during recovery | Access support for 14 days | Partial | Time-bounded delegation and automatic expiry work locally; production authentication and server enforcement do not. |
| 39 | Janet, formal health-and-welfare proxy | Act within documented authority | Blocked | Explicit proxy scope and provenance; ordinary “family” status must not imply legal authority. |
| 40 | Irene, shares food status but not appointments | Control exactly what each relative sees | Partial | Owner-facing category permissions and preview work; per-event exceptions and server enforcement remain missing. |

### E. Reliability, calendar semantics, integration, and emergencies

| # | Example user and limitation | Task | Result | Smallest missing requirement |
|---:|---|---|---|---|
| 41 | Victor, unreliable rural internet | Trust the board while offline | Works | The cached board remains usable and is explicitly labelled offline with the latest saved state and retry guidance. |
| 42 | Barbara, iPad restarts after a power cut | Recover the latest known day safely | Partial | Local state survives, but production needs server sync, startup health, and tested recovery. |
| 43 | Henry, wall iPad is visible to visitors | Keep health and care details private | Partial | One tap now visually and semantically hides the board; idle locking and device/account authentication remain production work. |
| 44 | Susan, recurring Sunday carer visit over daylight-saving change | Keep the visit at the intended local time | Partial | Named zones and recurrence expansion exist, but full cross-DST conformance and exception tests remain incomplete. |
| 45 | Michael, travels to another time zone for treatment | Interpret home and destination appointments | Partial | Events and routes carry named zones and details label them; dual home/destination presentation remains missing. |
| 46 | Anne, receives the same appointment by email and calendar | Avoid two copies | Partial | Cross-source duplicate candidates and human-review findings exist, but a visible merge/reconciliation workflow remains missing. |
| 47 | Robert, gets an ambiguous clinic cancellation email | Keep the real appointment until verified | Partial | The current safe separation is good; add sender/thread verification and unresolved-conflict state. |
| 48 | Linda, sees that a carer is 30 minutes late | Know who is responding | Partial | Add freshness, acknowledgement, responsible contact, and a consented escalation timer. |
| 49 | Arthur, has acute chest pain | Get appropriate emergency help | Works | Urgent help clearly states the monitoring boundary and exposes one-tap supporter and local emergency telephone handoffs. |
| 50 | Claire, daughter supporting three relatives | Avoid alarm fatigue | Blocked | Per-person notification priorities, digesting, quiet hours, acknowledgement, and escalation ownership. |

## What the 50 cases actually ask us to build

### Priority 0: complete the trustworthy loop

These were the highest-leverage changes. All four now have a deliberately small challenge-level implementation; the production qualifications below still apply.

#### 1. Freshness and failure truth

**Challenge status: implemented.** One compact status line appears on Today and Support:

- **Updated 5 minutes ago**
- **Offline - showing information from 08:40**
- **Calendar updated; care visits could not refresh**

Calendar, care, and message feeds carry `lastSuccessfulSyncAt` and `staleAfter`; imported calendar records carry source/version metadata. “On track” is withheld when a required feed is stale. Production adapters still need authoritative observation timestamps, retry queues, and reconciliation.

#### 2. Acknowledge, snooze, and ask for help

**Challenge status: implemented.** Eligible event details offer three actions:

- **Done**
- **Remind me later**
- **I need help**

Help requests appear only to an active supporter with explicit permission, and that supporter can acknowledge or complete the request. Timed escalation, quiet hours, push delivery, and retry remain production work. There is no hidden monitoring or automatic emergency claim.

#### 3. Support-circle administration

**Challenge status: local demonstration implemented.** A protected sheet outside the six everyday tabs supports:

- invite by verified contact;
- active, invited, expired, and revoked states;
- scopes for schedule, care status, food, and offers;
- start and expiry dates;
- “Preview what this person can see”;
- local revocation, with server-side session revocation explicitly left for production;
- an owner-readable access history.

Supporters still propose; the older adult still decides. The sheet does not send invitations or create real accounts. Legal proxies and professional carers must remain explicit authenticated roles, not stronger versions of “family.”

#### 4. Calendar correctness beneath the calm UI

**Challenge status: partially implemented beneath the UI.** The data layer now includes:

- IANA time-zone identifiers;
- recurring series expansion; per-occurrence exceptions remain missing;
- event/source IDs and versions;
- cross-source duplicate candidates with human merge review;
- conflict detection;
- reminder state, while notification delivery preferences remain production work;
- explicit proposed, requested, confirmed, cancelled, and no-show semantics.

This improves cases 29, 32, and 44-47 while leaving the day view unchanged. Provider-grade recurrence/DST conformance and reconciliation remain necessary.

### Priority 1: broaden access without broadening navigation

1. **Guided display mode:** implemented without another tab; optional familiar photos and authenticated setup remain missing.
2. **Language and comprehension:** read-aloud and a stored language preference exist, but localised dates/UI, language-specific speech, and translated summaries remain missing.
3. **Non-voice parity:** all alerts remain visible until acknowledged; replay and speech-rate controls are available; a small visual phrase board can expose “I need transport,” “call family,” and “not now.”
4. **Installation hardening:** documented iPad mounting, Guided Access/Assistive Access compatibility, auto-launch, brightness, charging, restart recovery, and permissions setup.

### Priority 2: production foundations

- Authenticated backend with passkeys plus an accessible fallback.
- Encrypted server persistence, device/session inventory, remote revocation, backups, export, and deletion.
- Gmail/Microsoft and calendar adapters with least-privilege OAuth, idempotency, versions, retries, and explicit sync health.
- Home Screen PWA installation and opt-in web push with quiet hours, priority, acknowledgement, and digest rules.
- Consent records, data-retention controls, field-level disclosure, auditable access, and jurisdiction-specific legal review.
- Real provider directories, verified clinic/carer contacts, and safe retry/reconciliation for outbound messages.
- Structured usability sessions with older adults, VoiceOver, Switch Control, magnification, hearing loss, cognitive limitations, several languages, and realistic room noise.

## What not to add

Keeping CareWeave small is a product safety choice. Do not add these as native “smart” features for the challenge:

- medication dosing or adherence claims;
- diagnosis, treatment, nutrition, or allergy recommendations;
- automatic fall detection or emergency monitoring;
- hidden family surveillance, continuous location tracking, or background microphone use;
- a raw inbox, conventional month grid, analytics dashboard, family chat feed, or complex role matrix on the everyday screen;
- automatic appointment changes based only on email text or model inference.

If later required, medication and clinical care plans should arrive from an authoritative provider integration and remain visibly source-backed. Emergency capability should be a clear handoff to local services or a chosen contact, not an implied monitoring service.

## Recommended minimal product shape

No new primary navigation is required.

| Existing surface | Small extension |
|---|---|
| Today | Freshness strip; Done / Later / Need help on eligible cards |
| Attention | Offers, sync failures, duplicate/conflict review, and unacknowledged reminders |
| Support | Freshness, accepted-help assignment, and “Margaret asked for help” state |
| Display | Guided mode and language/read-aloud preferences |
| Protected setup sheet | Support-circle access, reminder escalation, devices, and data connections |

This preserves the current mental model: **today, things to decide, and people who can help**.

## Standards and comparable patterns we should adopt

- [W3C guidance for older users](https://www.w3.org/WAI/older-users/) says older-user needs overlap vision, dexterity, hearing, and cognitive accessibility. Automated WCAG checks are necessary but do not replace human testing.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) remains the accessibility baseline. CareWeave should retain its stronger 44px target policy, persistent alternatives, focus safety, reflow, and no time pressure.
- [Apple Assistive Access for iPad](https://support.apple.com/guide/assistive-access-ipad/set-up-assistive-access-devcd5016d31/ipados) provides a useful precedent: larger and more focused experiences are configured with a trusted supporter, with row/grid choices and simplified navigation.
- [NHS family and carer access](https://www.nhs.uk/nhs-services/gps/health-services-for-someone-else-family-carer-access/give-someone-access-health-services/) treats support as explicit proxy access that can cover all or only part of a record and does not remove the person's own access. CareWeave needs the same explicit grant/revoke principle.
- [ICO special-category guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-rules-on-special-category-data/) reinforces that health data needs an Article 6 basis plus an Article 9 condition, with data minimisation and stricter rules around significant automated decisions. Legal implementation depends on deployment jurisdiction.
- [RFC 5545 iCalendar](https://www.rfc-editor.org/info/rfc5545/) and [RFC 4791 CalDAV](https://www.rfc-editor.org/info/rfc4791/) are the interoperability floor for recurrences, time zones, alarms, and calendar access.
- For clinical integrations, use [FHIR Appointment](https://hl7.org/fhir/R5/appointment.html), [RelatedPerson](https://hl7.org/fhir/R5/relatedperson.html), [CarePlan](https://hl7.org/fhir/R5/careplan.html), Consent, Task, and [Provenance](https://hl7.org/fhir/R5/provenance.html) as mapping targets rather than inventing incompatible medical semantics.
- [WebAuthn](https://www.w3.org/TR/webauthn-3/) supports phishing-resistant passkeys, but the authentication design still needs more than one accessible verification method and generous timeouts.
- [Apple Web Push guidance](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers) confirms that opt-in push is available to Home Screen web apps on supported iPadOS versions. Push should supplement, not replace, visible in-app state.

## Decision gate

The hackathon-facing decision gate is now met: freshness and reminder/help loops are visible; narrow invitation, scope, preview, expiry, and revocation are demonstrable; recurrence, time-zone metadata, source versions, conflicts, and duplicate candidates exist in the domain model. The UI remains six everyday tabs.

Do not claim household-pilot readiness until authenticated supporter access, stale/offline truth, reminder delivery, server persistence, immediate revocation, and moderated older-adult testing are complete.
