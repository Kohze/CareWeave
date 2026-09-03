# Security and production integration

## Conversational voice

The wall-display voice path uses an OpenAI Realtime WebRTC call. `OPENAI_API_KEY` stays in the Vite development server or Vercel Function and is never included in client code. The browser sends its SDP offer to the same-origin function and receives only the SDP answer. The interface tells the user when the session is connected and that OpenAI processes speech while it is active. Closing the dialog or choosing **End conversation** stops microphone tracks, closes the data channel, and closes the peer connection.

The Vercel endpoint rejects missing or foreign origins, accepts only bounded `application/sdp` requests, returns non-cacheable responses, and applies a lightweight per-client limit within each warm function instance. Deployment must also add a distributed Vercel Firewall rate-limit rule because an in-memory serverless limit is not global and a request `Origin` header is not authentication. Store the key as a Production Secret in the Vercel project, use a dedicated OpenAI project for this app, monitor usage, and rotate the key after the judging period.

Realtime receives a 23-tool subset of the same narrow schemas and domain handlers used by WebMCP. Final approval, externally confirmed time changes or cancellations, undo, reset, and supporter/carer role writes are omitted from the voice inventory and rejected by the dispatcher if a model invents a call. Moving or cancelling an appointment therefore creates only a visible draft plan; sending and confirmed reconciliation remain deliberate touch or reviewed-host actions.

The role-scoped `suggest_support`, `respond_to_help_request`, `record_care_visit_status`, and `update_support_offer_fulfillment` tools are also withheld from the wall-display voice session. That session represents the older adult and must not be able to impersonate a relative or professional carer. Read-only support state remains available through dedicated projections.

## Trusted-circle boundary

The challenge build contains a fictional active membership for Sam so the family-support flow can be demonstrated. `get_support_overview` passes through a dedicated projection that returns only permissioned schedule fields, care-visit status, food coverage, preparation counts, help requests, and offer state. It deliberately omits email contents, source records, medical notes, checklist labels, and detailed carer notes. Even the number of attention items is private unless the owner grants that specific scope.

`suggest_support` verifies that the named person is active and has `suggest_help`. It creates a proposal and an attention item; it does not change a commitment, contact a clinic, or imply the older adult's consent. Only the older-adult interface can accept or decline the offer. The setup sheet demonstrates invitation state, narrow permissions, expiry, preview, and revocation locally, but it sends no invitation and grants no real account access. Production must derive every supporter/carer identity from an authenticated session, enforce revocation server-side on every device, verify contacts, and retain server-side consent and audit records.

Reminder responses and care status also stay deliberately narrow. A reminder can be done, snoozed, or turned into an ordinary help request; it never claims medication adherence or emergency escalation. A care update requires the named fictional carer to be assigned to the visit, accepts only a recent observation timestamp, and cannot regress a completed visit. Those checks demonstrate policy, not real professional identity.

Before a public production launch beyond the challenge, put the Realtime and Gmail endpoints behind household authentication, platform-wide abuse protection, usage caps, and auditable consent. Bundled fictional messages and locally saved suggestions are never transmitted to Gmail; only a user-reviewed Gmail-mode plan can create a provider draft.

## Challenge threat model

Mailbox text is adversarial input. It can contain false dates, impersonated senders, or prompt-injection instructions. CareWeave therefore returns only marked, minimal summaries; declares `untrustedContentHint`; keeps provenance; and never lets source text choose recipients, tools, or approval state.

Consequential steps are staged:

1. A narrow tool validates IDs and bounded input.
2. CareWeave creates an expiring action plan against a state revision.
3. The visible dialog shows the exact recipient, subject, body, status effects, and warnings.
4. Explicit approval executes that exact plan. A stale revision fails closed.
5. The result reports affected IDs, the new revision, and what still awaits confirmation.

Every WebMCP and Realtime handler also validates the input against the narrow advertised schema at execution time. Registration is sequential and uses one abort signal; if the host rejects any definition, CareWeave withdraws the attempted set and reports zero connected tools instead of presenting a partial connection as healthy.

## Production boundaries

The static client contains no OAuth secrets or provider tokens. The optional Gmail path uses Vercel Functions for OAuth code exchange, token refresh, recent-message retrieval, revocation, and draft creation. The refresh token is encrypted with AES-256-GCM in an `HttpOnly`, `SameSite=Lax`, production-`Secure` cookie scoped to `/api/gmail`; browser JavaScript receives only connection metadata, normalized message previews, and draft identifiers. OAuth state plus PKCE protect the callback flow, and write endpoints require a same-origin request.

The Gmail path deliberately exposes no send endpoint. It requests `gmail.readonly` and `gmail.compose`, imports at most 20 bounded message previews, treats every imported field as untrusted, and requires the visible plan dialog before creating a draft. Disconnecting attempts Google token revocation and clears the local encrypted token cookie.

This cookie-backed design avoids a database for a private, single-household deployment. A multi-user production service still needs authenticated accounts and an encrypted server-side token store keyed to the authenticated user, plus:

- Microsoft Graph OAuth if Outlook is supported.
- Calendar provider adapters with idempotency keys and provider event version checks.
- Recipient allow-lists or verified contact records for clinics, carers, and relatives.
- Server-side audit records, retention controls, account export/delete, and consent revocation.
- A route provider that returns accessibility-aware options and timestamps its traffic data.

## Map privacy and production use

The challenge build requests only the OpenStreetMap tiles visible after a person opens a route. It does not prefetch or download maps for offline use, and it keeps the required attribution visible. The seeded coordinates are fictional. A production household’s tile requests can reveal an approximate viewed area to the tile provider, so deployment needs explicit consent, a documented retention policy, and a contracted or self-hosted provider suitable for the expected traffic. The in-app highlighted line is demonstrative; Apple Maps supplies the full external walking-directions handoff until a production routing adapter is connected.
- Rate limits, CSRF protection, content security policy, dependency scanning, and secret rotation.

Provider writes must preserve the same request/confirmation distinction used by the demo. Email sending should require provider-native confirmation where available; failed or ambiguous responses must remain open loops, never optimistic success.

## Weather privacy

The privacy screen requests the current and daily forecast through CareWeave's same-origin `/api/weather` Vercel Function. It uses Open-Meteo, which requires no client or server API key. Before the request leaves CareWeave, household coordinates are rounded to two decimal places (roughly district-level precision); no name, event, email, or other schedule data is sent with the forecast request. The browser caches only the normalized visual forecast for one hour so the screen can degrade gracefully if the service is temporarily unavailable.

## Privacy posture

Store the minimum: normalized commitments, action summaries, provider IDs, and small provenance snippets. Do not replicate whole inboxes. Health-related data is sensitive; production rollout needs jurisdiction-specific legal review, a data-processing agreement, explicit household consent, and carefully scoped carer access.
