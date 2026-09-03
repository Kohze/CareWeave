<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';

	let { ownerName, onUnlock }: { ownerName: string; onUnlock: () => void } = $props();
	let dialog: HTMLDialogElement;
	let unlockButton: HTMLButtonElement;

	onMount(() => {
		dialog.showModal();
		unlockButton.focus();
	});
</script>

<dialog bind:this={dialog} class="privacy-cover" aria-labelledby="private-screen-title" oncancel={(event) => event.preventDefault()}>
	<span class="privacy-cover-icon"><Icon name="shield" size={38} /></span>
	<span class="eyebrow">Private screen</span>
	<h2 id="private-screen-title">{ownerName}'s details are hidden</h2>
	<p>Use this when visitors can see the wall iPad. This hides the screen; production accounts should also use device authentication.</p>
	<button bind:this={unlockButton} class="primary-button" onclick={onUnlock}>Show {ownerName}'s board</button>
</dialog>
