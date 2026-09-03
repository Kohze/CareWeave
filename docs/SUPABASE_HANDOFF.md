# CareWeave Supabase handoff

> [!IMPORTANT]
> This is a post-challenge production roadmap. Do not merge Supabase/Auth into
> the judged submission branch before the hackathon. The current account-free,
> fictional, device-local demo is intentional: it gives judges an immediate,
> deterministic WebMCP path with no credentials or setup. Creating the project
> and testing this migration separately is fine; integrate it after judging.

This document is the setup contract for adding authenticated, cross-device
synchronization to CareWeave. It is intentionally smaller than a fully
normalized care platform: the existing, tested `AppData` document remains the
domain model, while Supabase provides identity, persistence, revision control,
Realtime delivery, and an append-only audit trail.

## Outcome

The same signed-in owner can open CareWeave on an iPad and in a
WebMCP-compatible ChatGPT browser. A confirmed change on either device is
persisted and appears on the other device. Browser `localStorage` becomes an
offline cache rather than the source of truth.

This setup must not make Gmail tokens, message snippets, medical notes, or the
full household document visible to supporters or unauthenticated users.

## Copy-paste task for the setup agent

> Set up a Supabase project for CareWeave by following
> `docs/SUPABASE_HANDOFF.md`. Apply the schema as a versioned migration,
> configure Auth redirects and Realtime, and run the listed authorization and
> revision-conflict tests. Do not integrate or redesign the CareWeave UI yet.
> Return only the non-secret values and confirmations listed in "Information
> to return." Put secret keys, database credentials, and encryption keys
> directly into the appropriate Vercel/local environment settings; never paste
> those values into chat or commit them.

## Recommended project choices

- Create one Supabase project in the EU region nearest the expected household.
- Use the current publishable and secret API keys, not new dependencies on the
  legacy `anon` and `service_role` JWT keys.
- Enable email OTP or magic-link authentication for the first version.
- Enable Supabase Anonymous Sign-Ins for the "Try the demo" path, together
  with Cloudflare Turnstile or an invisible CAPTCHA and a conservative
  anonymous-signup rate limit.
- Do not grant the database `anon` role access to household data. A Supabase
  anonymous Auth user is a unique authenticated user and is not the same as
  an unauthenticated request using the publishable key.
- Configure the Auth Site URL as `https://care-weave.vercel.app`.
- Add redirect URLs for:
  - `http://localhost:5173/auth/callback`
  - `https://care-weave.vercel.app/auth/callback`
- If reliable external testing is needed, configure custom SMTP. Supabase's
  default mail service should not be treated as production email delivery.

Gmail OAuth remains a separate Google authorization flow. Signing into
CareWeave through Supabase does not itself grant Gmail scopes.

## Required environment variables

Add these locally and in Vercel:

```dotenv
# Safe to expose to browser code.
PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<value>

# Server-side only. Add directly in Vercel; never prefix with PUBLIC_ or VITE_.
SUPABASE_SECRET_KEY=sb_secret_<value>

# Existing CareWeave secret, retained for application-layer encryption of
# Gmail refresh tokens. Use a random value of at least 32 bytes.
GMAIL_TOKEN_ENCRYPTION_KEY=<existing-random-secret>
```

A direct database or pooler URL is not required for the initial integration.
If a later server implementation needs it, store it only as
`SUPABASE_DATABASE_URL` in Vercel and never expose it to client code.

Do not paste `SUPABASE_SECRET_KEY`, a database password, or
`GMAIL_TOKEN_ENCRYPTION_KEY` into an issue, commit, screenshot, or chat. The
project URL and publishable key are designed for client use and are safe to
share with the integration agent.

## Initial database migration

Apply this through a versioned Supabase migration. Do not rely only on manual
Dashboard table creation.

```sql
create extension if not exists pgcrypto;

create schema if not exists private;

create type public.household_role as enum ('owner', 'supporter', 'carer');
create type public.membership_status as enum ('active', 'invited', 'revoked');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.household_role not null,
  status public.membership_status not null default 'active',
  permissions text[] not null default '{}',
  access_starts_at timestamptz,
  access_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- `data` is exactly the version-1 AppData object from src/lib/types.ts.
create table public.household_state (
  household_id uuid primary key references public.households(id) on delete cascade,
  schema_version smallint not null default 1 check (schema_version > 0),
  revision bigint not null default 1 check (revision >= 1),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint household_state_document_valid check (coalesce(
    jsonb_typeof(data) = 'object'
    and data ->> 'version' = '1'
    and jsonb_typeof(data -> 'revision') = 'number'
    and (data ->> 'revision')::numeric = revision::numeric
    and octet_length(data::text) <= 1000000,
    false
  ))
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  revision bigint not null check (revision >= 0),
  action text not null check (char_length(action) between 1 and 100),
  summary text not null check (char_length(summary) between 1 and 500),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index household_members_user_idx
  on public.household_members (user_id, status);
create index audit_events_household_created_idx
  on public.audit_events (household_id, created_at desc);

-- Server-only. Values must already be encrypted by the application with
-- AES-256-GCM before insertion. Never store a plaintext refresh token.
create table public.oauth_connections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('gmail')),
  provider_account_id text,
  email text,
  encrypted_refresh_token text not null,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, provider)
);

revoke all on public.oauth_connections from anon, authenticated;
grant all on public.oauth_connections to service_role;
```

The new Supabase secret key acts with the elevated server role even though the
SQL role is still named `service_role`.

## Auth profile trigger

Create the application profile automatically when Supabase Auth creates a
user. This keeps clients from needing permission to insert arbitrary profile
rows.

```sql
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    case
      when new.is_anonymous then 'CareWeave guest'
      else coalesce(
        left(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 120),
        nullif(split_part(new.email, '@', 1), ''),
        'CareWeave member'
      )
    end
  );
  return new;
end;
$$;

create trigger profile_on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

revoke all on function private.handle_new_user() from public;
```

## Authorization helpers

Keep policy helpers outside exposed schemas, pin `search_path`, and qualify all
relation names.

```sql
create or replace function private.is_active_member(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members m
    where m.household_id = target_household
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and (m.access_starts_at is null or m.access_starts_at <= now())
      and (m.access_expires_at is null or m.access_expires_at > now())
  );
$$;

create or replace function private.is_owner(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.households h
    where h.id = target_household
      and h.owner_user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_active_member(uuid) from public;
revoke all on function private.is_owner(uuid) from public;
revoke all on schema private from public;
grant usage on schema private to authenticated;
grant execute on function private.is_active_member(uuid) to authenticated;
grant execute on function private.is_owner(uuid) to authenticated;
```

## Owner membership trigger

The trigger ensures a newly inserted household always has one active owner.
It is not exposed as a remotely callable security-definer function.

```sql
create or replace function private.add_household_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.household_members (
    household_id,
    user_id,
    role,
    status,
    permissions
  ) values (
    new.id,
    new.owner_user_id,
    'owner',
    'active',
    array[
      'view_schedule',
      'view_care_status',
      'view_food_status',
      'view_attention_count',
      'suggest_help',
      'respond_to_help'
    ]
  );
  return new;
end;
$$;

create trigger household_owner_after_insert
after insert on public.households
for each row execute function private.add_household_owner();

revoke all on function private.add_household_owner() from public;
```

## Row-level security

The full JSON document contains private inbox-derived content. Only the owner
may read or replace it. Supporter and carer experiences must later use a
server-produced, privacy-limited projection rather than direct access to
`household_state.data`.

```sql
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_state enable row level security;
alter table public.audit_events enable row level security;
alter table public.oauth_connections enable row level security;

create policy profiles_select_self
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy profiles_update_self
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy households_select_member
on public.households for select to authenticated
using ((select private.is_active_member(id)));

create policy households_insert_owner
on public.households for insert to authenticated
with check (
  (select auth.uid()) is not null
  and owner_user_id = (select auth.uid())
);

create policy households_update_owner
on public.households for update to authenticated
using ((select private.is_owner(id)))
with check (
  (select private.is_owner(id))
  and owner_user_id = (select auth.uid())
);

create policy household_members_select_self_or_owner
on public.household_members for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_owner(household_id))
);

create policy household_state_select_owner
on public.household_state for select to authenticated
using ((select private.is_owner(household_id)));

create policy household_state_insert_owner
on public.household_state for insert to authenticated
with check (
  (select private.is_owner(household_id))
  and schema_version = 1
  and revision = 1
  and updated_by = (select auth.uid())
);

create policy audit_events_select_owner
on public.audit_events for select to authenticated
using ((select private.is_owner(household_id)));

-- Browser clients can read only the rows allowed above. Initial household and
-- state creation remain possible, but state updates and audit inserts must go
-- through the save RPC below.
revoke all on public.profiles from anon, authenticated;
revoke all on public.households from anon, authenticated;
revoke all on public.household_members from anon, authenticated;
revoke all on public.household_state from anon, authenticated;
revoke all on public.audit_events from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, insert on public.households to authenticated;
grant update (name) on public.households to authenticated;
grant select on public.household_members to authenticated;
grant select, insert on public.household_state to authenticated;
grant select on public.audit_events to authenticated;
```

Do not add any `anon using (true)` household policy. Do not create a policy that
lets all active supporters select the full `household_state` row.

## Anonymous demo users

The "Try the demo" button calls `signInAnonymously()`. On first sign-in, create
one new household owned by that anonymous user's `auth.uid()` and seed only
fictional `createSeedData()` content. Never point anonymous users at a shared
demo household.

Anonymous users use the `authenticated` Postgres role, so the existing owner
policies isolate them by user ID. Use the JWT `is_anonymous` claim for the
additional restrictions below:

- Do not allow Gmail connection, Gmail reads/drafts, supporter invitations,
  external notifications, exports, or other side effects.
- Voice may be enabled for the demo only after the session endpoint verifies
  the Supabase JWT and applies durable limits by both user ID and IP address.
- Label the session as a temporary demo and explain that signing out, clearing
  browser data, or moving to another device loses access unless the user first
  links an email identity.
- To keep the same household, upgrade the current anonymous user with
  `updateUser({ email })` and email verification. Do not create a second user
  and guess how to merge households.
- Never merge an anonymous household into an existing account automatically;
  require reauthentication and an explicit conflict-resolution flow.

Supabase does not automatically delete abandoned anonymous accounts. Schedule
a daily server-side cleanup that deletes anonymous `auth.users` older than 30
days. The cascading foreign keys remove their fictional profiles and
households. Do not apply age-only deletion to permanent users.

## Atomic revision update

Every write must supply the revision it was based on. This preserves
CareWeave's existing stale-plan protection when two devices act concurrently.

```sql
create or replace function public.save_household_state(
  p_household_id uuid,
  p_expected_revision bigint,
  p_data jsonb,
  p_action text,
  p_summary text
)
returns public.household_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.household_state;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if not private.is_owner(p_household_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not coalesce(
    p_data is not null
    and jsonb_typeof(p_data) = 'object'
    and p_data ->> 'version' = '1'
    and jsonb_typeof(p_data -> 'revision') = 'number'
    and (p_data ->> 'revision')::numeric = (p_expected_revision + 1)::numeric
    and octet_length(p_data::text) <= 1000000,
    false
  ) then
    raise exception 'invalid_household_state' using errcode = '22023';
  end if;

  if p_action is null or btrim(p_action) = ''
     or p_summary is null or btrim(p_summary) = '' then
    raise exception 'invalid_audit_description' using errcode = '22023';
  end if;

  update public.household_state
  set data = p_data,
      revision = revision + 1,
      updated_at = now(),
      updated_by = (select auth.uid())
  where household_id = p_household_id
    and revision = p_expected_revision
  returning * into saved;

  if saved.household_id is null then
    raise exception 'stale_or_forbidden' using errcode = '40001';
  end if;

  insert into public.audit_events (
    household_id,
    actor_user_id,
    revision,
    action,
    summary
  ) values (
    saved.household_id,
    (select auth.uid()),
    saved.revision,
    left(btrim(p_action), 100),
    left(btrim(p_summary), 500)
  );

  return saved;
end;
$$;

revoke execute on function public.save_household_state(uuid, bigint, jsonb, text, text)
  from public, anon;
grant execute on function public.save_household_state(uuid, bigint, jsonb, text, text)
  to authenticated;
```

The integration must treat SQLSTATE `40001` as a conflict: fetch the newest
row, show a plain-language message, and do not silently overwrite it.

The function is `security definer` because direct browser updates and audit
inserts are deliberately revoked. Its explicit authentication, ownership,
input, and revision checks are therefore mandatory. Keep its pinned empty
`search_path`, fully qualified relation names, and narrow execute grant.

## Realtime

Enable Postgres Changes only for the household state initially:

```sql
alter publication supabase_realtime add table public.household_state;
```

Before applying that statement twice, check
`pg_publication_tables` or use the Dashboard publication toggle. Realtime uses
the subscriber's RLS permissions, so a signed-out or non-owner client must not
receive the row.

The client subscription must listen to `UPDATE` events only and be filtered by
the exact household UUID. Do not subscribe to `DELETE`: Supabase cannot apply
RLS to Postgres Changes delete records. Account deletion is handled through a
server-confirmed sign-out/account-removed state instead.

Accept an incoming document only when:

- `schema_version` is supported;
- `data.version === 1`;
- the incoming revision is greater than the local revision; and
- the payload passes runtime validation.

## Gmail OAuth migration

The current challenge build stores an encrypted Gmail refresh token in a
browser-specific `HttpOnly` cookie. Cross-device Gmail requires this change:

1. Verify the Supabase user session in every `/api/gmail/*` Vercel Function.
   Use a cryptographically verified claim/user lookup for authorization, not
   an unvalidated session object.
2. Keep OAuth state and PKCE verifier in a short-lived secure cookie.
3. On callback, encrypt the Google refresh token with
   `GMAIL_TOKEN_ENCRYPTION_KEY` and upsert `oauth_connections` using the
   server-only Supabase secret key.
4. Key the connection to both authenticated `user_id` and `household_id`.
5. Read/decrypt tokens only inside Vercel Functions.
6. On disconnect, revoke the Google token, set `revoked_at`, and erase the
   encrypted token value or delete the row.
7. Continue exposing only `gmail.readonly` and `gmail.compose`; do not add a
   send endpoint.
8. For draft creation, accept a plan ID rather than an arbitrary recipient and
   body. Server-side, reload that owner's current state, verify the unexpired
   draft plan and revision, and create exactly the displayed payload. Record an
   idempotency key before calling Gmail so retries cannot create duplicates.

Browser code must never be able to select `oauth_connections`, even for its
own user.

## Deployment security gates

Before using real household or Gmail data:

- Require a verified Supabase JWT on `/api/realtime/session` and every
  `/api/gmail/*` endpoint. Derive the user ID from that JWT; never accept a
  user, supporter, or carer ID as proof of identity.
- Deny Gmail and all external side effects when the JWT has
  `is_anonymous: true`.
- Put durable IP-and-user quotas on anonymous signup, voice sessions, state
  writes, and Gmail operations. The existing in-memory Vercel voice limiter is
  only defense in depth.
- Add a restrictive Content Security Policy with exact Supabase, OpenAI
  Realtime, map-tile, and asset origins plus `frame-ancestors 'none'`. Avoid
  `unsafe-inline` and `unsafe-eval` where the production build permits.
- Do not let the service worker cache `/auth/*`, pages containing user-specific
  SSR output, Supabase responses, or any `/api/*` response. On sign-out, remove
  sensitive local-storage state and private caches before showing another
  account.
- Validate the full `AppData` payload at runtime before displaying or acting
  on database or Realtime data. The JSONB shape/size check is not a domain
  schema validator.
- Redact OAuth codes, access/refresh tokens, cookies, authorization headers,
  email bodies, and secret keys from application and Vercel logs.

## CareWeave integration work after setup

The setup agent does not need to rewrite the application, but should leave the
project ready for these changes:

1. Install `@supabase/supabase-js` and `@supabase/ssr`.
2. Replace the current `adapter-static` plus `prerender = true` configuration
   with a Vercel server-capable SvelteKit deployment before adding cookie-based
   SSR clients and `/auth/callback`. Cookie SSR does not run inside a fully
   prerendered static application. Migrate the standalone API handlers into
   authenticated SvelteKit server routes or verify the final Vercel routing
   layout has no conflicts.
3. Add a minimal sign-in/onboarding screen with "Sign in" and "Try the
   demo" (`signInAnonymously`) choices.
4. Create one household and insert `createSeedData()` as its first
   `household_state.data` value.
5. Load Supabase state during initialization; use local storage only as a
   validated cache/fallback.
6. Change the domain mutation boundary to call `save_household_state` with the
   current revision.
7. Subscribe to the exact household-state row and apply newer remote versions.
8. Make all WebMCP writes await server persistence before reporting success.
9. Display offline, saving, saved, and conflict states truthfully.
10. Keep the existing action-plan confirmation and appointment verification
    invariants unchanged.
11. Register tools only after authentication is resolved. Select the inventory
    from the verified account role, and derive supporter/carer identity on the
    server rather than accepting a person ID as identity proof.

For the first cross-device milestone, authenticate only the household owner. A
demo guest is the owner of their own temporary, fictional household; they are
not a supporter in someone else's household. Do not expose the current
family-support demo as a real multi-user feature until a privacy-limited
support projection and role-specific server mutations have been implemented.

## Required tests

- An unauthenticated client cannot read or write any household row.
- Two anonymous testers receive different user IDs and cannot read, subscribe
  to, or update each other's disposable households.
- An anonymous tester cannot connect Gmail or invoke any external side effect.
- Anonymous signup is protected by CAPTCHA/Turnstile and rate limiting.
- Cleanup deletes only stale anonymous users and their cascading fictional
  data, never permanent accounts.
- User A cannot read, subscribe to, or update User B's household.
- An owner can read and update their state.
- A stale expected revision is rejected and does not add an audit event.
- A successful update increments the revision exactly once and creates one
  audit event.
- A supporter cannot read the full JSON document.
- Realtime delivers an owner's update to a second signed-in browser.
- Signing out removes the subscription and clears sensitive cached state.
- Gmail token rows cannot be queried with the publishable key.
- Gmail callback and draft endpoints reject missing or mismatched Supabase
  sessions.
- No browser bundle contains a Supabase secret key, database password, Google
  client secret, Gmail token-encryption key, or OpenAI API key.

## Information to return to the CareWeave integration agent

Return only:

- Supabase project reference.
- `PUBLIC_SUPABASE_URL`.
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Production Vercel domain.
- Auth method enabled (email OTP or magic link).
- Confirmation that Anonymous Sign-Ins and CAPTCHA/Turnstile are enabled.
- Anonymous-signup rate limit and cleanup schedule.
- Confirmation that both callback URLs are allow-listed.
- Migration filename/commit and confirmation it applied successfully.
- Confirmation that `household_state` is in `supabase_realtime`.
- Results of the RLS and revision-conflict tests.

Place `SUPABASE_SECRET_KEY` directly in Vercel and local `.env`; report only
that it was configured. Do the same for database credentials and encryption
keys. Never send their values back in chat.

## Acceptance criteria

Setup is complete when two browsers signed into the same owner account can
load the same household row, an update with the correct revision is persisted
and broadcast, a stale update is rejected, another account sees no data, and
no elevated secret has entered client code or source control.

## Official references

- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- SvelteKit SSR auth: https://supabase.com/docs/guides/auth/server-side
- Realtime Postgres Changes: https://supabase.com/docs/guides/realtime/postgres-changes
- Database functions: https://supabase.com/docs/guides/database/functions
