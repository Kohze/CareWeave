import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleRealtimeSession } from '../../api/realtime/session';

function request(headers: Record<string, string> = {}, body = 'v=0\r\n'): Request {
	return new Request('https://careweave.example/api/realtime/session', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/sdp',
			Origin: 'https://careweave.example',
			'x-forwarded-for': crypto.randomUUID(),
			...headers
		},
		body
	});
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('Vercel Realtime session endpoint', () => {
	it('rejects cross-origin session creation', async () => {
		const response = await handleRealtimeSession(request({ Origin: 'https://attacker.example' }));
		expect(response.status).toBe(403);
		expect(response.headers.get('Cache-Control')).toBe('no-store');
	});

	it('requires an SDP request body', async () => {
		const response = await handleRealtimeSession(request({ 'Content-Type': 'application/json' }));
		expect(response.status).toBe(415);
	});

	it('keeps the standard key on the server when creating a call', async () => {
		vi.stubEnv('OPENAI_API_KEY', 'server-only-test-key');
		const upstream = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
			expect(init?.headers).toMatchObject({ Authorization: 'Bearer server-only-test-key' });
			return new Response('v=0\r\nanswer', {
				status: 201,
				headers: { 'Content-Type': 'application/sdp' }
			});
		});
		vi.stubGlobal('fetch', upstream);

		const response = await handleRealtimeSession(request());
		expect(response.status).toBe(201);
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(await response.text()).toContain('answer');
		expect(upstream).toHaveBeenCalledOnce();
	});

	it('limits repeated session creation attempts from one client', async () => {
		vi.stubEnv('OPENAI_API_KEY', 'server-only-test-key');
		vi.stubEnv('REALTIME_RATE_LIMIT_PER_MINUTE', '2');
		const upstream = vi.fn(async () => new Response('v=0\r\nanswer', {
			status: 200,
			headers: { 'Content-Type': 'application/sdp' }
		}));
		vi.stubGlobal('fetch', upstream);
		const headers = { 'x-forwarded-for': '203.0.113.42' };

		expect((await handleRealtimeSession(request(headers))).status).toBe(200);
		expect((await handleRealtimeSession(request(headers))).status).toBe(200);
		const limited = await handleRealtimeSession(request(headers));
		expect(limited.status).toBe(429);
		expect(limited.headers.get('Retry-After')).toBeTruthy();
		expect(upstream).toHaveBeenCalledTimes(2);
	});
});
