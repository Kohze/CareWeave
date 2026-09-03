import { createRealtimeCall } from '../../server/realtime-session.js';

const MAX_SDP_BYTES = 100_000;
const RATE_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT = 6;

type RateBucket = { count: number; resetsAt: number };

const rateBuckets = new Map<string, RateBucket>();

function plainText(message: string, status: number, headers: Record<string, string> = {}): Response {
	return new Response(message, {
		status,
		headers: {
			'Cache-Control': 'no-store',
			'Content-Type': 'text/plain; charset=utf-8',
			'X-Content-Type-Options': 'nosniff',
			...headers
		}
	});
}

function normalizeOrigin(value: string): string | undefined {
	try {
		return new URL(value).origin;
	} catch {
		return undefined;
	}
}

function originIsAllowed(request: Request): boolean {
	const requestOrigin = normalizeOrigin(request.url);
	const suppliedOrigin = normalizeOrigin(request.headers.get('Origin') ?? '');
	if (!requestOrigin || !suppliedOrigin) return false;

	const configuredOrigins = (process.env.REALTIME_ALLOWED_ORIGINS ?? '')
		.split(',')
		.map((origin) => normalizeOrigin(origin.trim()))
		.filter((origin): origin is string => Boolean(origin));

	return suppliedOrigin === requestOrigin || configuredOrigins.includes(suppliedOrigin);
}

function clientAddress(request: Request): string {
	return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
		?? request.headers.get('x-real-ip')
		?? 'unknown';
}

function configuredRateLimit(): number {
	const configured = Number.parseInt(process.env.REALTIME_RATE_LIMIT_PER_MINUTE ?? '', 10);
	return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_RATE_LIMIT;
}

function consumeRateLimit(request: Request): number | undefined {
	const now = Date.now();
	for (const [key, bucket] of rateBuckets) {
		if (bucket.resetsAt <= now) rateBuckets.delete(key);
	}

	const key = clientAddress(request);
	const bucket = rateBuckets.get(key);
	if (!bucket) {
		rateBuckets.set(key, { count: 1, resetsAt: now + RATE_WINDOW_MS });
		return undefined;
	}

	if (bucket.count >= configuredRateLimit()) {
		return Math.max(1, Math.ceil((bucket.resetsAt - now) / 1000));
	}

	bucket.count += 1;
	return undefined;
}

export async function handleRealtimeSession(request: Request): Promise<Response> {
	if (request.method !== 'POST') {
		return plainText('Method not allowed.', 405, { Allow: 'POST' });
	}
	if (!originIsAllowed(request)) {
		return plainText('Origin not allowed.', 403);
	}
	if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/sdp')) {
		return plainText('Content-Type must be application/sdp.', 415);
	}

	const contentLength = Number.parseInt(request.headers.get('Content-Length') ?? '', 10);
	if (Number.isFinite(contentLength) && contentLength > MAX_SDP_BYTES) {
		return plainText('SDP offer is too large.', 413);
	}

	const retryAfter = consumeRateLimit(request);
	if (retryAfter !== undefined) {
		return plainText('Too many voice sessions. Please wait and try again.', 429, {
			'Retry-After': String(retryAfter)
		});
	}

	return createRealtimeCall(await request.text(), process.env.OPENAI_API_KEY);
}

export default { fetch: handleRealtimeSession };
