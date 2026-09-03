<script lang="ts">
	import { onMount } from 'svelte';
	import { Atmosphere } from '@takustaqu/atmosphere';
	import type { WeatherScene } from '$lib/weather';

	let {
		forecast,
		location,
		time
	}: {
		forecast: WeatherScene;
		location: { latitude: number; longitude: number };
		time: Date;
	} = $props();

	let canvas: HTMLCanvasElement;
	let sky = $state.raw<Atmosphere>();
	let renderer = $state<'loading' | 'webgl' | 'fallback'>('loading');
	let frame = 0;

	onMount(() => {
		let instance: Atmosphere | undefined;
		let initializationTimer = 0;
		let active = true;
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		renderer = 'fallback';

		// The CSS sky renders immediately. Upgrade a long-running cover to WebGL
		// only after it has stayed open, avoiding an expensive shader compile for
		// quick privacy checks and avoiding GPU allocation in reduced-motion mode.
		if (!reducedMotion) {
			initializationTimer = window.setTimeout(() => {
				if (!active) return;
				instance = new Atmosphere(canvas, {
					time,
					location,
					weather: forecast.atmosphere,
					camera: { yaw: Math.PI, pitch: .42, fov: .92 },
					fps: 30,
					respectReducedMotion: false
				});
				sky = instance;
				void instance.ready.then((available) => {
					if (active) renderer = available ? 'webgl' : 'fallback';
				});
			}, 8_000);
		}

		let animationFrame = 0;
		const markFrame = () => {
			frame += 1;
			if (frame % 4 === 0) canvas.dataset.frame = String(frame);
			animationFrame = requestAnimationFrame(markFrame);
		};
		if (!reducedMotion) animationFrame = requestAnimationFrame(markFrame);

		return () => {
			active = false;
			window.clearTimeout(initializationTimer);
			cancelAnimationFrame(animationFrame);
			instance?.dispose({ loseContext: true });
			sky = undefined;
		};
	});

	$effect(() => {
		const instance = sky;
		if (!instance) return;
		instance.set({ time, location, weather: forecast.atmosphere });
		instance.start();
	});
</script>

<div class={`weather-canvas weather-${forecast.condition} renderer-${renderer}`}>
	<canvas bind:this={canvas} class="weather-sky" data-frame="0" data-renderer={renderer}></canvas>
	<div class="weather-fallback" aria-hidden="true">
		<div class="sky-glow"></div>
		<div class="cloud-layer cloud-far"></div>
		<div class="cloud-layer cloud-near"></div>
		<div class="weather-particles"></div>
		<div class="lightning-glow"></div>
	</div>
	<div class="weather-vignette"></div>
</div>

<style>
	.weather-canvas,
	canvas,
	.weather-fallback,
	.weather-vignette {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.weather-canvas { overflow: hidden; background: #7aa4b2; }
	.weather-fallback {
		z-index: 0;
		overflow: hidden;
		background: linear-gradient(165deg, #9fc8d3 0%, #547f94 52%, #315869 100%);
		transition: background 1.5s ease;
	}
	.weather-clear .weather-fallback { background: linear-gradient(165deg, #90d5ea 0%, #4a9fc4 55%, #1c668f 100%); }
	.weather-fair .weather-fallback { background: linear-gradient(165deg, #a8d7dc 0%, #6aa3b2 52%, #35677a 100%); }
	.weather-overcast .weather-fallback { background: linear-gradient(165deg, #aab8bc 0%, #687c84 56%, #394f59 100%); }
	.weather-rain .weather-fallback { background: linear-gradient(165deg, #718995 0%, #3b5b69 52%, #1d3946 100%); }
	.weather-thunderstorm .weather-fallback { background: linear-gradient(165deg, #555b70 0%, #303746 48%, #151e2a 100%); }
	.weather-snow .weather-fallback { background: linear-gradient(165deg, #d9e4e6 0%, #9fb4bf 55%, #627f91 100%); }
	.weather-fog .weather-fallback { background: linear-gradient(165deg, #d5d9d5 0%, #aebdbc 52%, #788f92 100%); }
	.sky-glow,
	.cloud-layer,
	.weather-particles,
	.lightning-glow { position: absolute; inset: 0; }
	.sky-glow {
		top: -22vmax;
		left: -10vmax;
		width: 60vmax;
		height: 60vmax;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 239, 174, .92) 0 6%, rgba(255, 226, 145, .42) 18%, transparent 59%);
		filter: blur(3px);
		animation: sun-breathe 7s ease-in-out infinite alternate;
	}
	.cloud-layer {
		inset: -18% -32%;
		background:
			radial-gradient(ellipse at 12% 34%, rgba(244, 249, 246, .62) 0 8%, transparent 22%),
			radial-gradient(ellipse at 34% 68%, rgba(228, 239, 238, .52) 0 11%, transparent 28%),
			radial-gradient(ellipse at 62% 25%, rgba(244, 247, 242, .55) 0 9%, transparent 25%),
			radial-gradient(ellipse at 86% 72%, rgba(218, 231, 232, .46) 0 12%, transparent 29%);
		filter: blur(18px);
		opacity: .5;
		animation: clouds-drift 34s linear infinite;
	}
	.cloud-near {
		inset: -24% -40%;
		background:
			radial-gradient(ellipse at 18% 72%, rgba(235, 242, 240, .62) 0 10%, transparent 29%),
			radial-gradient(ellipse at 48% 34%, rgba(211, 224, 226, .57) 0 13%, transparent 31%),
			radial-gradient(ellipse at 78% 64%, rgba(240, 245, 241, .54) 0 12%, transparent 30%);
		filter: blur(28px);
		opacity: .42;
		animation-duration: 48s;
		animation-direction: reverse;
	}
	.weather-clear .cloud-layer { opacity: .12; }
	.weather-fair .cloud-layer { opacity: .38; }
	.weather-overcast .cloud-layer,
	.weather-rain .cloud-layer,
	.weather-snow .cloud-layer,
	.weather-thunderstorm .cloud-layer { opacity: .78; }
	.weather-fog .cloud-layer { opacity: .94; filter: blur(38px); }
	.weather-overcast .sky-glow,
	.weather-rain .sky-glow,
	.weather-snow .sky-glow,
	.weather-fog .sky-glow { opacity: .25; }
	.weather-thunderstorm .sky-glow { opacity: 0; }
	.weather-particles { opacity: 0; pointer-events: none; }
	.weather-rain .weather-particles,
	.weather-thunderstorm .weather-particles {
		opacity: .48;
		background-image: repeating-linear-gradient(106deg, transparent 0 19px, rgba(221, 242, 243, .72) 20px 21px, transparent 22px 43px);
		background-size: 250px 190px;
		animation: rain-fall 1.15s linear infinite;
	}
	.weather-thunderstorm .weather-particles { opacity: .62; animation-duration: .82s; }
	.weather-snow .weather-particles {
		opacity: .78;
		background-image:
			radial-gradient(circle, rgba(255,255,255,.9) 0 2px, transparent 3px),
			radial-gradient(circle, rgba(255,255,255,.64) 0 1.5px, transparent 2.5px);
		background-position: 0 0, 43px 67px;
		background-size: 112px 118px, 79px 91px;
		animation: snow-fall 9s linear infinite;
	}
	.lightning-glow {
		opacity: 0;
		background: radial-gradient(circle at 68% 26%, rgba(239, 244, 255, .95), rgba(181, 197, 231, .36) 17%, transparent 48%);
	}
	.weather-thunderstorm .lightning-glow { animation: lightning-flash 9s linear infinite; }
	canvas { z-index: 1; display: block; opacity: 0; transition: opacity 1.2s ease; }
	.renderer-webgl canvas { opacity: 1; }
	.weather-vignette {
		z-index: 2;
		pointer-events: none;
		background: linear-gradient(180deg, rgba(6, 27, 39, .06), rgba(4, 24, 34, .18)), radial-gradient(circle at center, transparent 34%, rgba(4, 24, 34, .25) 100%);
	}
	@keyframes clouds-drift { from { transform: translate3d(-8%, 0, 0) scale(1.03); } to { transform: translate3d(8%, 2%, 0) scale(1.08); } }
	@keyframes sun-breathe { from { transform: scale(.96); opacity: .82; } to { transform: scale(1.06); opacity: 1; } }
	@keyframes rain-fall { from { background-position: 0 -190px; } to { background-position: -42px 190px; } }
	@keyframes snow-fall { from { background-position: 0 -118px, 43px -24px; } to { background-position: 45px 118px, 8px 158px; } }
	@keyframes lightning-flash { 0%, 72%, 75%, 79%, 100% { opacity: 0; } 73%, 77% { opacity: .78; } }
	@media (prefers-reduced-motion: reduce) {
		.weather-fallback,
		.sky-glow,
		.cloud-layer,
		.weather-particles,
		.lightning-glow,
		canvas { animation: none !important; transition: none !important; }
	}
</style>
