# Gmail OAuth setup for CareWeave

CareWeave uses Google's OAuth 2.0 web-server flow. The Google client secret and refresh token are never exposed to browser JavaScript. The deployed Vercel Functions exchange and refresh tokens; the refresh token is encrypted with AES-256-GCM in an `HttpOnly`, `SameSite=Lax`, production-`Secure` cookie scoped to `/api/gmail`.

The integration can read recent Gmail message metadata/snippets and create drafts. It deliberately has no send endpoint.

## 1. Create the Google project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project for CareWeave.
3. Open **APIs & Services → Library**.
4. Find **Gmail API** and enable it.

## 2. Configure the OAuth consent screen

1. Open **Google Auth Platform → Branding** and enter the app name, support email, and developer contact.
2. Choose **Internal** only if all intended users belong to the same Google Workspace organization. Otherwise choose **External**.
3. Set the application homepage to `https://care-weave.vercel.app/`. Add the final privacy-policy URL before requesting public verification.
4. Under **Data Access**, add exactly these scopes:

   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.compose`

5. While the app is in testing, add every Google account that may connect under **Audience → Test users**.

These Gmail scopes are restricted. A public external app normally needs Google's OAuth verification before arbitrary users can authorize it. Testing mode is appropriate for a private demonstration, but Google may limit test-user refresh-token lifetime; reconnect if authorization expires.

## 3. Create the OAuth client

1. Open **Google Auth Platform → Clients**.
2. Select **Create client → Web application**.
3. Add the exact authorized redirect URI:

   - Local development: `http://localhost:5173/api/gmail/callback`
   - Vercel production: `https://care-weave.vercel.app/api/gmail/callback`

4. Save the client ID and client secret. Do not put either value in client-side code.

Google requires the redirect URI to match exactly, including protocol, host, path, case, and trailing slash. Prefer a stable production or custom domain instead of registering every preview deployment.

## 4. Configure Vercel

In **Vercel → Project → Settings → Environment Variables**, add these as sensitive values for Production:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI=https://care-weave.vercel.app/api/gmail/callback`
- `GMAIL_TOKEN_ENCRYPTION_KEY` with at least 32 random characters

Generate a token-encryption secret locally, for example:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Redeploy after adding or changing environment variables.

For local development, copy `.env.example` to `.env`, add the development credentials, and set:

```dotenv
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5173/api/gmail/callback
```

Never commit `.env`.

## 5. Connect and test

1. Open [CareWeave on Vercel](https://care-weave.vercel.app/) and choose **Attention**.
2. Choose **Connect Gmail**.
3. Select the intended Google account and approve the two requested Gmail scopes.
4. After returning to CareWeave, choose **Check Gmail**.
5. Open an imported review item and choose **Prepare reply**.
6. Review the exact recipient, subject, and body, then choose **Create Gmail draft**.
7. Open Gmail and verify that the item exists in Drafts and was not sent.
8. Use **Disconnect** in CareWeave and verify that a subsequent Gmail check requires reconnection.

## Security and production limitations

- Email content is treated as untrusted data and cannot directly approve actions.
- The browser cookie avoids a database for a private, single-household deployment. A multi-user production service still needs account authentication, server-side token storage keyed to the authenticated user, device/session revocation, audit retention, deletion/export controls, and a reviewed privacy policy.
- Rotate `GMAIL_TOKEN_ENCRYPTION_KEY` to invalidate every existing CareWeave Gmail session.
- OAuth approval is separate from OpenAI Realtime voice. `OPENAI_API_KEY` remains a different Vercel server secret.

Primary references: [Google OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server), [Gmail authorization](https://developers.google.com/workspace/gmail/api/auth/web-server), and [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes).
