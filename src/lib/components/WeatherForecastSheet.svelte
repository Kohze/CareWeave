<script lang="ts">
	import { onMount } from 'svelte';
	import { formatDay, localDateKey } from '$lib/dates';
	import type { ForecastDay, ForecastHour } from '$lib/weather';
	import WeatherGlyph from './WeatherGlyph.svelte';

	let {
		date,
		forecast,
		hours,
		onClose
	}: {
		date: string;
		forecast: ForecastDay & { temperature?: number };
		hours: ForecastHour[];
		onClose: () => void;
	} = $props();

	let dialog: HTMLDialogElement;
	let closeButton: HTMLButtonElement;
	const scrollbarTimers = new WeakMap<HTMLElement, number>();
	const periods = [
		{ label: 'Overnight', detail: 'Midnight to 05:00', start: 0, end: 6 },
		{ label: 'Morning', detail: '06:00 to 11:00', start: 6, end: 12 },
		{ label: 'Afternoon', detail: '12:00 to 17:00', start: 12, end: 18 },
		{ label: 'Evening', detail: '18:00 to 23:00', start: 18, end: 24 }
	];
	let dayHours = $derived(hours.filter((hour) => hour.time.startsWith(date)).slice(0, 24));
	let currentHour = $derived(date === localDateKey() ? new Date().getHours() : -1);

	onMount(() => {
		dialog.showModal();
		closeButton.focus();
	});

	function close(): void {
		dialog.close();
		onClose();
	}

	function showScrollbarWhileScrolling(event: Event): void {
		const scroller = event.currentTarget as HTMLElement;
		scroller.classList.add('is-scrolling');
		const existingTimer = scrollbarTimers.get(scroller);
		if (existingTimer) window.clearTimeout(existingTimer);
		scrollbarTimers.set(scroller, window.setTimeout(() => {
			scroller.classList.remove('is-scrolling');
			scrollbarTimers.delete(scroller);
		}, 700));
	}

	function hourNumber(time: string): number {
		return Number(time.slice(11, 13));
	}

	function hourLabel(time: string): string {
		return time.slice(11, 16);
	}

	function rounded(value: number | undefined): string {
		return value === undefined ? '—' : String(Math.round(value));
	}
</script>

<dialog bind:this={dialog} class={`weather-detail-sheet weather-${forecast.condition}`} aria-labelledby="weather-detail-title" oncancel={(event) => { event.preventDefault(); close(); }}>
	<div class="weather-page">
		<header class="weather-page-header">
			<div>
				<span class="weather-kicker">CareWeave weather</span>
				<h1 id="weather-detail-title">Hourly forecast</h1>
			</div>
			<button bind:this={closeButton} class="weather-close" aria-label="Close hourly forecast" onclick={close}>×</button>
		</header>

		<div class="weather-page-content" onscroll={showScrollbarWhileScrolling}>
			<section class="weather-hero" aria-label={`Summary for ${formatDay(date)}`}>
				<div class="weather-hero-icon"><WeatherGlyph condition={forecast.condition} size={112} /></div>
				<div class="weather-hero-copy">
					<span>{date === localDateKey() ? 'Today' : formatDay(date, 'short')}</span>
					<h2>{formatDay(date)}</h2>
					<p>{forecast.label}</p>
				</div>
				<div class="weather-hero-temperature">
					<strong>{forecast.temperature !== undefined ? `${Math.round(forecast.temperature)}°` : forecast.high !== undefined ? `${Math.round(forecast.high)}°` : '—'}</strong>
					<span>{forecast.temperature !== undefined ? 'Now' : 'Daytime high'}</span>
				</div>
				<div class="weather-summary-metrics">
					<div><span>High</span><strong>{rounded(forecast.high)}°</strong></div>
					<div><span>Low</span><strong>{rounded(forecast.low)}°</strong></div>
					<div><span>Chance of rain</span><strong>{rounded(forecast.precipitationProbability)}%</strong></div>
				</div>
			</section>

			<section class="hourly-outlook" aria-labelledby="hourly-outlook-title">
				<div class="hourly-heading">
					<div><span>Through the day</span><h2 id="hourly-outlook-title">Time by time</h2></div>
					<p>Temperature · rain · wind</p>
				</div>

				{#if dayHours.length}
					{#each periods as period}
						{@const periodHours = dayHours.filter((hour) => hourNumber(hour.time) >= period.start && hourNumber(hour.time) < period.end)}
						{#if periodHours.length}
							<section class="day-period" aria-label={period.label}>
								<header><h3>{period.label}</h3><span>{period.detail}</span></header>
								<div class="hour-cards" onscroll={showScrollbarWhileScrolling}>
									{#each periodHours as hour}
										<article class:current={hourNumber(hour.time) === currentHour} aria-label={`${hourLabel(hour.time)}, ${hour.label}, ${rounded(hour.temperature)} degrees`}>
											<div class="hour-time"><strong>{hourNumber(hour.time) === currentHour ? 'Now' : hourLabel(hour.time)}</strong>{#if hourNumber(hour.time) === currentHour}<span>{hourLabel(hour.time)}</span>{/if}</div>
											<WeatherGlyph condition={hour.condition} size={52} />
											<strong class="hour-temperature">{rounded(hour.temperature)}°</strong>
											<span class="hour-condition">{hour.label}</span>
											<div class="hour-facts">
												<span><i class="rain-dot"></i>{rounded(hour.precipitationProbability)}%</span>
												<span><i class="wind-mark">≈</i>{rounded(hour.windSpeed)} km/h</span>
											</div>
										</article>
									{/each}
								</div>
							</section>
						{/if}
					{/each}
				{:else}
					<div class="hourly-empty"><WeatherGlyph condition={forecast.condition} size={64} /><div><strong>{forecast.label}</strong><span>The time-by-time outlook will fill in when this date enters the seven-day forecast.</span></div></div>
				{/if}
			</section>
		</div>
	</div>
</dialog>

<style>
	.weather-detail-sheet {
		position: fixed;
		inset: 0;
		width: min(1180px, calc(100vw - 24px));
		height: calc(100dvh - 24px);
		max-width: none;
		max-height: none;
		margin: auto;
		padding: 0;
		border: 0;
		border-radius: 30px;
		background: #f4f1e9;
		color: #183747;
		box-shadow: 0 32px 100px rgba(13, 39, 47, .34);
		overflow: hidden;
	}
	.weather-detail-sheet::backdrop { background: rgba(15, 38, 46, .72); backdrop-filter: blur(10px); }
	.weather-page { display: grid; height: 100%; grid-template-rows: auto minmax(0, 1fr); }
	.weather-page-header { display: flex; min-height: 92px; padding: 20px 30px; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(211, 218, 212, .9); background: rgba(255, 253, 248, .84); backdrop-filter: blur(18px); }
	.weather-kicker { color: #1d706a; font-size: .7rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
	.weather-page-header h1 { margin: 1px 0 0; font-size: clamp(1.65rem, 3vw, 2.35rem); }
	.weather-close { display: grid; width: 50px; height: 50px; place-items: center; border: 1px solid #ccd7d3; border-radius: 50%; background: rgba(255,255,255,.88); cursor: pointer; font-size: 1.75rem; line-height: 1; box-shadow: 0 5px 18px rgba(35,55,54,.08); }
	.weather-close:hover { border-color: #6f9f97; box-shadow: 0 7px 22px rgba(35,55,54,.13); }
	.weather-page-content { padding: 26px 30px 42px; overflow-y: auto; scrollbar-color: transparent transparent; }
	.weather-page-content.is-scrolling { scrollbar-color: rgba(80, 118, 122, .6) transparent; }
	.weather-page-content::-webkit-scrollbar { width: 10px; }
	.weather-page-content::-webkit-scrollbar-track { background: transparent; }
	.weather-page-content::-webkit-scrollbar-thumb { border: 3px solid transparent; border-radius: 99px; background: transparent; background-clip: padding-box; }
	.weather-page-content.is-scrolling::-webkit-scrollbar-thumb { background: rgba(80, 118, 122, .6); background-clip: padding-box; }
	.weather-hero { position: relative; isolation: isolate; display: grid; min-height: 220px; padding: 26px 30px; grid-template-columns: 126px minmax(220px, 1fr) auto; gap: 22px; align-items: center; border: 1px solid #afcec7; border-radius: 26px; background: linear-gradient(130deg, rgba(218, 239, 233, .97), rgba(236, 243, 239, .88)); box-shadow: 0 14px 40px rgba(35, 77, 72, .09), inset 0 1px rgba(255,255,255,.9); overflow: hidden; }
	.weather-hero::after { position: absolute; z-index: -1; top: -110px; right: -60px; width: 380px; height: 380px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,.78), rgba(255,255,255,0) 68%); content: ''; }
	.weather-hero-icon { display: grid; width: 118px; height: 118px; place-items: center; border: 1px solid rgba(255,255,255,.8); border-radius: 32px; background: rgba(255,255,255,.5); box-shadow: inset 0 1px #fff; }
	.weather-hero-copy > span { color: #1d706a; font-size: .72rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
	.weather-hero-copy h2 { margin: 4px 0; font-size: clamp(1.8rem, 4vw, 3.25rem); }
	.weather-hero-copy p { margin: 0; color: #435e62; font-size: 1.05rem; font-weight: 700; }
	.weather-hero-temperature { display: flex; min-width: 120px; flex-direction: column; align-items: end; }
	.weather-hero-temperature strong { font-family: Georgia, 'Times New Roman', serif; font-size: clamp(3.8rem, 8vw, 6.7rem); font-weight: 500; letter-spacing: -.08em; line-height: .85; }
	.weather-hero-temperature span { margin-top: 12px; color: #526267; font-size: .76rem; font-weight: 800; text-transform: uppercase; }
	.weather-summary-metrics { display: grid; grid-column: 1 / -1; grid-template-columns: repeat(3, 1fr); border-top: 1px solid rgba(82, 119, 112, .2); }
	.weather-summary-metrics > div { display: flex; padding: 18px 20px 0; align-items: baseline; justify-content: space-between; border-right: 1px solid rgba(82, 119, 112, .2); }
	.weather-summary-metrics > div:first-child { padding-left: 0; }
	.weather-summary-metrics > div:last-child { padding-right: 0; border-right: 0; }
	.weather-summary-metrics span { color: #526267; font-size: .78rem; font-weight: 700; }
	.weather-summary-metrics strong { font-size: 1.15rem; }
	.hourly-outlook { margin-top: 30px; }
	.hourly-heading { display: flex; margin-bottom: 18px; align-items: end; justify-content: space-between; }
	.hourly-heading span { color: #1d706a; font-size: .7rem; font-weight: 800; letter-spacing: .11em; text-transform: uppercase; }
	.hourly-heading h2 { margin: 2px 0 0; font-size: 1.8rem; }
	.hourly-heading p { margin: 0; color: #526267; font-size: .76rem; font-weight: 700; }
	.day-period { margin-bottom: 25px; }
	.day-period > header { display: flex; margin-bottom: 10px; align-items: baseline; gap: 11px; }
	.day-period h3 { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 1.1rem; }
	.day-period header span { color: #6d797b; font-size: .7rem; }
	.hour-cards { display: grid; grid-template-columns: repeat(6, minmax(128px, 1fr)); gap: 10px; scrollbar-color: transparent transparent; overscroll-behavior-x: auto; -webkit-overflow-scrolling: touch; }
	.hour-cards.is-scrolling { scrollbar-color: rgba(80, 118, 122, .55) transparent; }
	.hour-cards::-webkit-scrollbar { height: 9px; }
	.hour-cards::-webkit-scrollbar-track { background: transparent; }
	.hour-cards::-webkit-scrollbar-thumb { border: 2px solid transparent; border-radius: 99px; background: transparent; background-clip: padding-box; }
	.hour-cards.is-scrolling::-webkit-scrollbar-thumb { background: rgba(80, 118, 122, .55); background-clip: padding-box; }
	.hour-cards article { display: flex; min-width: 0; min-height: 216px; padding: 15px 12px 13px; flex-direction: column; align-items: center; border: 1px solid #d6ded9; border-radius: 20px; background: rgba(255,253,248,.93); box-shadow: 0 7px 22px rgba(35,55,54,.055); text-align: center; }
	.hour-cards article.current { border: 2px solid #1d706a; background: linear-gradient(155deg, #e5f3ee, #fffdf8); box-shadow: 0 0 0 3px rgba(29,112,106,.1), 0 8px 25px rgba(35,55,54,.08); }
	.hour-time { display: flex; min-height: 35px; flex-direction: column; align-items: center; justify-content: center; }
	.hour-time strong { font-size: .86rem; }
	.hour-time span { color: #607174; font-size: .62rem; }
	.hour-temperature { margin-top: -3px; font-family: Georgia, 'Times New Roman', serif; font-size: 1.55rem; }
	.hour-condition { width: 100%; min-height: 32px; margin-top: 1px; color: #526267; font-size: .67rem; font-weight: 700; line-height: 1.2; }
	.hour-facts { display: flex; width: 100%; margin-top: auto; padding-top: 9px; align-items: center; justify-content: space-between; border-top: 1px solid #e4e8e4; color: #526267; font-size: .62rem; font-weight: 700; }
	.hour-facts span { display: inline-flex; gap: 4px; align-items: center; white-space: nowrap; }
	.rain-dot { width: 8px; height: 10px; border-radius: 60% 40% 60% 40%; background: #6596b0; transform: rotate(40deg); }
	.wind-mark { color: #477a77; font-size: .9rem; font-style: normal; line-height: .7; }
	.hourly-empty { display: flex; min-height: 150px; padding: 25px; gap: 18px; align-items: center; border: 1px solid #d6ded9; border-radius: 22px; background: rgba(255,253,248,.88); }
	.hourly-empty > div { display: flex; flex-direction: column; }
	.hourly-empty span { color: #526267; }
	@media (max-width: 900px) {
		.weather-page-content { padding-inline: 22px; }
		.weather-hero { grid-template-columns: 110px minmax(180px, 1fr) auto; padding: 23px; }
		.weather-hero-icon { width: 104px; height: 104px; }
		.hour-cards { grid-template-columns: repeat(6, minmax(122px, 1fr)); overflow-x: auto; padding: 3px 3px 10px; scroll-snap-type: x proximity; }
		.hour-cards article { scroll-snap-align: start; }
	}
	@media (max-width: 620px) {
		.weather-detail-sheet { width: 100vw; height: 100dvh; border-radius: 0; }
		.weather-page-header { min-height: 76px; padding: 14px 17px; }
		.weather-page-content { padding: 16px 14px 90px; }
		.weather-hero { grid-template-columns: 82px 1fr; gap: 13px; padding: 19px; }
		.weather-hero-icon { width: 78px; height: 78px; border-radius: 22px; }
		.weather-hero-icon :global(.weather-glyph) { width: 76px; height: 76px; }
		.weather-hero-copy h2 { font-size: 1.7rem; }
		.weather-hero-temperature { grid-column: 1 / -1; min-width: 0; flex-direction: row; align-items: baseline; justify-content: space-between; }
		.weather-hero-temperature strong { font-size: 3.8rem; }
		.weather-summary-metrics { grid-template-columns: 1fr; }
		.weather-summary-metrics > div, .weather-summary-metrics > div:first-child, .weather-summary-metrics > div:last-child { padding: 11px 0; border-right: 0; border-bottom: 1px solid rgba(82,119,112,.2); }
		.weather-summary-metrics > div:last-child { border-bottom: 0; }
		.hourly-heading { align-items: start; flex-direction: column; }
		.hourly-heading p { margin-top: 4px; }
	}
</style>
