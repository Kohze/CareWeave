import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
	timingSafeEqual
} from 'node:crypto';

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GMAIL_SCOPES = [
	'https://www.googleapis.com/auth/gmail.readonly',
	'https://www.googleapis.com/auth/gmail.compose'
];
const FLOW_COOKIE = 'clearday_gmail_flow';
const TOKEN_COOKIE = 'clearday_gmail_token';
const MAX_BODY_BYTES = 24_000;

type GoogleTokenResponse = {
	access_token?: string;
	refresh_token?: string;
	expires_in?: number;
	scope?: string;
	error?: string;
	error_description?: string;
};

type GmailToken = {
	version: 1;
	refreshToken: string;
	email?: string;
	scopes: string[];
	connectedAt: string;
};

type OAuthFlow = {
	state: string;
	verifier: string;
	createdAt: number;
};

type GmailHeader = { name?: string; value?: string };
type GmailMessage = {
	id?: string;
	threadId?: string;
	internalDate?: string;
	snippet?: string;
	payload?: { headers?: GmailHeader[] };
};

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Cache-Control': 'no-store',
			'Content-Type': 'application/json; charset=utf-8',
			'X-Content-Type-Options': 'nosniff',
			...headers
		}
	});
}

function methodNotAllowed(allowed: string): Response {
	return json({ error: 'Method not allowed.' }, 405, { Allow: allowed });
}

function base64Url(value: Buffer): string {
	return value.toString('base64url');
}

function encryptionKey(): Buffer | undefined {
	const secret = process.env.GMAIL_TOKEN_ENCRYPTION_KEY?.trim();
	if (!secret || secret.length < 32) return undefined;
	return createHash('sha256').update(secret, 'utf8').digest();
}

function seal(value: unknown): string {
	const key = encryptionKey();
	if (!key) throw new Error('Gmail token encryption is not configured.');
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key, iv);
	const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
	const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	return [base64Url(iv), base64Url(cipher.getAuthTag()), base64Url(ciphertext)].join('.');
}

function unseal<T>(value: string | undefined): T | undefined {
	if (!value) return undefined;
	const key = encryptionKey();
	if (!key) return undefined;
	try {
		const [ivValue, tagValue, ciphertextValue, extra] = value.split('.');
		if (!ivValue || !tagValue || !ciphertextValue || extra) return undefined;
		const iv = Buffer.from(ivValue, 'base64url');
		const tag = Buffer.from(tagValue, 'base64url');
		if (iv.length !== 12 || tag.length !== 16) return undefined;
		const decipher = createDecipheriv('aes-256-gcm', key, iv);
		decipher.setAuthTag(tag);
		const plaintext = Buffer.concat([
			decipher.update(Buffer.from(ciphertextValue, 'base64url')),
			decipher.final()
		]);
		return JSON.parse(plaintext.toString('utf8')) as T;
	} catch {
		return undefined;
	}
}

function cookies(request: Request): Map<string, string> {
	const result = new Map<string, string>();
	for (const part of (request.headers.get('cookie') ?? '').split(';')) {
		const separator = part.indexOf('=');
		if (separator < 1) continue;
		const name = part.slice(0, separator).trim();
		const value = part.slice(separator + 1).trim();
		try { result.set(name, decodeURIComponent(value)); } catch { /* Ignore malformed cookies. */ }
	}
	return result;
}

function cookie(
	request: Request,
	name: string,
	value: string,
	options: { maxAge: number; path: string }
): string {
	const secure = new URL(request.url).protocol === 'https:';
	return `${name}=${encodeURIComponent(value)}; Max-Age=${options.maxAge}; Path=${options.path}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

function clearCookie(request: Request, name: string, path: string): string {
	return cookie(request, name, '', { maxAge: 0, path });
}

function configured(): boolean {
	return Boolean(
		process.env.GOOGLE_CLIENT_ID?.trim()
		&& process.env.GOOGLE_CLIENT_SECRET?.trim()
		&& encryptionKey()
	);
}

function redirectUri(request: Request): string {
	return process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim()
		|| `${new URL(request.url).origin}/api/gmail/callback`;
}

function redirectHome(request: Request, outcome: string): Response {
	return Response.redirect(`${new URL(request.url).origin}/?gmail=${encodeURIComponent(outcome)}`, 302);
}

function withCookie(response: Response, values: string[]): Response {
	const headers = new Headers(response.headers);
	for (const value of values) headers.append('Set-Cookie', value);
	return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function sameOrigin(request: Request): boolean {
	const supplied = request.headers.get('origin');
	if (!supplied) return false;
	try { return new URL(supplied).origin === new URL(request.url).origin; } catch { return false; }
}

function safeEqual(left: string, right: string): boolean {
	const a = Buffer.from(left);
	const b = Buffer.from(right);
	return a.length === b.length && timingSafeEqual(a, b);
}

function oauthError(request: Request, outcome: string): Response {
	return withCookie(redirectHome(request, outcome), [clearCookie(request, FLOW_COOKIE, '/api/gmail/callback')]);
}

async function exchangeCode(code: string, verifier: string, request: Request): Promise<GoogleTokenResponse> {
	const response = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
			client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
			code,
			code_verifier: verifier,
			grant_type: 'authorization_code',
			redirect_uri: redirectUri(request)
		})
	});
	const data = await response.json().catch(() => ({})) as GoogleTokenResponse;
	if (!response.ok) throw new Error(data.error ?? 'OAuth code exchange failed.');
	return data;
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
	const response = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
			client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
			refresh_token: refreshToken,
			grant_type: 'refresh_token'
		})
	});
	const data = await response.json().catch(() => ({})) as GoogleTokenResponse;
	if (!response.ok || !data.access_token) throw new Error(data.error ?? 'Gmail authorization expired.');
	return data.access_token;
}

function tokenFrom(request: Request): GmailToken | undefined {
	const token = unseal<GmailToken>(cookies(request).get(TOKEN_COOKIE));
	if (!token || token.version !== 1 || !token.refreshToken) return undefined;
	return token;
}

async function gmailFetch(request: Request, path: string, init: RequestInit = {}, suppliedAccessToken?: string): Promise<Response> {
	const token = tokenFrom(request);
	if (!token) return json({ error: 'Gmail is not connected.', connected: false }, 401);
	try {
		const accessToken = suppliedAccessToken ?? await refreshAccessToken(token.refreshToken);
		return fetch(`${GMAIL_API_URL}${path}`, {
			...init,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				...(init.headers ?? {})
			}
		});
	} catch {
		return json({ error: 'Gmail authorization expired. Reconnect Gmail.', connected: false }, 401);
	}
}

function header(message: GmailMessage, name: string): string {
	return message.payload?.headers?.find((candidate) => candidate.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function cleanText(value: string, maxLength: number): string {
	return value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function messageDate(message: GmailMessage): string {
	const milliseconds = Number(message.internalDate);
	if (Number.isFinite(milliseconds) && milliseconds > 0) return new Date(milliseconds).toISOString();
	const parsed = new Date(header(message, 'Date'));
	return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function encodeSubject(subject: string): string {
	return `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
}

export function buildRawDraft(input: { to: string; subject: string; body: string }): string {
	const to = input.to.trim();
	const subject = input.subject.replace(/[\r\n]+/g, ' ').trim();
	const body = input.body.replace(/\r?\n/g, '\r\n').trim();
	if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to) || to.length > 254) throw new Error('Enter a valid recipient email address.');
	if (!subject || subject.length > 300) throw new Error('Subject must be between 1 and 300 characters.');
	if (!body || body.length > 10_000) throw new Error('Message must be between 1 and 10,000 characters.');
	const raw = [
		`To: ${to}`,
		`Subject: ${encodeSubject(subject)}`,
		'MIME-Version: 1.0',
		'Content-Type: text/plain; charset=UTF-8',
		'Content-Transfer-Encoding: 8bit',
		'',
		body
	].join('\r\n');
	return Buffer.from(raw, 'utf8').toString('base64url');
}

export async function handleGmailAuth(request: Request): Promise<Response> {
	if (request.method !== 'GET') return methodNotAllowed('GET');
	if (!configured()) return json({ error: 'Gmail OAuth is not configured on this deployment.' }, 503);
	const state = base64Url(randomBytes(24));
	const verifier = base64Url(randomBytes(48));
	const challenge = base64Url(createHash('sha256').update(verifier).digest());
	const flow: OAuthFlow = { state, verifier, createdAt: Date.now() };
	const url = new URL(GOOGLE_AUTHORIZE_URL);
	url.search = new URLSearchParams({
		client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
		redirect_uri: redirectUri(request),
		response_type: 'code',
		scope: GMAIL_SCOPES.join(' '),
		access_type: 'offline',
		include_granted_scopes: 'true',
		prompt: 'consent',
		state,
		code_challenge: challenge,
		code_challenge_method: 'S256'
	}).toString();
	return withCookie(Response.redirect(url.toString(), 302), [
		cookie(request, FLOW_COOKIE, seal(flow), { maxAge: 10 * 60, path: '/api/gmail/callback' })
	]);
}

export async function handleGmailCallback(request: Request): Promise<Response> {
	if (request.method !== 'GET') return methodNotAllowed('GET');
	if (!configured()) return oauthError(request, 'not_configured');
	const url = new URL(request.url);
	if (url.searchParams.get('error')) return oauthError(request, 'cancelled');
	const code = url.searchParams.get('code') ?? '';
	const state = url.searchParams.get('state') ?? '';
	const flow = unseal<OAuthFlow>(cookies(request).get(FLOW_COOKIE));
	if (!code || !state || !flow || Date.now() - flow.createdAt > 10 * 60_000 || !safeEqual(state, flow.state)) {
		return oauthError(request, 'invalid_state');
	}
	try {
		const exchanged = await exchangeCode(code, flow.verifier, request);
		if (!exchanged.refresh_token || !exchanged.access_token) return oauthError(request, 'missing_refresh_token');
		let email: string | undefined;
		const profile = await fetch(`${GMAIL_API_URL}/profile`, { headers: { Authorization: `Bearer ${exchanged.access_token}` } });
		if (profile.ok) email = cleanText(String((await profile.json() as { emailAddress?: string }).emailAddress ?? ''), 254) || undefined;
		const token: GmailToken = {
			version: 1,
			refreshToken: exchanged.refresh_token,
			email,
			scopes: exchanged.scope?.split(' ').filter(Boolean) ?? GMAIL_SCOPES,
			connectedAt: new Date().toISOString()
		};
		return withCookie(redirectHome(request, 'connected'), [
			clearCookie(request, FLOW_COOKIE, '/api/gmail/callback'),
			cookie(request, TOKEN_COOKIE, seal(token), { maxAge: 30 * 24 * 60 * 60, path: '/api/gmail' })
		]);
	} catch {
		return oauthError(request, 'exchange_failed');
	}
}

export async function handleGmailStatus(request: Request): Promise<Response> {
	if (request.method !== 'GET') return methodNotAllowed('GET');
	const token = configured() ? tokenFrom(request) : undefined;
	return json({
		configured: configured(),
		connected: Boolean(token),
		email: token?.email,
		connectedAt: token?.connectedAt,
		capabilities: token ? ['read_messages', 'create_drafts'] : []
	});
}

export async function handleGmailMessages(request: Request): Promise<Response> {
	if (request.method !== 'GET') return methodNotAllowed('GET');
	if (!configured()) return json({ error: 'Gmail OAuth is not configured.' }, 503);
	const requestUrl = new URL(request.url);
	const requestedLimit = Number.parseInt(requestUrl.searchParams.get('limit') ?? '10', 10);
	const limit = Number.isFinite(requestedLimit) ? Math.min(20, Math.max(1, requestedLimit)) : 10;
	const query = cleanText(requestUrl.searchParams.get('q') ?? 'in:inbox newer_than:30d', 200);
	const connectedToken = tokenFrom(request);
	if (!connectedToken) return json({ error: 'Gmail is not connected.', connected: false }, 401);
	let accessToken: string;
	try { accessToken = await refreshAccessToken(connectedToken.refreshToken); }
	catch { return json({ error: 'Gmail authorization expired. Reconnect Gmail.', connected: false }, 401); }
	const listResponse = await gmailFetch(request, `/messages?${new URLSearchParams({ maxResults: String(limit), q: query })}`, {}, accessToken);
	if (!listResponse.ok) {
		if (listResponse.headers.get('Content-Type')?.includes('application/json')) return listResponse;
		return json({ error: 'Gmail could not be read.' }, listResponse.status);
	}
	const listed = await listResponse.json() as { messages?: Array<{ id?: string }> };
	const messages = await Promise.all((listed.messages ?? []).flatMap((item) => item.id ? [item.id] : []).map(async (id) => {
		const params = new URLSearchParams({ format: 'metadata' });
		for (const name of ['From', 'To', 'Subject', 'Date']) params.append('metadataHeaders', name);
		const response = await gmailFetch(request, `/messages/${encodeURIComponent(id)}?${params}`, {}, accessToken);
		if (!response.ok) return undefined;
		return await response.json() as GmailMessage;
	}));
	return json({
		messages: messages.flatMap((message) => {
			if (!message?.id) return [];
			return [{
				id: `gmail-${message.id}`,
				provider: 'gmail',
				from: cleanText(header(message, 'From') || 'Unknown sender', 320),
				to: cleanText(header(message, 'To') || 'Connected Gmail account', 320),
				subject: cleanText(header(message, 'Subject') || '(No subject)', 300),
				receivedAt: messageDate(message),
				summary: cleanText(message.snippet || 'No preview available.', 500),
				untrusted: true as const
			}];
		})
	});
}

export async function handleGmailDrafts(request: Request): Promise<Response> {
	if (request.method !== 'POST') return methodNotAllowed('POST');
	if (!sameOrigin(request)) return json({ error: 'Origin not allowed.' }, 403);
	if (!configured()) return json({ error: 'Gmail OAuth is not configured.' }, 503);
	if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: 'Content-Type must be application/json.' }, 415);
	const contentLength = Number.parseInt(request.headers.get('content-length') ?? '', 10);
	if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return json({ error: 'Draft request is too large.' }, 413);
	let input: { to?: unknown; subject?: unknown; body?: unknown };
	try { input = await request.json() as typeof input; } catch { return json({ error: 'Invalid JSON.' }, 400); }
	try {
		const raw = buildRawDraft({ to: String(input.to ?? ''), subject: String(input.subject ?? ''), body: String(input.body ?? '') });
		const response = await gmailFetch(request, '/drafts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
			body: JSON.stringify({ message: { raw } })
		});
		if (!response.ok) {
			if (response.status === 401) return response;
			return json({ error: 'Gmail could not create the draft.' }, response.status);
		}
		const draft = await response.json() as { id?: string; message?: { id?: string; threadId?: string } };
		return json({ created: true, draftId: draft.id, messageId: draft.message?.id, threadId: draft.message?.threadId });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Invalid draft.' }, 400);
	}
}

export async function handleGmailDisconnect(request: Request): Promise<Response> {
	if (request.method !== 'POST') return methodNotAllowed('POST');
	if (!sameOrigin(request)) return json({ error: 'Origin not allowed.' }, 403);
	const token = tokenFrom(request);
	if (token?.refreshToken) {
		await fetch(GOOGLE_REVOKE_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ token: token.refreshToken })
		}).catch(() => undefined);
	}
	return json({ connected: false }, 200, {
		'Set-Cookie': clearCookie(request, TOKEN_COOKIE, '/api/gmail')
	});
}

export const gmailOAuthInternals = {
	GMAIL_SCOPES,
	FLOW_COOKIE,
	TOKEN_COOKIE,
	seal,
	unseal
};
