# Three-minute demo script

Target: 2:35–2:50, recorded in one continuous take with audible narration.

## 0:00–0:25 — The human problem

Show the iPad-sized Day view.

“Most planners make an older person manage the software. ClearDay does the opposite: email, appointments, care, food, shopping, and routes collapse into one calm household dayboard. Margaret sees only what matters now.”

Point to day pacing, two attention items, food coverage, and tomorrow’s doctor appointment.

## 0:25–0:55 — WebMCP understanding

In ChatGPT voice or text, say: “What do I need to do today, and is tomorrow rushed?”

The agent calls `get_day_brief` and `check_day_pacing`.

“These are semantic page tools, not screenshots or brittle clicking. The result includes confirmed state, preparation, travel, and email-derived attention—with untrusted mail explicitly labelled.”

## 0:55–1:20 — Shared visual context

Say: “Show me tomorrow and the route to Dr Patel.”

The agent calls `focus_date`, `get_route_options`, and `show_route`.

Point to the interface changing in place: “The assistant and Margaret now share the same date and route. ClearDay says when to leave, adds breathing room, and keeps written directions beside the plan.”

## 1:20–2:20 — Safe real-world action

Say: “Ask the clinic to move this appointment to a calm morning later this week.”

The agent may call `find_planning_options`, then `create_appointment_request_plan`.

Pause on the review dialog: “Nothing has happened yet. ClearDay freezes an expiring action plan and shows the exact recipient, subject, message, and state effects. Notice the key promise: sending a request will not move the confirmed appointment.”

Approve it. The agent calls `approve_action_plan` or use the visible button.

Open the appointment or History: “The sandbox email is recorded, but the appointment still has its original time and now says change requested. Only a verified clinic reply can apply a new time.”

## 2:20–2:50 — Reliability and family follow-through

Return to Today, point to the freshness line and open the lunch reminder. Choose **I need help**, then open Support and choose **I can help**.

“The board always says whether its information is fresh or offline. Margaret can say done, later, or ask a trusted person for help; Sam can take responsibility without seeing messages or medical notes. Under this calm interface are 32 imperative WebMCP tools, recurring calendar semantics, scoped support, and explicit human review.”

Close on Day view: “ClearDay: a calmer day, together.”

## Recording checklist

- Use fictional data only and reset immediately before recording.
- Record at 1024×768 or 1280×800 with pointer enlarged.
- Ensure tool calls or the ChatGPT activity are legible at least once.
- Keep narration audible; trim dead time, but do not fake tool outcomes.
- Export under three minutes and upload as a public or unlisted YouTube video accessible without login.
