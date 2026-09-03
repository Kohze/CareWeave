<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		textSize,
		contrast,
		guidedMode,
		readAloud,
		onTextSize,
		onContrast,
		onGuidedMode,
		onReadAloud,
		onClose
	}: {
		textSize: 'standard' | 'large';
		contrast: 'standard' | 'high';
		guidedMode: boolean;
		readAloud: boolean;
		onTextSize: (value: 'standard' | 'large') => void;
		onContrast: (value: 'standard' | 'high') => void;
		onGuidedMode: (value: boolean) => void;
		onReadAloud: (value: boolean) => void;
		onClose: () => void;
	} = $props();

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

<dialog bind:this={dialog} class="display-sheet" aria-labelledby="display-title" oncancel={(event) => { event.preventDefault(); close(); }}>
	<div class="panel-heading">
		<div><span class="eyebrow">Make ClearDay comfortable</span><h2 id="display-title">Display settings</h2></div>
		<button bind:this={closeButton} class="icon-button" aria-label="Close display settings" onclick={close}>×</button>
	</div>

	<fieldset>
		<legend>Text size</legend>
		<div class="choice-grid">
			<button class:chosen={textSize === 'standard'} aria-pressed={textSize === 'standard'} onclick={() => onTextSize('standard')}><span class="choice-visual sample-a normal">A</span><span class="choice-copy"><strong>Comfortable</strong><small>Clear, easy-to-read text</small></span></button>
			<button class:chosen={textSize === 'large'} aria-pressed={textSize === 'large'} onclick={() => onTextSize('large')}><span class="choice-visual sample-a large">A</span><span class="choice-copy"><strong>Extra large</strong><small>Bigger text throughout</small></span></button>
		</div>
	</fieldset>

	<fieldset>
		<legend>Contrast</legend>
		<div class="choice-grid">
			<button class:chosen={contrast === 'standard'} aria-pressed={contrast === 'standard'} onclick={() => onContrast('standard')}><span class="choice-visual contrast-sample standard">Aa</span><span class="choice-copy"><strong>Soft</strong><small>Warm background and gentle lines</small></span></button>
			<button class:chosen={contrast === 'high'} aria-pressed={contrast === 'high'} onclick={() => onContrast('high')}><span class="choice-visual contrast-sample high">Aa</span><span class="choice-copy"><strong>High contrast</strong><small>Darker text and stronger lines</small></span></button>
		</div>
	</fieldset>

	<fieldset>
		<legend>Keep the day simple</legend>
		<div class="choice-grid">
			<button class:chosen={!guidedMode} aria-pressed={!guidedMode} onclick={() => onGuidedMode(false)}><span class="choice-visual"><Icon name="calendar" size={25} /></span><span class="choice-copy"><strong>Full day</strong><small>Show the whole day</small></span></button>
			<button class:chosen={guidedMode} aria-pressed={guidedMode} onclick={() => onGuidedMode(true)}><span class="choice-visual"><Icon name="arrow" size={25} /></span><span class="choice-copy"><strong>Guided</strong><small>Highlight what comes next</small></span></button>
		</div>
	</fieldset>

	<fieldset>
		<legend>Reading support</legend>
		<div class="choice-grid">
			<button class:chosen={!readAloud} aria-pressed={!readAloud} onclick={() => onReadAloud(false)}><span class="choice-visual sample-a normal">Aa</span><span class="choice-copy"><strong>Read myself</strong><small>No automatic speech</small></span></button>
			<button class:chosen={readAloud} aria-pressed={readAloud} onclick={() => onReadAloud(true)}><span class="choice-visual"><Icon name="mic" size={25} /></span><span class="choice-copy"><strong>Read details aloud</strong><small>Speak details when opened</small></span></button>
		</div>
	</fieldset>

	<p class="settings-note"><Icon name="check" size={20} /> Your choice is remembered on this iPad.</p>
</dialog>
