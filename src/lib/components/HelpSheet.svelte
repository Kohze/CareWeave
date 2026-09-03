<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';

	let { supporterName, supporterPhone, onClose }: { supporterName?: string; supporterPhone?: string; onClose: () => void } = $props();
	let dialog: HTMLDialogElement;
	let closeButton: HTMLButtonElement;

	onMount(() => {
		dialog.showModal();
		closeButton.focus();
	});

	function close(): void {
		dialog.close();
		onClose();
	}
</script>

<dialog bind:this={dialog} class="help-sheet" aria-labelledby="help-title" oncancel={(event) => { event.preventDefault(); close(); }}>
	<div class="panel-heading">
		<div><span class="eyebrow">Human help</span><h2 id="help-title">Do you need help now?</h2></div>
		<button bind:this={closeButton} class="icon-button" aria-label="Close urgent help" onclick={close}>×</button>
	</div>
	<p class="emergency-boundary"><Icon name="shield" size={24} /><span><strong>ClearDay is not an emergency monitoring service.</strong> It cannot detect a fall, illness, or whether someone is safe.</span></p>
	<div class="help-actions">
		{#if supporterPhone}<a class="secondary-button" href={`tel:${supporterPhone}`}><Icon name="family" size={22} /> Call {supporterName ?? 'my trusted person'}</a>{/if}
		<a class="emergency-call" href="tel:112"><Icon name="care" size={22} /> Call emergency services: 112</a>
	</div>
	<p class="help-note">If it is not an emergency, close this and use <strong>I need help</strong> on the relevant reminder.</p>
</dialog>
