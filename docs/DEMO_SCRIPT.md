# Three-minute demo script

Target: 2:35–2:50, recorded in one continuous take with audible narration. Use
the production URL in ChatGPT's in-app browser, signed out of CareWeave; no
CareWeave account or setup is required.

## 0:00–0:25 — The human problem

Show the iPad-sized Day view.

“Most planners make an older person manage the software. CareWeave does the opposite: email, appointments, care, food, shopping, and routes collapse into one calm household dayboard. The person sees only what matters now.”

Point to day pacing, two attention items, food coverage, and tomorrow’s doctor appointment.

## 0:25–0:55 — WebMCP understanding

In ChatGPT text, say: “What do I need to do today, and is tomorrow rushed?”

The agent calls `get_day_brief` and `check_day_pacing`.

“These are semantic page tools, not screenshots or brittle clicking. The result includes confirmed state, preparation, travel, and email-derived attention—with untrusted mail explicitly labelled.”

## 0:55–1:20 — Shared visual context

Say: “Show me tomorrow and the route to Dr Patel.”

The agent calls `focus_date`, `get_route_options`, and `show_route`.

Point to the interface changing in place: “The person and assistant now share the same date and route. CareWeave says when to leave, adds breathing room, and keeps written directions beside the plan.”

## 1:20–2:20 — Safe real-world action

Say: “Ask the clinic to move this appointment to a calm morning later this week.”

The agent may call `find_planning_options`, then `create_appointment_request_plan`.

Pause on the review dialog: “Nothing has happened yet. CareWeave freezes an expiring action plan and shows the exact recipient, subject, and message. Without Gmail this remains a local suggestion; with Gmail it becomes a real draft, but it is never sent automatically.”

Approve it. The agent calls `approve_action_plan` or use the visible button.

Open History: “The suggestion or Gmail draft is recorded as not sent, and the appointment remains confirmed at its original time. Only verified external confirmation can apply a new time.”

## 2:20–2:50 — Trust and close

Keep the original confirmed appointment and the approved local suggestion visible in History.

“CareWeave preserves the difference between requested and confirmed. The agent did useful work across structured tools and the shared interface, but the person kept control of the real-world consequence. This is not chat attached to a calendar; it is a trustworthy surface where a person and agent can understand, focus, and prepare together.”

Close on Day view: “CareWeave: everyday care, woven together.”

## Recording checklist

- Use fictional data only and reset immediately before recording.
- Record at 1024×768 or 1280×800 with pointer enlarged.
- Ensure tool calls or the ChatGPT activity are legible at least once.
- Show the production URL and the no-login first run.
- Keep narration audible; trim dead time, but do not fake tool outcomes.
- Export under three minutes and upload as a public or unlisted YouTube video accessible without login.
