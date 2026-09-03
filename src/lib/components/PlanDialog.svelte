<script lang="ts">
	import { onMount } from 'svelte';
	import type { ActionPlan, ToolResult } from '../types';
	import Icon from './Icon.svelte';
	let { plan, onApprove, onDiscard }: { plan: ActionPlan; onApprove: () => ToolResult | Promise<ToolResult>; onDiscard: () => void } = $props();
	let email = $derived(plan.steps.find((step) => step.type === 'send_email'));
	let dialog: HTMLDialogElement;
	let safeButton: HTMLButtonElement;
	let error = $state('');
	let saving = $state(false);

	onMount(() => {
		dialog.showModal();
		safeButton.focus();
	});

	function discard(): void {
		if (saving) return;
		dialog.close();
		onDiscard();
	}

	async function approve(): Promise<void> {
		if (saving) return;
		saving = true;
		error = '';
		try {
			const result = await onApprove();
			if (!result.success) {
				error = result.summary;
				return;
			}
			dialog.close();
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'The draft could not be created.';
		} finally {
			saving = false;
		}
	}
</script>

<dialog bind:this={dialog} class="plan-dialog" aria-labelledby="plan-title" aria-describedby="plan-lead" oncancel={(event) => { event.preventDefault(); discard(); }}>
		<div class="dialog-icon"><Icon name="shield" size={30} /></div>
		<span class="eyebrow">Review before anything happens</span>
		<h2 id="plan-title">{plan.title}</h2>
		<p class="dialog-lead" id="plan-lead">Nothing has been sent yet. Check each detail below.</p>

		{#if email}
			<div class="email-preview">
				<div><span>To</span><strong>{String(email.payload.to)}</strong></div>
				<div><span>Subject</span><strong>{String(email.payload.subject)}</strong></div>
				<div class="email-body"><span>Message</span><p>{String(email.payload.body)}</p></div>
			</div>
		{/if}

		<ul class="plan-steps">
			{#each plan.steps as step}<li><Icon name="check" size={19} /> {step.label}</li>{/each}
		</ul>
		{#each plan.warnings as warning}<p class="warning"><strong>Important:</strong> {warning}</p>{/each}
		{#if error}<p class="dialog-error" role="alert"><strong>Nothing changed.</strong> {error}</p>{/if}
		<div class="dialog-actions">
			<button bind:this={safeButton} class="secondary-button" onclick={discard} disabled={saving}>Keep things as they are</button>
			<button class="primary-button" onclick={approve} disabled={saving}>{saving ? 'Creating draft…' : plan.deliveryMode === 'gmail_draft' ? 'Create Gmail draft' : 'Save suggested message'}</button>
		</div>
</dialog>
