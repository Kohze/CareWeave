# CareWeave submission copy

Copy-ready descriptions for hackathon forms, listings, social posts, and the
demo page. Claims are intentionally limited to the submitted challenge build.

## Project name

CareWeave

## Tagline

Everyday care, woven together.

## One-line description

CareWeave is a calm, accessible dayboard where people and WebMCP agents understand daily care, focus the same screen, and prepare actions safely together.

## Very short description

One calm dayboard for appointments, care, food, travel, and messages—with a WebMCP agent that helps without taking control.

## Short description

CareWeave turns fragmented appointments, care visits, food, travel, reminders, and messages into one calm shared dayboard. Through WebMCP, an assistant can understand the same structured household state a person sees, bring the right day or route onto the shared screen, and prepare useful actions for review. Important decisions stay visible, and a request never masquerades as a confirmed change.

## Elevator pitch

Daily coordination can become a job of its own when appointments, clinic emails, carers, groceries, weather, and transport all live in different places. CareWeave brings them into one accessible dayboard designed for older adults, disabled people, people recovering from illness, and the people they trust.

Its WebMCP tools let an agent do more than talk about the page: it can read structured plans, judge whether a day is rushed, focus the board on the relevant appointment, show a route, and prepare an exact clinic request. Consequential actions stop at a clear human review step, and the confirmed appointment stays unchanged until an external confirmation arrives. CareWeave reduces administrative effort while keeping the person at the centre of every decision.

## Full project description

Daily life rarely arrives in one tidy app. A clinic changes an appointment by email. A carer is delayed. Groceries need ordering before the weekend. Weather affects the journey. A relative can help, but should not need access to every private detail. For someone managing fatigue, reduced mobility, memory changes, illness, or a growing support network, keeping those pieces aligned can become a heavy and continuous burden.

CareWeave turns that fragmented work into one calm, accessible dayboard. It brings together appointments, care visits, food, shopping, reminders, travel, weather, and important messages in a view designed around three human questions: What is happening today? Is there anything I need to decide or prepare? Can you help me deal with it safely?

WebMCP makes the board a shared workspace for the person and an AI assistant. CareWeave exposes 32 narrow, validated tools that let a compatible agent read structured household state, check day pacing, find planning options, focus the visible interface on a date or appointment, show a route, and prepare reviewable actions. The assistant does not have to infer meaning from pixels, and its answer does not disappear into a separate chat: the board visibly follows the conversation so both person and agent remain focused on the same context.

The most important design principle is that help must not become hidden control. If someone asks to move a clinic appointment, CareWeave can identify calmer times and prepare the exact recipient, subject, and message. It then presents an expiring action plan for human review. Creating or approving that plan does not rewrite the calendar: the original appointment remains confirmed until a verified external reply confirms a new time. Email-derived content is marked as untrusted, state-changing tools are revision-checked and audited, and local changes can be undone.

CareWeave also supports privacy-limited family help, visible reminder ownership, live weather, routes with written directions, large touch targets, high contrast, larger text, keyboard access, reduced motion, and spoken interaction with a typed fallback. The challenge experience is account-free and uses deterministic fictional household data, so every judge can try the complete workflow immediately and safely. An optional Gmail connection can read bounded message previews and create drafts, but it never sends mail automatically.

CareWeave is not a medical device and the challenge build is not intended for real care data. It is a working proof of a different relationship with assistive AI: one where the agent handles complexity, the interface makes its work legible, and the person keeps authority over what happens next.

## What it does

CareWeave gives a person one clear place to understand and manage the practical details of daily care. It combines a simple Day view and seven-day outlook with appointments, care visits, meals, shopping, reminders, travel, weather, and important messages.

A WebMCP-compatible assistant can use structured site tools to:

- explain what matters today and whether another day looks rushed;
- focus the visible dayboard on the relevant date, event, or route;
- find calmer planning options using household-specific pacing rules;
- prepare clinic or support requests with exact text for review;
- help manage reminders and narrowly scoped support; and
- preserve the difference between a suggestion, a draft, a request, and a confirmed real-world change.

The result is a shared surface where the assistant can do useful work while the person can always see, understand, approve, or stop it.

## Why WebMCP

Care coordination is a chain of tasks, not a single question. The assistant must understand confirmed plans and unresolved messages, reason about travel and breathing room, move attention to the relevant item, prepare a response, and verify what actually changed.

Without WebMCP, the assistant would have to guess at dates, controls, and state from rendered pixels or send the person back through several apps. With WebMCP, CareWeave exposes bounded capabilities with validated inputs and structured results. The agent and touch interface reuse the same domain functions, so they operate on one truthful state. Read-only, untrusted-content, and consequential annotations make the safety boundary explicit, while revision checks prevent a stale plan from being approved after the household state changes.

This is why WebMCP is core to CareWeave rather than an integration added for the challenge: it enables the product's central loop—understand together, focus together, prepare safely, and let the person decide.

## How we built it

CareWeave is an installable SvelteKit PWA built with Svelte 5, TypeScript, and Vite. It uses Leaflet and OpenStreetMap for the route view, Open-Meteo for privacy-conscious local forecasts, browser speech capabilities plus an optional OpenAI Realtime voice path, and an optional server-side Gmail OAuth flow that can read bounded previews and create drafts without exposing a send endpoint.

The site feature-detects `document.modelContext.registerTool` and registers 32 imperative WebMCP tools on the top-level page. Runtime schemas reject malformed or oversized input, handlers reuse the application's domain functions, state revisions prevent stale mutations, and partial registration is rolled back instead of presenting an incomplete toolset as healthy.

The judged path uses deterministic, resettable fictional data stored on the device. This keeps the experience account-free and reproducible while making clear that authentication and cross-device storage are production work, not features of the challenge prototype. Unit tests, Playwright accessibility and interaction tests, and a browser-native WebMCP smoke evaluation verify the core flow; the submitted smoke run passed all 10 expected tool steps across six journeys.

## Challenges we ran into

The hardest problem was not exposing more actions—it was defining what an agent must never be allowed to imply. In ordinary calendar software, “requested,” “sent,” and “confirmed” are easily collapsed into one state. In care coordination, that ambiguity can make someone travel at the wrong time or believe help is arranged when it is not. We designed an explicit appointment lifecycle and made every consequential operation pass through a frozen, expiring review plan.

We also had to make agent activity legible to someone who should not need to understand tool calls. The solution was shared visual focus: when the agent discusses tomorrow's appointment or route, the dayboard itself moves to that context. Finally, we balanced a broad care story with a calm interface by keeping the default surface simple and revealing detail progressively.

## Accomplishments we are proud of

- WebMCP changes the visible product experience instead of only returning text to chat.
- The complete appointment workflow preserves truthful state from planning through external confirmation.
- Thirty-two narrow tools share domain logic with the touch UI and include runtime validation, safety annotations, revision checks, and rollback-safe registration.
- The interface supports large text, high contrast, keyboard navigation, reduced motion, generous touch targets, and responsive iPad and phone layouts.
- Judges can run the complete core journey with no account, credentials, API key, or setup.
- The production-host WebMCP smoke evaluation passed 10 out of 10 expected tool steps.

## What we learned

Agentic accessibility is not only about adding voice or making buttons larger. It is about reducing the amount of state a person must hold in memory while making the agent's interpretation and actions visible enough to trust. Structured tools help the agent understand the application, but shared visual context helps the person understand the agent.

We also learned that capability boundaries can be product features. Treating untrusted messages as evidence rather than instructions, separating drafts from sent requests, and separating requests from confirmations made the whole experience clearer—not just safer.

## What's next

The next phase is a small, consent-based household pilot. Before CareWeave accepts real care data, it needs authenticated users, encrypted server-side persistence, tested role and row-level access controls, live calendar and routing adapters, accessibility testing with older and disabled participants, and the appropriate privacy, security, and clinical-boundary review.

The product direction will stay deliberately focused: improve reliability, consent, and useful integrations without turning the calm dayboard into another complex care-management system.

## Social description

We built CareWeave for the OpenAI WebMCP Challenge: one calm, accessible dayboard for appointments, care, food, travel, reminders, and messages. A WebMCP agent can understand the plan, move the shared screen, and prepare real actions—but the person always sees and controls what happens next. Everyday care, woven together.

## Judge call to action

Open CareWeave with no login and ask three things: “What matters today, and is tomorrow rushed?”, “Show me tomorrow and the route to Dr Patel,” and “Prepare a request to move the appointment to a calm morning.” Watch the agent understand structured state, move the shared interface, and create an exact review plan—without sending anything or changing the confirmed appointment.

## Safety note

CareWeave is a hackathon prototype, not a medical device or production care system. The challenge experience uses fictional household, clinic, mailbox, address, and route data. No real email is sent by the demo.
