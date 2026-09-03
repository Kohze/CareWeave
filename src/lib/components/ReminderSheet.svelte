<script lang="ts">
	import { onMount } from 'svelte';
	import { formatDay, formatTime } from '$lib/dates';
	import type { Commitment, Reminder } from '$lib/types';
	import Icon from './Icon.svelte';
	import ReminderControls from './ReminderControls.svelte';

	let {
		reminder,
		item,
		onResponse,
		onClose
	}: {
		reminder: Reminder;
		item: Commitment;
		onResponse: (response: 'done' | 'snooze' | 'need_help') => void;
		onClose: () => void;
	} = $props();

	let dialog: HTMLDialogElement;
	let closeButton: HTMLButtonElement;

	onMount(() => {
		dialog.showModal();
		closeButton.focus({ preventScroll: true });
	});

	function close(): void {
		dialog.close();
		onClose();
	}
</script>

<dialog bind:this={dialog} class="reminder-sheet" aria-labelledby="reminder-sheet-title" oncancel={(event) => { event.preventDefault(); close(); }}>
	<div class="reminder-sheet-heading">
		<span class="dialog-icon"><Icon name="clock" size={28} /></span>
		<div>
			<span class="eyebrow">A gentle reminder</span>
			<h2 id="reminder-sheet-title">{item.title}</h2>
			<p>{formatDay(item.startAt.slice(0, 10))} at {formatTime(item.startAt, item.timeZone)}</p>
		</div>
	</div>

	<ReminderControls
		{reminder}
		onDone={() => onResponse('done')}
		onLater={() => onResponse('snooze')}
		onHelp={() => onResponse('need_help')}
	/>

	<button bind:this={closeButton} class="secondary-button wide" onclick={close}>Back to my day</button>
</dialog>
