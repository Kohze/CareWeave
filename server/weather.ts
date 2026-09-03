const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

function json(body: unknown, status = 200, cache = 'no-store'): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Cache-Control': cache,
			'Content-Type': 'application/json; charset=utf-8',
			'X-Content-Type-Options': 'nosniff'
		}
	});
}

export async function handleWeather(request: Request): Promise<Response> {
	if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
	const requestUrl = new URL(request.url);
	const latitude = Number(requestUrl.searchParams.get('latitude'));
	const longitude = Number(requestUrl.searchParams.get('longitude'));
	if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
		return json({ error: 'Valid latitude and longitude are required.' }, 400);
	}

	// Two decimal places is roughly city-district precision. The upstream provider
	// does not need a household's exact address to choose a useful forecast model.
	const upstream = new URL(WEATHER_URL);
	upstream.searchParams.set('latitude', latitude.toFixed(2));
	upstream.searchParams.set('longitude', longitude.toFixed(2));
	upstream.searchParams.set('current', 'temperature_2m,precipitation,weather_code,cloud_cover,wind_speed_10m');
	upstream.searchParams.set('hourly', 'temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m');
	upstream.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset');
	upstream.searchParams.set('timezone', 'auto');
	upstream.searchParams.set('forecast_days', '7');

	try {
		const response = await fetch(upstream, { headers: { Accept: 'application/json' } });
		if (!response.ok) return json({ error: 'The forecast provider is unavailable.' }, 502);
		const payload = await response.text();
		return new Response(payload, {
			status: 200,
			headers: {
				'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
				'Content-Type': 'application/json; charset=utf-8',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	} catch {
		return json({ error: 'The forecast provider could not be reached.' }, 502);
	}
}

export default { fetch: handleWeather };
