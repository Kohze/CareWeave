<script lang="ts">
	import type { Reminder } from '$lib/types';
	import Icon from './Icon.svelte';

	let {
		reminder,
		onDone,
		onLater,
		onHelp
	}: {
		reminder: Reminder;
		onDone: () => void;
		onLater: () => void;
		onHelp: () => void;
	} = $props();
</script>

<section class="reminder-controls" aria-labelledby={`reminder-${reminder.id}`}>
	<div class="reminder-heading">
		<span class="reminder-icon"><Icon name="clock" size={22} /></span>
		<div>
			<span>Reminder</span>
			<strong id={`reminder-${reminder.id}`}>{reminder.label}</strong>
		</div>
	</div>
	{#if reminder.status === 'pending' || reminder.status === 'snoozed'}
		<div class="reminder-actions">
			<button class="primary-button" onclick={onDone}><Icon name="check" size={18} /> Done</button>
			<button class="secondary-button" onclick={onLater}>Remind me later</button>
			<button class="text-button" onclick={onHelp}>I need help</button>
		</div>
	{:else if reminder.status === 'help_requested'}
		<p class="reminder-state"><Icon name="family" size={19} /> Your support circle can see that you asked for help.</p>
	{:else if reminder.status === 'help_acknowledged'}
		<p class="reminder-state"><Icon name="check" size={19} /> A trusted supporter has said they are helping.</p>
	{:else}
		<p class="reminder-state"><Icon name="check" size={19} /> Done</p>
	{/if}
</section>
