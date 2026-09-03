import { describe, expect, it } from 'vitest';
import { forecastFromPayload, weatherFromCode } from './weather';

describe('weather forecast presentation', () => {
	it('maps WMO conditions to the matching visual scene', () => {
		expect(weatherFromCode(0).condition).toBe('clear');
		expect(weatherFromCode(45).condition).toBe('fog');
		expect(weatherFromCode(65).condition).toBe('rain');
		expect(weatherFromCode(75).condition).toBe('snow');
		expect(weatherFromCode(95).condition).toBe('thunderstorm');
	});

	it('converts forecast units into atmosphere inputs', () => {
		const today = new Date().toISOString().slice(0, 10);
		const scene = forecastFromPayload({
			current: { time: `${today}T14:00`, temperature_2m: 14.2, precipitation: .4, weather_code: 61, cloud_cover: 86, wind_speed_10m: 18 },
			daily: { time: [today], weather_code: [61], temperature_2m_max: [16.4], temperature_2m_min: [8.8], precipitation_probability_max: [78] }
		});

		expect(scene.condition).toBe('rain');
		expect(scene.temperature).toBe(14);
		expect(scene.atmosphere.cloudCover).toBe(.86);
		expect(scene.atmosphere.windSpeed).toBe(5);
		expect(scene.atmosphere.precipitation).toBe(.8);
		expect(scene.precipitationProbability).toBe(78);
		expect(scene.outlook).toEqual([{ date: today, condition: 'rain', label: 'Rain expected', high: 16.4, low: 8.8, precipitationProbability: 78 }]);
	});

	it('keeps each hourly condition and measurement attached to its forecast time', () => {
		const today = new Date().toISOString().slice(0, 10);
		const scene = forecastFromPayload({
			current: { weather_code: 2 },
			daily: { time: [today], weather_code: [2] },
			hourly: {
				time: [`${today}T08:00`, `${today}T09:00`],
				weather_code: [2, 61],
				temperature_2m: [12.2, 13.1],
				apparent_temperature: [10.9, 11.7],
				precipitation_probability: [20, 76],
				wind_speed_10m: [8, 14]
			}
		});

		expect(scene.hourly).toEqual([
			{ time: `${today}T08:00`, condition: 'fair', label: 'Partly cloudy', temperature: 12.2, apparentTemperature: 10.9, precipitationProbability: 20, windSpeed: 8 },
			{ time: `${today}T09:00`, condition: 'rain', label: 'Rain expected', temperature: 13.1, apparentTemperature: 11.7, precipitationProbability: 76, windSpeed: 14 }
		]);
	});
});
