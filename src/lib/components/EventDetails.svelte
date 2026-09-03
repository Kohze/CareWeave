<script lang="ts">
	import { formatDay, formatTime } from '../dates';
	import type { Commitment, Person, Place, Reminder, SourceMessage } from '../types';
	import Icon from './Icon.svelte';
	import ReminderControls from './ReminderControls.svelte';

	let {
		item,
		place,
		participants,
		sources,
		reminder,
		onClose,
		showClose = true,
		onTogglePrep,
		onRoute,
		onRequest,
		onReminder
	}: {
		item: Commitment;
		place?: Place;
		participants: Person[];
		sources: SourceMessage[];
		reminder?: Reminder;
		onClose: () => void;
		showClose?: boolean;
		onTogglePrep: (prepId: string) => void;
		onRoute: () => void;
		onRequest: (request: 'reschedule' | 'cancel') => void;
		onReminder: (response: 'done' | 'snooze' | 'need_help') => void;
	} = $props();

	const kindLabels: Record<Commitment['kind'], string> = {
		health: 'Health appointment',
		care: 'Care visit',
		food: 'Meal',
		shopping: 'Shopping',
		travel: 'Travel',
		household: 'Home task',
		social: 'Social plan',
		administrative: 'Admin task'
	};

	const fallbackDescriptions: Record<Commitment['kind'], string> = {
		health: 'A health appointment. Open the preparation list below before you leave.',
		care: 'A planned care visit at home.',
		food: 'A planned meal in your day.',
		shopping: 'A shopping trip for the things needed at home.',
		travel: 'Planned travel time.',
		household: 'A task to take care of at home.',
		social: 'Time set aside with someone you know.',
		administrative: 'An administrative task that needs attention.'
	};

	function senderName(from: string): string {
		return from.replace(/\s*<.*>$/, '');
	}
</script>

<section class="detail-panel" id={`event-details-${item.id}`} aria-labelledby="event-details-title" tabindex="-1">
	<div class="panel-heading">
		<div><span class="eyebrow">{kindLabels[item.kind]}</span><h2 id="event-details-title">{item.title}</h2></div>
		{#if showClose}<button class="icon-button" aria-label="Close details" onclick={onClose}>×</button>{/if}
	</div>

	<div class="detail-about">
		<h3>What this is about</h3>
		<p>{item.notes ?? fallbackDescriptions[item.kind]}</p>
	</div>

	<dl class="event-facts">
		<div>
			<dt><Icon name="clock" size={23} /> When</dt>
			<dd><strong>{formatDay(item.startAt.slice(0, 10))}</strong><span>{formatTime(item.startAt, item.timeZone)}–{formatTime(item.endAt, item.timeZone)}</span>{#if item.timeZone}<small>{item.timeZone.replace('_', ' ')}</small>{/if}</dd>
		</div>
		{#if place}
			<div>
				<dt><Icon name="route" size={23} /> Where</dt>
				<dd><strong>{place.name}</strong><span>{place.address}</span></dd>
			</div>
		{:else}
			<div>
				<dt><Icon name="route" size={23} /> Where</dt>
				<dd><strong>At home</strong></dd>
			</div>
		{/if}
		{#if participants.length}
			<div>
				<dt><Icon name="who" size={23} /> Who</dt>
				<dd class="people-list">
					{#each participants as person}
						<span><strong>{person.name}</strong><small>{person.role}</small>{#if person.phone}<small>{person.phone}</small>{/if}{#if person.email}<small>{person.email}</small>{/if}</span>
					{/each}
				</dd>
			</div>
		{/if}
	</dl>

	<p class="confirmation-line"><Icon name="shield" size={20} /><span><strong>{item.status.replaceAll('_', ' ')}</strong>{item.status === 'confirmed' ? ' — this time is in your calendar.' : ' — the original time stays here until a reply confirms otherwise.'}</span></p>

	{#if reminder}
		<ReminderControls {reminder} onDone={() => onReminder('done')} onLater={() => onReminder('snooze')} onHelp={() => onReminder('need_help')} />
	{/if}

	{#if sources.length}
		<div class="detail-source">
			<Icon name="mail" size={21} />
			<div><span>Added from a message</span><strong>{sources[0].subject}</strong><small>From {senderName(sources[0].from)}</small></div>
		</div>
	{/if}

	{#if item.prep.length}
		<h3>Bring with you</h3>
		<div class="check-list">
			{#each item.prep as prep}
				<button class:done={prep.done} onclick={() => onTogglePrep(prep.id)}><span><Icon name="check" size={18} /></span>{prep.label}</button>
			{/each}
		</div>
	{/if}

	{#if item.locationId}<button class="secondary-button wide" onclick={onRoute}><Icon name="route" size={20} /> Show route on map</button>{/if}
	{#if item.kind === 'health'}
		<button class="primary-button wide" onclick={() => onRequest('reschedule')}>Ask to move this</button>
		<button class="text-button" onclick={() => onRequest('cancel')}>I need to cancel instead</button>
	{/if}
</section>
