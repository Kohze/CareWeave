<script lang="ts">
	import { formatTime } from '../dates';
	import type { CareVisitUpdate, Commitment, Place, Reminder } from '../types';
	import Icon from './Icon.svelte';

	let {
		item,
		place,
		reminder,
		careVisitUpdate,
		highlighted = false,
		selected = false,
		onSelect,
		onRoute,
		onRequest
	}: {
		item: Commitment;
		place?: Place;
		reminder?: Reminder;
		careVisitUpdate?: CareVisitUpdate;
		highlighted?: boolean;
		selected?: boolean;
		onSelect: () => void;
		onRoute: () => void;
		onRequest: () => void;
	} = $props();

	let iconName = $derived(item.kind === 'health' ? 'heart' : item.kind === 'care' ? 'care-visit' : item.kind === 'food' ? 'basket' : item.kind === 'social' ? 'walk' : 'calendar');
	let visibleStatus = $derived(careVisitUpdate?.status ?? item.status);
	let visibleStatusLabel = $derived(visibleStatus === 'checked_in' ? 'arrived' : visibleStatus.replaceAll('_', ' '));
</script>

<article class:highlighted class:selected class="event-card {item.kind}" data-start-at={item.startAt} aria-label={`${item.title}, ${formatTime(item.startAt, item.timeZone)}, ${visibleStatusLabel}${reminder && reminder.status !== 'done' ? ', reminder available' : ''}`}>
	<button class="event-main" onclick={onSelect} aria-expanded={selected} aria-controls={selected ? `event-details-${item.id}` : undefined}>
		<span class="event-time">{formatTime(item.startAt, item.timeZone)}</span>
		<span class="event-icon"><Icon name={iconName} size={26} /></span>
		<span class="event-copy">
			<strong>{item.title}</strong>
			<span>{place?.shortAddress ?? (item.kind === 'care' || item.kind === 'food' ? 'At home' : item.kind === 'social' ? 'Social plan' : `${formatTime(item.startAt, item.timeZone)}–${formatTime(item.endAt, item.timeZone)}`)}</span>
			{#if visibleStatus !== 'confirmed' && visibleStatus !== 'scheduled'}
				<span class="status-pill">{visibleStatusLabel}</span>
			{/if}
		</span>
		<Icon name="arrow" size={22} />
	</button>
	{#if item.kind === 'health' || item.locationId}
		<div class="event-actions">
			{#if item.locationId}<button onclick={onRoute}><Icon name="route" size={20} /> Route</button>{/if}
			{#if item.kind === 'health'}<button onclick={onRequest}>Ask to change</button>{/if}
		</div>
	{/if}
</article>
