<script lang="ts">
	import { onMount } from 'svelte';
	import 'leaflet/dist/leaflet.css';
	import type { Map as LeafletMap } from 'leaflet';
	import { formatDay, formatTime } from '../dates';
	import type { RoutePlan } from '../types';
	import Icon from './Icon.svelte';
	let { route, onClose }: { route: RoutePlan; onClose: () => void } = $props();
	let mapElement: HTMLDivElement;
	let map: LeafletMap | undefined;
	let mapReady = $state(false);
	let mapStatus = $state('Loading map…');
	let tileErrors = 0;
	const directionsUrl = $derived(`https://maps.apple.com/?saddr=${route.origin.latitude},${route.origin.longitude}&daddr=${route.destinationPoint.latitude},${route.destinationPoint.longitude}&dirflg=w`);

	onMount(() => {
		let disposed = false;
		let tileFailureTimer: number | undefined;
		const showOfflineState = () => { mapStatus = 'Map background unavailable. The written directions still work.'; };
		window.addEventListener('offline', showOfflineState);
		if (!navigator.onLine) showOfflineState();
		void import('leaflet').then((L) => {
			if (disposed) return;
			map = L.map(mapElement, {
				zoomControl: false,
				scrollWheelZoom: false,
				keyboard: true,
				attributionControl: true
			});
			L.control.zoom({ position: 'topright' }).addTo(map);
			const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
			});
			tileFailureTimer = window.setTimeout(() => {
				if (mapStatus !== 'Map ready.') mapStatus = 'Map background unavailable. The written directions still work.';
			}, 2500);
			tiles.on('tileload', () => {
				mapStatus = 'Map ready.';
				window.clearTimeout(tileFailureTimer);
			});
			tiles.on('tileerror', () => {
				tileErrors += 1;
				if (tileErrors >= 3 && mapStatus !== 'Map ready.') mapStatus = 'Map background unavailable. The written directions still work.';
			});
			tiles.addTo(map);

			const coordinates = route.path.map((point) => [point.latitude, point.longitude] as [number, number]);
			const line = L.polyline(coordinates, { color: '#126f69', weight: 7, opacity: 0.92 }).addTo(map);
			const pin = (symbol: string) => L.divIcon({
				className: 'careweave-map-pin',
				html: `<span aria-hidden="true">${symbol}</span>`,
				iconSize: [48, 48],
				iconAnchor: [24, 42]
			});
			L.marker([route.origin.latitude, route.origin.longitude], { icon: pin('H'), title: 'Home', keyboard: false, interactive: false }).addTo(map);
			L.marker([route.destinationPoint.latitude, route.destinationPoint.longitude], { icon: pin('D'), title: route.destination, keyboard: false, interactive: false }).addTo(map);
			map.fitBounds(line.getBounds(), { paddingTopLeft: [45, 40], paddingBottomRight: [45, 55], maxZoom: 16 });
			mapReady = true;
			requestAnimationFrame(() => map?.invalidateSize());
		}).catch(() => {
			mapStatus = 'Map unavailable. The written directions still work.';
		});
		return () => {
			disposed = true;
			window.clearTimeout(tileFailureTimer);
			window.removeEventListener('offline', showOfflineState);
			map?.remove();
			map = undefined;
		};
	});
</script>

<section class="route-panel" aria-labelledby="route-title">
	<div class="panel-heading">
		<div><span class="eyebrow">Route for {formatDay(route.leaveAt.slice(0, 10))}</span><h2 id="route-title">To {route.destination}</h2></div>
		<button class="icon-button" aria-label="Close route" onclick={onClose}>×</button>
	</div>
	<div class="route-focus-grid">
		<div class="route-map-column">
			<div class="route-summary">
				<Icon name="walk" size={28} />
				<div><strong>Leave at {formatTime(route.leaveAt, route.timeZone)}</strong><span>{route.durationMinutes} min walk · 5 min early</span></div>
			</div>
			<div class="route-map-shell">
				<div bind:this={mapElement} class="route-map" role="region" aria-label={`Interactive map from Home to ${route.destination}`} data-map-ready={mapReady}></div>
				{#if mapStatus !== 'Map ready.'}<p class:error={mapStatus.includes('unavailable')} class="map-status" role="status">{mapStatus}</p>{/if}
			</div>
		</div>
		<div class="route-direction-column">
			<a class="secondary-button wide map-link" href={directionsUrl} target="_blank" rel="noreferrer"><Icon name="route" size={20} /> Open full directions <span class="visually-hidden">in a new tab</span></a>
			<h3>Walking directions</h3>
			<ol class="route-steps">
				{#each route.steps as step}
					<li><span></span><p>{step.instruction}<small>{step.minutes} min</small></p></li>
				{/each}
			</ol>
			<p class="map-note">The map uses fictional demonstration locations. Confirm the address and live conditions before leaving.</p>
		</div>
	</div>
</section>
