import type { Weather, WeatherId } from '@takustaqu/atmosphere';

export type ForecastSource = 'live' | 'cached' | 'fallback';

export interface ForecastDay {
	date: string;
	condition: WeatherId;
	label: string;
	high?: number;
	low?: number;
	precipitationProbability?: number;
}

export interface ForecastHour {
	time: string;
	condition: WeatherId;
	label: string;
	temperature?: number;
	apparentTemperature?: number;
	precipitationProbability?: number;
	windSpeed?: number;
}

export interface WeatherScene {
	condition: WeatherId;
	label: string;
	temperature?: number;
	high?: number;
	low?: number;
	precipitationProbability?: number;
	updatedAt?: string;
	source: ForecastSource;
	outlook: ForecastDay[];
	hourly: ForecastHour[];
	atmosphere: Weather;
}

interface ForecastPayload {
	current?: {
		time?: string;
		temperature_2m?: number;
		precipitation?: number;
		weather_code?: number;
		cloud_cover?: number;
		wind_speed_10m?: number;
	};
	daily?: {
		time?: string[];
		weather_code?: number[];
		temperature_2m_max?: number[];
		temperature_2m_min?: number[];
		precipitation_probability_max?: number[];
	};
	hourly?: {
		time?: string[];
		weather_code?: number[];
		temperature_2m?: number[];
		apparent_temperature?: number[];
		precipitation_probability?: number[];
		wind_speed_10m?: number[];
	};
}

const CACHE_MAX_AGE = 60 * 60 * 1000;
const DEFAULT_CLOUD: Record<WeatherId, number> = {
	clear: .04, fair: .28, summer: .38, overcast: .88, fog: .78,
	rain: .95, thunderstorm: .98, snow: .92, typhoon: 1
};

export const fallbackWeather: WeatherScene = {
	condition: 'fair',
	label: 'Gentle, changeable skies',
	source: 'fallback',
	outlook: [],
	hourly: [],
	atmosphere: { cloudCover: .28, windSpeed: 2.5, visibility: 28 }
};

export function weatherFromCode(code: number): { condition: WeatherId; label: string } {
	if (code === 0) return { condition: 'clear', label: 'Clear skies' };
	if (code === 1) return { condition: 'fair', label: 'Mainly clear' };
	if (code === 2) return { condition: 'fair', label: 'Partly cloudy' };
	if (code === 3) return { condition: 'overcast', label: 'Overcast' };
	if (code === 45 || code === 48) return { condition: 'fog', label: 'Foggy' };
	if (code >= 51 && code <= 57) return { condition: 'rain', label: 'Drizzle expected' };
	if (code >= 61 && code <= 67) return { condition: 'rain', label: code >= 65 ? 'Heavy rain' : 'Rain expected' };
	if (code >= 71 && code <= 77) return { condition: 'snow', label: 'Snow expected' };
	if (code >= 80 && code <= 82) return { condition: 'rain', label: 'Rain showers' };
	if (code >= 85 && code <= 86) return { condition: 'snow', label: 'Snow showers' };
	if (code >= 95 && code <= 99) return { condition: 'thunderstorm', label: 'Thunderstorms' };
	return { condition: 'fair', label: 'Changeable skies' };
}

function numberAt(value: number[] | undefined, index: number): number | undefined {
	const candidate = value?.[index];
	return Number.isFinite(candidate) ? candidate : undefined;
}

export function forecastFromPayload(payload: ForecastPayload, source: ForecastSource = 'live'): WeatherScene {
	const today = new Date().toISOString().slice(0, 10);
	const dailyIndex = Math.max(0, payload.daily?.time?.indexOf(today) ?? 0);
	const currentCode = Number(payload.current?.weather_code ?? 1);
	const dailyCode = Number(numberAt(payload.daily?.weather_code, dailyIndex) ?? currentCode);
	const { condition, label } = weatherFromCode(dailyCode);
	const currentCloud = Number(payload.current?.cloud_cover);
	const currentPrecipitation = Math.max(0, Number(payload.current?.precipitation ?? 0));
	const precipitationFloor = condition === 'thunderstorm' ? 8 : condition === 'snow' ? 2 : condition === 'rain' ? .8 : 0;
	const windSpeed = Math.max(0, Number(payload.current?.wind_speed_10m ?? 9)) / 3.6;
	const outlook = (payload.daily?.time ?? []).slice(0, 7).map((date, index) => {
		const dayWeather = weatherFromCode(Number(numberAt(payload.daily?.weather_code, index) ?? 1));
		return {
			date,
			...dayWeather,
			high: numberAt(payload.daily?.temperature_2m_max, index),
			low: numberAt(payload.daily?.temperature_2m_min, index),
			precipitationProbability: numberAt(payload.daily?.precipitation_probability_max, index)
		};
	});
	const hourly = (payload.hourly?.time ?? []).map((time, index) => {
		const hourWeather = weatherFromCode(Number(numberAt(payload.hourly?.weather_code, index) ?? 1));
		return {
			time,
			...hourWeather,
			temperature: numberAt(payload.hourly?.temperature_2m, index),
			apparentTemperature: numberAt(payload.hourly?.apparent_temperature, index),
			precipitationProbability: numberAt(payload.hourly?.precipitation_probability, index),
			windSpeed: numberAt(payload.hourly?.wind_speed_10m, index)
		};
	});

	return {
		condition,
		label,
		temperature: Number.isFinite(payload.current?.temperature_2m) ? Math.round(payload.current!.temperature_2m!) : undefined,
		high: numberAt(payload.daily?.temperature_2m_max, dailyIndex),
		low: numberAt(payload.daily?.temperature_2m_min, dailyIndex),
		precipitationProbability: numberAt(payload.daily?.precipitation_probability_max, dailyIndex),
		updatedAt: payload.current?.time,
		source,
		outlook,
		hourly,
		atmosphere: {
			cloudCover: Number.isFinite(currentCloud) ? Math.max(currentCloud / 100, DEFAULT_CLOUD[condition] * .65) : DEFAULT_CLOUD[condition],
			precipitation: Math.max(currentPrecipitation, precipitationFloor),
			precipitationType: condition === 'snow' ? 'snow' : 'rain',
			windSpeed,
			thunder: condition === 'thunderstorm' ? .9 : 0,
			convection: condition === 'thunderstorm' ? .88 : condition === 'rain' ? .2 : 0,
			visibility: condition === 'fog' ? .7 : condition === 'thunderstorm' ? 5 : condition === 'rain' || condition === 'snow' ? 9 : 32
		}
	};
}

export async function loadWeatherForecast(location: { latitude: number; longitude: number }, signal?: AbortSignal): Promise<WeatherScene> {
	const latitude = Number(location.latitude.toFixed(2));
	const longitude = Number(location.longitude.toFixed(2));
	const cacheKey = `careweave-weather:${latitude},${longitude}`;
	let cached: { fetchedAt: number; scene: WeatherScene } | undefined;
	try {
		cached = JSON.parse(localStorage.getItem(cacheKey) ?? 'null') ?? undefined;
		if (cached && Date.now() - cached.fetchedAt < CACHE_MAX_AGE && Array.isArray(cached.scene.hourly) && cached.scene.hourly.length) {
			return { ...cached.scene, source: 'cached' };
		}
	} catch {
		cached = undefined;
	}

	try {
		const query = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude) });
		const response = await fetch(`/api/weather?${query}`, { signal, headers: { Accept: 'application/json' } });
		if (!response.ok) throw new Error('Forecast request failed.');
		const scene = forecastFromPayload(await response.json());
		try { localStorage.setItem(cacheKey, JSON.stringify({ fetchedAt: Date.now(), scene })); } catch { /* storage is optional */ }
		return scene;
	} catch (cause) {
		if (signal?.aborted) throw cause;
		return cached ? { ...cached.scene, hourly: cached.scene.hourly ?? [], source: 'cached' } : fallbackWeather;
	}
}
