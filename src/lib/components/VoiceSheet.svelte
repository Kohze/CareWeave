<script lang="ts">
	import { onMount } from 'svelte';
	import type { VoiceStatus } from '../realtime';
	import Icon from './Icon.svelte';
	let {
		supported,
		status,
		statusMessage,
		transcript,
		response,
		onConversation,
		onExample,
		onClose
	}: {
		supported: boolean;
		status: VoiceStatus;
		statusMessage: string;
		transcript: string;
		response: string;
		onConversation: () => void;
		onExample: (command: string) => void;
		onClose: () => void;
	} = $props();
	let dialog = $state<HTMLDialogElement>();
	let closeButton = $state<HTMLButtonElement>();
	let conversationButton = $state<HTMLButtonElement>();
	let active = $derived(status === 'connecting' || status === 'listening' || status === 'thinking' || status === 'speaking');
	let buttonLabel = $derived(active ? 'End conversation' : status === 'error' ? 'Try again' : 'Start conversation');
	onMount(() => {
		dialog?.showModal();
		(supported ? conversationButton : closeButton)?.focus();
	});

	function close(): void {
		dialog?.close();
		onClose();
	}
</script>

<dialog bind:this={dialog} class="voice-sheet" aria-labelledby="voice-title" oncancel={(event) => { event.preventDefault(); close(); }}>
		<button bind:this={closeButton} class="icon-button close" aria-label="Close voice help" onclick={close}>×</button>
		<div class:listening={status === 'listening'} class:speaking={status === 'speaking'} class:thinking={status === 'thinking' || status === 'connecting'} class="voice-orb"><Icon name="mic" size={38} /></div>
		<span class="eyebrow">{supported ? 'Conversational voice' : 'Voice needs a modern browser'}</span>
		<h2 id="voice-title">What would you like help with?</h2>
		{#if supported}
			<p>Start once, then have a normal back-and-forth conversation. You can interrupt ClearDay. Messages and appointment changes always need a tap on the review screen.</p>
			<button bind:this={conversationButton} class="listen-button" class:listening={active} onclick={onConversation} disabled={status === 'connecting'}><Icon name="mic" size={27} /> {status === 'connecting' ? 'Connecting…' : buttonLabel}</button>
			<div class="voice-status" data-status={status} aria-live="polite"><span aria-hidden="true"></span><strong>{status === 'idle' ? 'Ready' : status === 'error' ? 'Could not connect' : status}</strong><p>{statusMessage}</p></div>
		{:else}
			<p>This browser cannot run the embedded conversation. Open ClearDay in a WebMCP-capable ChatGPT browser to use its website tools, or use one of the examples below.</p>
		{/if}
		{#if transcript}<p class="heard"><strong>You:</strong> “{transcript}”</p>{/if}
		{#if response}<p class="voice-response" aria-live="polite"><strong>ClearDay:</strong> {response}</p>{/if}
		<div class="suggestions">
			<button onclick={() => onExample('What do I need to do today?')}>“What do I need to do today?”</button>
			<button onclick={() => onExample('When should I leave for the doctor?')}>“When should I leave for the doctor?”</button>
			<button onclick={() => onExample('Ask the clinic to move my appointment.')}>“Ask the clinic to move my appointment.”</button>
		</div>
		<p class="privacy-note"><Icon name="shield" size={19} /> While connected, OpenAI processes your speech. Voice can prepare; only you can approve.</p>
</dialog>
