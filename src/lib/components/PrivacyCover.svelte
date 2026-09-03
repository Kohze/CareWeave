<script lang="ts">
	import { onMount } from 'svelte';
	import { fallbackWeather, loadWeatherForecast, type WeatherScene } from '$lib/weather';
	import WeatherCanvas from './WeatherCanvas.svelte';
	import WeatherGlyph from './WeatherGlyph.svelte';

	let { ownerName, location, onUnlock }: { ownerName: string; location: { latitude: number; longitude: number }; onUnlock: () => void } = $props();
	let dialog: HTMLDialogElement;
	let unlockButton: HTMLButtonElement;
	let now = $state(new Date());
	let forecast = $state<WeatherScene>(fallbackWeather);
	let forecastLoading = $state(true);
	let timeLabel = $derived(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
	let dateLabel = $derived(now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }));
	let forecastStatus = $derived(forecastLoading ? 'Updating forecast' : forecast.source === 'fallback' ? 'Forecast unavailable' : 'Forecast');
	let forecastNumbers = $derived([
		forecast.temperature !== undefined ? `${forecast.temperature}°` : undefined,
		forecast.high !== undefined && forecast.low !== undefined ? `High ${Math.round(forecast.high)}° · Low ${Math.round(forecast.low)}°` : undefined,
		forecast.precipitationProbability !== undefined ? `${Math.round(forecast.precipitationProbability)}% chance of rain` : undefined
	].filter((value): value is string => Boolean(value)));
	let displayName = $derived(ownerName.trim());

	onMount(() => {
		dialog.showModal();
		unlockButton.focus();
		let active = true;
		let controller = new AbortController();
		const refreshForecast = async () => {
			controller.abort();
			controller = new AbortController();
			try {
				const nextForecast = await loadWeatherForecast(location, controller.signal);
				if (active) forecast = nextForecast;
			} finally {
				if (active) forecastLoading = false;
			}
		};
		void refreshForecast();
		const clockTimer = window.setInterval(() => { now = new Date(); }, 30_000);
		const weatherTimer = window.setInterval(refreshForecast, 10 * 60_000);
		return () => {
			active = false;
			controller.abort();
			window.clearInterval(clockTimer);
			window.clearInterval(weatherTimer);
		};
	});
</script>

<dialog bind:this={dialog} class="privacy-cover" aria-labelledby="private-screen-title" oncancel={(event) => event.preventDefault()}>
	<div class="pond-scene" aria-hidden="true">
		<WeatherCanvas {forecast} {location} time={now} />
	</div>

	<div class="screensaver-brand">
		<span><strong>CareWeave</strong><small>Living forecast</small></span>
	</div>

	<div class="screensaver-clock">
		<time datetime={now.toISOString()}>{timeLabel}</time>
		<span>{dateLabel}</span>
	</div>

	<div class={`screensaver-weather weather-${forecast.condition}`} role="status" aria-live="polite">
		<span class="weather-symbol"><WeatherGlyph condition={forecast.condition} size={48} /></span>
		<span><small>{forecastStatus}</small><strong>{forecast.label}{forecast.temperature !== undefined ? ` · ${forecast.temperature}°` : ''}</strong>{#if forecastNumbers.length > 1}<span>{forecastNumbers.slice(1).join(' · ')}</span>{/if}</span>
	</div>

	<div class="screensaver-controls">
		<h2 id="private-screen-title">{displayName ? `The rest of ${displayName}'s details are hidden` : 'Private details are hidden'}</h2>
		<p>Schedule and personal details stay out of sight.</p>
		<div>
			<button bind:this={unlockButton} onclick={onUnlock}>{displayName ? `Show ${displayName}'s board` : 'Show main board'}</button>
		</div>
	</div>
</dialog>
