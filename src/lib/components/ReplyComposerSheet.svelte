<script lang="ts">
	import { onMount } from 'svelte';
	import type { AttentionItem, SourceMessage } from '../types';
	import Icon from './Icon.svelte';

	let { item, source, onReview, onClose }: { item: AttentionItem; source?: SourceMessage; onReview: (message: string) => void; onClose: () => void } = $props();
	let dialog: HTMLDialogElement;
	let textarea: HTMLTextAreaElement;
	let message = $state('');
	let listening = $state(false);
	let dictationSupported = $state(false);
	let error = $state('');
	let recognition: CareWeaveSpeechRecognition | undefined;

	onMount(() => {
		const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
		dictationSupported = Boolean(Recognition);
		if (Recognition) {
			const instance = new Recognition();
			recognition = instance;
			instance.lang = 'en-GB';
			instance.continuous = false;
			instance.interimResults = false;
			instance.onresult = (event) => {
				const spoken = Array.from(event.results).map((result) => result[0]?.transcript ?? '').join(' ').trim();
				if (spoken) message = `${message.trim()}${message.trim() ? ' ' : ''}${spoken}`;
			};
			instance.onerror = () => { error = 'I could not hear that clearly. Try again, or type the reply below.'; };
			instance.onend = () => { listening = false; textarea?.focus({ preventScroll: true }); };
		}
		dialog.showModal();
		requestAnimationFrame(() => (dictationSupported ? dialog.querySelector<HTMLButtonElement>('.dictate-button') : textarea)?.focus({ preventScroll: true }));
		return () => recognition?.stop();
	});

	function toggleDictation(): void {
		if (!recognition) return;
		error = '';
		if (listening) {
			recognition.stop();
			return;
		}
		listening = true;
		try { recognition.start(); }
		catch { listening = false; error = 'Dictation is already active. Wait a moment and try again.'; }
	}

	function close(): void {
		recognition?.stop();
		dialog.close();
		onClose();
	}

	function review(): void {
		if (message.trim().length < 2) {
			error = 'Say or type the reply you want to review.';
			textarea.focus({ preventScroll: true });
			return;
		}
		recognition?.stop();
		dialog.close();
		onReview(message.trim());
	}
</script>

<dialog bind:this={dialog} class="reply-composer-sheet" aria-labelledby="reply-composer-title" oncancel={(event) => { event.preventDefault(); close(); }}>
	<header><div><span class="eyebrow">Your words, your decision</span><h2 id="reply-composer-title">Reply to {item.title}</h2></div><button class="icon-button" aria-label="Close reply composer" onclick={close}>×</button></header>
	<p class="reply-context">{source ? `Replying to ${source.from}` : 'Prepare a reply for review'}</p>
	<button class:listening class="dictate-button" onclick={toggleDictation} disabled={!dictationSupported}><span><Icon name="mic" size={29} /></span><span><strong>{listening ? 'Listening… tap to stop' : dictationSupported ? 'Speak your reply' : 'Voice dictation is unavailable'}</strong><small>{dictationSupported ? 'Your words will appear below' : 'You can still type your reply below'}</small></span></button>
	<label for="reply-message">Your reply</label>
	<textarea bind:this={textarea} id="reply-message" bind:value={message} rows="7" placeholder="For example: Hello, the smaller bottle is fine. Thank you."></textarea>
	{#if error}<p class="dialog-error" role="alert">{error}</p>{/if}
	<p class="privacy-note"><Icon name="shield" size={19} /> Browser dictation may process speech using your device or browser provider. CareWeave stores only the text you choose to review.</p>
	<div class="dialog-actions"><button class="secondary-button" onclick={close}>Cancel</button><button class="primary-button" onclick={review}>Review reply</button></div>
</dialog>
