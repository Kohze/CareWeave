<script lang="ts">
	import { onMount } from 'svelte';
	import { addDays, dateKeyFromIso, formatDay, formatTime, localDateKey } from '$lib/dates';
	import { fallbackWeather, loadWeatherForecast, type WeatherScene } from '$lib/weather';
	import WeatherCanvas from './WeatherCanvas.svelte';
	import WeatherGlyph from './WeatherGlyph.svelte';

	type NextEvent = { title: string; startAt: string; timeZone?: string; location?: string };

	let { ownerName, nextEvent, location, onUnlock }: { ownerName: string; nextEvent?: NextEvent; location: { latitude: number; longitude: number }; onUnlock: () => void } = $props();
	let dialog: HTMLDialogElement;
	let unlockButton: HTMLButtonElement;
	let now = $state(new Date());
	let forecast = $state<WeatherScene>(fallbackWeather);
	let forecastLoading = $state(true);
	let timeLabel = $derived(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
	let dateLabel = $derived(now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }));
	let nextEventTime = $derived(nextEvent ? formatTime(nextEvent.startAt, nextEvent.timeZone) : '');
	let forecastStatus = $derived(forecastLoading ? 'Updating forecast' : forecast.source === 'live' ? 'Live forecast' : forecast.source === 'cached' ? 'Saved forecast' : 'Forecast unavailable');
	let forecastNumbers = $derived([
		forecast.temperature !== undefined ? `${forecast.temperature}°` : undefined,
		forecast.high !== undefined && forecast.low !== undefined ? `High ${Math.round(forecast.high)}° · Low ${Math.round(forecast.low)}°` : undefined,
		forecast.precipitationProbability !== undefined ? `${Math.round(forecast.precipitationProbability)}% chance of rain` : undefined
	].filter((value): value is string => Boolean(value)));
	let displayName = $derived(ownerName.trim());
	let nextEventDay = $derived.by(() => {
		if (!nextEvent) return '';
		const eventDate = dateKeyFromIso(nextEvent.startAt);
		const today = localDateKey(now);
		if (eventDate === today) return 'Today';
		if (eventDate === addDays(today, 1)) return 'Tomorrow';
		return formatDay(eventDate, 'short');
	});

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

	<section class="screensaver-next" aria-label="Next event">
		<span class="next-event-label"><i></i> Next up</span>
		{#if nextEvent}
			<h2>{nextEvent.title}</h2>
			<p><strong>{nextEventDay} · {nextEventTime}</strong>{#if nextEvent.location}<span>{nextEvent.location}</span>{/if}</p>
		{:else}
			<h2>Nothing else planned</h2>
			<p><strong>Your day is clear</strong></p>
		{/if}
	</section>

	<div class="screensaver-controls">
		<h2 id="private-screen-title">{displayName ? `The rest of ${displayName}'s details are hidden` : 'Private details are hidden'}</h2>
		<div>
			<button bind:this={unlockButton} onclick={onUnlock}>{displayName ? `Show ${displayName}'s board` : 'Show main board'}</button>
		</div>
	</div>
</dialog>
