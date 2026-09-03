# Product specification

## Promise

CareWeave answers three questions without making an older adult operate a conventional calendar:

1. What is happening today?
2. Is there anything I need to decide or prepare?
3. Can you help me deal with it safely?

It serves the older adult first, while making the same facts understandable to family, carers, and a voice assistant.

## Core objects

- A commitment is confirmed reality: appointment, care visit, meal, shopping, household task, travel, or social plan.
- An attention item is a possible task extracted from an external source. It has confidence and provenance but is not automatically a commitment.
- An action plan is a frozen, expiring preview of consequential work. Approval fails if household state changed after drafting.
- A source reference stores a minimal summary and provenance. Raw message content is not required in the challenge client.
- A support member is a named, revocable person with narrow permissions. The challenge build gives Sam a privacy-limited family view; it does not simulate production authentication.
- A support offer is a non-binding proposal. It becomes an attention item for the older adult and never edits a commitment by itself.
- A reminder is an ordinary household prompt with explicit done, snoozed, help-requested, and help-acknowledged states. It is not a medication-adherence or emergency record.
- A data feed records source freshness so the UI and agent can distinguish current, delayed, and offline information.
- A care-visit update records whether an expected visit is scheduled, checked in, completed, late, or missed without exposing the professional care note to a relative.
- Activity is the human-readable audit record.

## Appointment lifecycle

```text
confirmed → suggestion or Gmail draft prepared → still confirmed
     └──────────────── verified external confirmation ──→ confirmed new time / cancelled
```

A local suggestion or Gmail draft is not a sent request. Even a sent request does not imply acceptance, so protected health commitments change only after verified external confirmation.

## Accessibility decisions

- Large type, plain labels, calm density, and controls generally at least 52–56 CSS pixels.
- Persistent Comfortable/Extra large text and Soft/High contrast modes, plus safe 200% browser text reflow.
- No essential information is communicated only by colour.
- Keyboard-visible focus, semantic headings, live announcements, and reduced-motion support.
- The default screen is a day, not a month grid. Details are progressive rather than permanently visible.
- Routes pair a real, pannable OpenStreetMap with a highlighted demo path, written steps, an explicit leave time, and a handoff to full walking directions in Apple Maps.
- Push-to-talk supports common day, week, food, message, route, and appointment-request commands; every spoken answer is also shown as text, with a clear ChatGPT fallback when browser speech is unavailable.
- No medical diagnosis or treatment recommendations.
- The family-support projection omits message contents, source records, medical notes, and detailed carer notes. Supporters may offer help; the older adult accepts or declines.
- Privacy cover, urgent human handoff, guided display, and persistent reminder controls live on existing surfaces instead of adding more navigation.

## Product modes

- Challenge demo: fictional relative-date mailbox by default, optional Gmail OAuth read/draft access, local household store, sandbox outbox, and fictional route coordinates shown on a live map. Multi-user production needs authenticated server-side token storage plus a contracted tile and routing provider.
- Household pilot: authenticated mail/calendar adapters, live directions, trusted contacts, encrypted server storage, consent and carer permissions.
- Wall mode: installed PWA with guided-access recommendations and periodic refresh; voice interaction comes from a compatible browser assistant.

## Definition of done for the challenge

- A judge can discover and call top-level imperative WebMCP tools.
- A read tool can brief the day and a UI tool visibly focuses shared context.
- A planning tool offers explainable choices without booking.
- A reschedule request produces an exact review, requires approval, puts mail in the sandbox outbox, and leaves the original time unchanged.
- A trusted relative can inspect the limited support overview and offer help; the older adult sees and controls the resulting request.
- A person can acknowledge, snooze, or request help on an ordinary reminder; a permitted supporter can visibly take and complete responsibility.
- Current/delayed/offline state is visible and available to the voice/WebMCP agent before it gives reassurance.
- The interface works at iPad landscape and phone widths.
- Static production build, tests, public MIT license, demo script, and submission copy are present.
