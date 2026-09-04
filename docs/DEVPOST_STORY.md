## Inspiration

An appointment reminder arrives by email. The journey depends on the weather. A carer is visiting that morning. A son can help, but should not need access to private messages. None of these facts is difficult on its own. Keeping them aligned is.

For many older and disabled people, daily life is spread across inboxes, calendars, maps, notes, and several people's memories. A small uncertainty can become a missed appointment, a wasted journey, an empty fridge, or another phone call asking someone else to check. The result is not just inconvenience. It is time, energy, confidence, and independence gradually lost to administration.

Most planning tools assume that someone can scan a crowded calendar, remember where each detail lives, notice every change, and recover when information conflicts. Those assumptions become barriers for people managing fatigue, pain, reduced mobility, sensory loss, memory changes, or recovery.

Support can also come with a hidden trade. To receive help, a person is often expected to hand over more privacy or control than the task requires.

CareWeave began with a belief that independence does not mean doing everything alone. It means deciding how help happens.

We wanted to build one calm place where a person, the people they trust, and an agent could work from the same understanding. The technology should carry the complexity. The person should keep the authority.

## What it does

CareWeave turns the scattered work of daily care into one accessible dayboard. It brings together appointments, care visits, food, shopping, reminders, travel, weather, and important messages, then answers three human questions:

1. What is happening today?
2. Is there anything I need to decide or prepare?
3. Can you help me deal with it safely?

Instead of a dense monthly calendar, CareWeave begins with a clear day. It shows what matters now, what needs attention, and whether the pace feels calm or rushed. Large controls, readable text, high contrast, written alternatives to speech, and generous touch targets reduce the effort needed to use it.

WebMCP makes CareWeave a genuinely shared workspace. A compatible agent can understand structured household information instead of guessing from pixels. It can explain the day, check the surrounding week, focus the visible board on an appointment, calculate when to leave, and open the route on the same screen the person is viewing.

The clearest example is a clinic appointment. A person can ask:

> What matters today, and is tomorrow rushed?

CareWeave returns confirmed plans, preparation, travel, and unresolved attention items. The person can then ask:

> Show me tomorrow and the route to Dr Patel.

The dayboard moves to tomorrow and displays the route with a safe departure time. The conversation and the interface stay in sync.

If the day feels too demanding, the person can ask:

> Prepare a request to move the appointment to a calm morning.

CareWeave finds suitable options and prepares the exact recipient, subject, and message. It presents an expiring review plan before anything progresses. The original appointment remains confirmed until the clinic verifies a new time. A suggestion is not a draft, a draft is not a sent request, and a request is not a confirmation.

Trusted supporters have a deliberately limited view. They can offer practical help without reading private messages, medical notes, or detailed care records. The person receiving support can accept, decline, undo, or revoke access.

The agent handles coordination. The person keeps the decision.

## How we built it

CareWeave is an installable SvelteKit progressive web app built with Svelte 5, TypeScript, and Vite. We started with the domain model rather than the interface. Confirmed commitments, untrusted attention items, reminders, support offers, data freshness, and action plans are separate objects. This prevents proposed actions from being mistaken for real outcomes.

The application registers 32 imperative WebMCP tools through `document.modelContext.registerTool`. They cover understanding the day, checking pace, finding options, changing shared visual focus, showing routes, managing reminders, offering support, reviewing mailbox information, preparing actions, and applying verified confirmations.

All tool inputs are validated again when they run. Read-only, untrusted-content, and consequential annotations expose the relevant safety boundaries to compatible agents. State revisions prevent an old action plan from being approved after the household information changes. If tool registration fails, CareWeave rolls back the attempted set instead of claiming a partial connection is ready.

The touch interface, voice experience, and WebMCP tools call the same domain functions. There is one state for the person and the agent, not separate implementations that can quietly disagree.

We used Leaflet and OpenStreetMap for routes, Open-Meteo for privacy-conscious forecasts, browser speech features, and an optional OpenAI Realtime voice path. An optional server-side Gmail connection reads bounded previews and creates drafts, but it cannot send email.

The challenge experience uses deterministic fictional data stored on the device. It needs no account, credentials, API key, or private information. Unit tests, Playwright interaction and accessibility tests, and a browser-based WebMCP evaluation cover the core workflows. The production-host smoke run completed all 10 expected tool steps across six journeys.

## Challenges we ran into

The hardest challenge was making the interface tell the truth about real world state.

In ordinary software, "requested," "drafted," and "confirmed" can blur together. In care coordination, that ambiguity matters. Someone could leave at the wrong time or believe help is arranged when it is not. We created an explicit appointment lifecycle and made every consequential action pass through a frozen, expiring review plan.

We also had to find the right boundary for agency. A single powerful tool would have been easier to demonstrate, but harder for a person to understand or interrupt. We chose narrow tools that can be inspected, combined, and stopped at meaningful human decision points.

The next challenge was keeping a broad care story visually calm. Every extra status, button, and warning adds cognitive work. We reduced density, enlarged targets, revealed details progressively, tested tablet and phone layouts, and kept spoken information available as text.

## Accomplishments that we're proud of

We are proud that WebMCP changes the actual CareWeave experience. The agent does not merely describe the page. It understands structured care context, reasons across it, and brings the person to the same date, appointment, or route being discussed.

We built an end-to-end appointment workflow that remains truthful at every step. CareWeave can interpret an attention item, assess the week, find calmer options, prepare the exact clinic request, show it for review, and record the result without silently changing the confirmed appointment.

We are equally proud of the social model. Supporters can be useful without becoming supervisors. Privacy is limited by purpose, help can be revoked, and the person at the centre retains the final say.

The working build exposes 32 validated WebMCP tools, shares domain logic across touch and agent interactions, protects changes with revisions, and passed all 10 steps in our production-host smoke evaluation. It also supports large text, high contrast, keyboard navigation, reduced motion, and responsive tablet and phone layouts.

## What we learned

We learned that autonomy is not a permission checkbox. It is the visible difference between offering help and taking over.

We also learned that truthful state is part of accessibility. People should not need technical knowledge to know whether an appointment has changed, a message has been sent, or a relative has accepted a task.

Structured tools help an agent understand a website. Shared visual focus helps a person understand the agent. CareWeave needs both. If the answer remains only in chat, the person still has to find the appointment, route, or reminder afterwards.

Finally, calmness has to be engineered. Every new capability carries a cognitive cost. The best interface is not the one that shows everything. It is the one that helps someone answer the next question with the least effort.

## What's next for CareWeave

The next step is to develop CareWeave with the people it is intended to support. We want to test the core experience with older and disabled people, unpaid family supporters, and professional carers, then adapt it to their language, routines, and access needs.

Before CareWeave handles real household or care data, it needs authenticated accounts, encrypted server-side storage, tested role-based permissions, strong consent and revocation flows, and independent privacy and security review. Live calendar and routing providers can then replace the challenge adapters, while Gmail remains limited and review-based.

We also want to work with organisations focused on independent living, disability access, recovery at home, and sustainable unpaid care. Their experience can help ensure that CareWeave solves real coordination problems rather than assumptions about them.

The long-term goal is not to automate a person's life. It is to return the time, confidence, and choice that fragmented systems take away.

CareWeave should make support easier to receive, easier to offer, and easier to trust, while keeping the person at the centre of every decision.
