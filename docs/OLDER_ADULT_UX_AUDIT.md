# Older-adult UX audit

Audit date: 2 September 2026  
Primary surface: 1024×768 wall-mounted iPad landscape  
Secondary surface: 390×844 mobile fallback

## Standard and method

The audit uses the W3C Web Accessibility Initiative's [guidance for older users](https://www.w3.org/WAI/older-users/), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), the [24×24 CSS pixel AA target minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), and the WAI guidance on [resizable text for older users](https://www.w3.org/WAI/older-users/developing/). CareWeave deliberately sets a stronger product floor of 44×44 pixels for visible controls and 14px for secondary prose.

Evidence came from four passes:

1. Source review of data semantics, copy, safety gates, focus behavior, and responsive CSS.
2. Programmatic measurement of visible text, controls, contrast, overflow, and region bounds.
3. Viewport screenshots of Day, Week, Attention, Food, Support, History, Route, Voice, Display, appointment review, support access, urgent help, and privacy-cover states.
4. Normal-input exploratory flows covering navigation, date changes, reminder acknowledgement/help, supporter assignment, scoped access, privacy hiding, grocery/preparation toggle cycles, reply drafting and discarding, appointment drafting and discarding, voice examples, settings, Escape, and focus return.

This is an expert standards and cognitive-walkthrough audit, not a substitute for moderated usability sessions with diverse older adults, carers, and people using assistive technology.

## Findings and repairs

| Area | Evidence before repair | Repair | Verified result |
|---|---|---|---|
| Text legibility | 22 visible labels or metadata strings rendered below 14px, several around 10–12px | Increased root scale and every secondary-text token; retained hierarchy without shrinking content | No visible prose below 14px; only the non-prose notification number is 12.96px |
| Touch accuracy | Date arrows flexed to 38px on iPad and 23px on mobile | Prevented flex shrink; mobile date chooser now gets a full-width row | No visible control below 44×44px on either audited viewport |
| Orientation | Primary heading said “Your day”; the full date was lower on the page | Changed the heading to “Today” and placed the full weekday/date directly beneath it | Day and date are visible before any interaction |
| Week overview | Seven columns produced 1092px content in a 1024px viewport and clipped Tuesday | Reframed it as a rolling “Next 7 days” view and arranged the days as four plus three readable cards; portrait uses two columns and phones use one | All seven days are readable without sideways scrolling |
| Wall-screen fit | Enlarged text pushed the third event under the fixed voice bar | Reduced decorative vertical spacing while preserving font and target sizes | Final event bottom: 690px; voice bar top: 692px |
| Text resizing | No in-app text control | Added persistent Comfortable/Extra large settings and verified 200% browser text reflow | No horizontal overflow at 200% text size |
| Contrast | Contrast preference existed only in the data model | Added an obvious Display control and persistent high-contrast mode | Automated text checks pass WCAG AA across all five main views |
| Keyboard and focus | Custom modal markup did not focus a safe action or return focus | Replaced overlays with native modal dialogs; focus defaults to the non-destructive action; Escape safely closes; focus returns to opener | Covered by browser regression tests |
| Voice promise | “Talk to CareWeave” opened an explanation but did not listen | Added browser push-to-talk for core commands, visible transcripts and responses, slower spoken feedback, tappable examples, and a plain ChatGPT fallback | Voice route example changes the shared board and gives an audible/visible leave time |
| Message comprehension | Copy called email “untrusted,” a security term without a user explanation | Reworded it: messages can be wrong or misleading, so CareWeave waits for review | Risk and protection are stated in everyday language |
| Truthful feedback | Sandbox state said `sent_demo`, which could imply a clinic received mail | Renamed it `saved_demo` and now labels the item “local suggestion — not sent” | A local suggestion cannot be mistaken for delivery confirmation |
| Slow review | Draft plans expired after 30 minutes | Increased expiry to two hours; state-revision checks still prevent stale execution | Less time pressure without weakening correctness |
| Misleading information | Header showed hard-coded sunny weather | Removed weather until a live, timestamped provider exists | No false travel/weather cue remains |
| Destructive recovery | Reset acted immediately | Added explicit reset confirmation | Accidental reset requires a second deliberate action |
| Stale information | A cached board could look current | Added current, delayed, and offline states to Today, Support, and agent tools | Reassurance is withheld when required feeds are stale or offline |
| Reminder overload | Plans had no acknowledgement or recovery loop | Added Done, Remind me later, and I need help only inside eligible event details | The everyday dayboard stays calm while help ownership is explicit |
| Shared-room privacy | Health details stayed visible on a wall iPad | Added a one-tap privacy cover that visually and semantically hides the board | Visitors and assistive technology cannot read covered content |
| Urgent confusion | The product had no explicit emergency boundary | Added direct supporter/emergency telephone handoff and states that CareWeave does not monitor emergencies | Help is reachable without implying detection or clinical coverage |

## Goal-fit assessment

CareWeave now matches the intended product rather than resembling a conventional calendar with larger fonts:

- General input becomes calm output: normalized email actions, health, care, food, shopping, and travel converge on the same dayboard.
- The first screen answers “What day is it?”, “What is happening?”, “What needs attention?”, and “Am I prepared?”
- A person can use touch or push-to-talk for the highest-frequency questions; spoken answers are also visible for hearing or memory support.
- Consequential actions remain two-stage. A request email cannot move or cancel a confirmed appointment, and the safest modal action receives focus first.
- Colour is supplementary: pacing, status, preparation, and category are also expressed with text or icons.
- There is no diagnosis, treatment advice, silent sending, disappearing appointment, or live-data claim backed only by demo content.

## Remaining validation before a household pilot

Before positioning this as production assistive technology, run moderated sessions with older adults across vision, dexterity, hearing, memory, and digital-confidence ranges. Test a mounted iPad at realistic viewing distance, VoiceOver, switch control, real room noise, real provider failure states, carer permissions, and the consent model for health-related data. The challenge build is now suitable for judging and structured usability testing; it does not claim clinical certification.

## Stricter repair pass — 2 September 2026

A second pass tested the full interface with axe-core, added portrait-iPad coverage, and repeated the most important interactions after hydration. It found and repaired issues that the initial metrics did not catch:

- The visible header exposed implementation status instead of user trust. It now says “Fictional demo” and “No real messages sent”; WebMCP details remain available only as diagnostic help text.
- “Confidence”, “protected review”, and “approve this plan” were system language. The interface now says where information came from, what needs review, and what the user is actually saving.
- “Your week” was a rolling seven-day period, not a calendar week. It is now accurately called “Next 7 days”.
- Seven narrow landscape columns split appointment names mid-word. The layout is now four readable day cards above three wider cards. Portrait uses two columns; phones use one.
- Portrait previously hid later days in a horizontal scroller. All days now follow the page’s normal vertical reading order.
- Reduced-motion mode stopped transitions but not the microphone pulse. It now disables both animations and transitions. Forced-colour users also receive explicit borders and focus outlines.
- A stale approval could fail without an explanation inside the modal. The review now remains open, announces “Nothing changed”, and explains that a fresh request is needed.
- Test automation could occasionally interact with server-rendered controls before hydration. The app exposes an explicit ready state so interaction tests wait for the live interface.

Automated result: zero axe-core WCAG A/AA findings in Day, Next 7 days, Attention, Food, Support, History, Display, Voice, support-access, urgent-help, and privacy-cover states. Product checks also enforce 44×44px controls, a 14px prose floor, AA text contrast, 200% text reflow, safe dialog focus, semantic privacy hiding, no landscape content behind the fixed voice bar, and no horizontal document overflow at 1024×768, 768×1024, or 390×844.

This result establishes standards conformance evidence and removes obvious expert-review barriers. It still does not prove usability for the target population. The required moderated validation is specified in `USABILITY_TEST_PLAN.md`.
