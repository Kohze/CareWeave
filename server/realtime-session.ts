export async function createRealtimeCall(sdp: string, apiKey: string | undefined): Promise<Response> {
	if (!apiKey) {
		return new Response('Conversational voice is not configured: OPENAI_API_KEY is missing.', {
			status: 503,
			headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' }
		});
	}
	if (!sdp || sdp.length > 100_000 || !sdp.trimStart().startsWith('v=0')) {
		return new Response('A valid SDP offer is required.', {
			status: 400,
			headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' }
		});
	}

	const form = new FormData();
	form.set('sdp', sdp);
	form.set('session', JSON.stringify({
		type: 'realtime',
		model: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1',
		output_modalities: ['audio'],
		audio: { output: { voice: 'marin' } }
	}));

	try {
		const response = await fetch('https://api.openai.com/v1/realtime/calls', {
			method: 'POST',
			headers: { Authorization: `Bearer ${apiKey}` },
			body: form
		});
		const body = await response.text();
		return new Response(body, {
			status: response.status,
			headers: {
				'Cache-Control': 'no-store',
				'Content-Type': response.ok ? 'application/sdp' : 'text/plain; charset=utf-8'
			}
		});
	} catch {
		return new Response('The server could not reach the conversational voice service.', {
			status: 502,
			headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' }
		});
	}
}
