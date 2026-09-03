import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	buildRawDraft,
	gmailOAuthInternals,
	handleGmailAuth,
	handleGmailDrafts,
	handleGmailMessages,
	handleGmailStatus
} from '../../server/gmail-oauth';

const originalEnv = { ...process.env };

function configure(): void {
	process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
	process.env.GOOGLE_CLIENT_SECRET = 'server-only-client-secret';
	process.env.GMAIL_TOKEN_ENCRYPTION_KEY = 'a-test-encryption-secret-with-more-than-32-characters';
	delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
}

function tokenCookie(): string {
	const sealed = gmailOAuthInternals.seal({
		version: 1,
		refreshToken: 'refresh-token',
		email: 'owner@example.com',
		scopes: gmailOAuthInternals.GMAIL_SCOPES,
		connectedAt: '2026-09-03T10:00:00.000Z'
	});
	return `${gmailOAuthInternals.TOKEN_COOKIE}=${encodeURIComponent(sealed)}`;
}

beforeEach(() => configure());

afterEach(() => {
	vi.unstubAllGlobals();
	process.env = { ...originalEnv };
});

describe('Gmail OAuth server boundary', () => {
	it('creates a PKCE authorization redirect and an HttpOnly state cookie', async () => {
		const response = await handleGmailAuth(new Request('https://clearday.example/api/gmail/auth'));
		const location = new URL(response.headers.get('location')!);
		expect(response.status).toBe(302);
		expect(location.origin).toBe('https://accounts.google.com');
		expect(location.searchParams.get('redirect_uri')).toBe('https://clearday.example/api/gmail/callback');
		expect(location.searchParams.get('code_challenge_method')).toBe('S256');
		expect(location.searchParams.get('scope')).toContain('gmail.readonly');
		expect(location.searchParams.get('scope')).toContain('gmail.compose');
		expect(location.toString()).not.toContain(process.env.GOOGLE_CLIENT_SECRET!);
		expect(response.headers.get('set-cookie')).toContain('HttpOnly');
		expect(response.headers.get('set-cookie')).toContain('Secure');
	});

	it('reports configuration and connection without exposing the refresh token', async () => {
		const response = await handleGmailStatus(new Request('https://clearday.example/api/gmail/status', {
			headers: { cookie: tokenCookie() }
		}));
		const body = await response.json();
		expect(body).toMatchObject({ configured: true, connected: true, email: 'owner@example.com' });
		expect(JSON.stringify(body)).not.toContain('refresh-token');
	});

	it('rejects cross-origin draft creation before calling Google', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const response = await handleGmailDrafts(new Request('https://clearday.example/api/gmail/drafts', {
			method: 'POST',
			headers: { origin: 'https://attacker.example', 'content-type': 'application/json', cookie: tokenCookie() },
			body: JSON.stringify({ to: 'clinic@example.com', subject: 'Hello', body: 'Test' })
		}));
		expect(response.status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('creates a Gmail draft but never calls the send endpoint', async () => {
		const fetchMock = vi.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'short-lived-access-token' }), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'draft-1', message: { id: 'message-1' } }), { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		const response = await handleGmailDrafts(new Request('https://clearday.example/api/gmail/drafts', {
			method: 'POST',
			headers: { origin: 'https://clearday.example', 'content-type': 'application/json', cookie: tokenCookie() },
			body: JSON.stringify({ to: 'clinic@example.com', subject: 'Appointment', body: 'Please offer another time.' })
		}));
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ created: true, draftId: 'draft-1' });
		expect(String(fetchMock.mock.calls[1][0]).endsWith('/drafts')).toBe(true);
		expect(String(fetchMock.mock.calls[1][0])).not.toContain('/send');
	});

	it('normalizes Gmail metadata and marks it untrusted', async () => {
		const fetchMock = vi.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access-1' }), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ messages: [{ id: 'abc' }] }), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({
				id: 'abc', internalDate: '1788429600000', snippet: 'Please confirm your new appointment time.',
				payload: { headers: [
					{ name: 'From', value: 'Clinic <clinic@example.com>' },
					{ name: 'To', value: 'owner@example.com' },
					{ name: 'Subject', value: 'Appointment moved' }
				] }
			}), { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		const response = await handleGmailMessages(new Request('https://clearday.example/api/gmail/messages?limit=1', {
			headers: { cookie: tokenCookie() }
		}));
		const body = await response.json();
		expect(body.messages[0]).toMatchObject({ id: 'gmail-abc', provider: 'gmail', subject: 'Appointment moved', untrusted: true });
	});
});

describe('Gmail draft encoding', () => {
	it('keeps subject line breaks from becoming injected headers', () => {
		const raw = buildRawDraft({ to: 'clinic@example.com', subject: 'Hello\r\nBcc: attacker@example.com', body: 'Safe body' });
		const decoded = Buffer.from(raw, 'base64url').toString('utf8');
		expect(decoded).not.toContain('\r\nBcc:');
		expect(decoded).toContain('Safe body');
	});
});
