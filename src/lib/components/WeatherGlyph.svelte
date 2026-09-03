<script lang="ts">
	import type { WeatherId } from '@takustaqu/atmosphere';
	import clearDay from '@meteocons/svg/fill/clear-day.svg';
	import mostlyClearDay from '@meteocons/svg/fill/mostly-clear-day.svg';
	import partlyCloudyDay from '@meteocons/svg/fill/partly-cloudy-day.svg';
	import fog from '@meteocons/svg/fill/fog.svg';
	import rain from '@meteocons/svg/fill/overcast-day-rain.svg';
	import thunderstorms from '@meteocons/svg/fill/thunderstorms-day-rain.svg';
	import snow from '@meteocons/svg/fill/overcast-day-snow.svg';
	import hurricane from '@meteocons/svg/fill/hurricane.svg';

	let { condition, size = 32 }: { condition: WeatherId; size?: number } = $props();
	const icons: Record<WeatherId, string> = {
		clear: clearDay,
		fair: partlyCloudyDay,
		summer: mostlyClearDay,
		overcast: '/weather-overcast.svg',
		fog,
		rain,
		thunderstorm: thunderstorms,
		snow,
		typhoon: hurricane
	};
</script>

<img class="weather-glyph" src={icons[condition]} width={size} height={size} alt="" aria-hidden="true" />
