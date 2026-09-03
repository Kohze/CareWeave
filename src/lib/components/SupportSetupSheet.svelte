<script lang="ts">
	import { onMount } from 'svelte';
	import { supportMemberIsActive } from '$lib/support';
	import type { AppData, SupportPermission, ToolResult } from '$lib/types';
	import Icon from './Icon.svelte';

	let {
		data,
		onInvite,
		onUpdate,
		onPreview,
		onClose
	}: {
		data: AppData;
		onInvite: (input: { name: string; relationship: string; email: string; permissions: SupportPermission[]; durationDays?: number }) => ToolResult;
		onUpdate: (personId: string, input: { permissions?: SupportPermission[]; durationDays?: number; revoke?: boolean }) => ToolResult;
		onPreview: (personId: string) => void;
		onClose: () => void;
	} = $props();

	let dialog: HTMLDialogElement;
	let closeButton: HTMLButtonElement;
	let name = $state('');
	let relationship = $state('');
	let email = $state('');
	let duration = $state('30');
	let invitePermissions = $state<SupportPermission[]>(['view_schedule', 'view_care_status', 'view_food_status', 'suggest_help', 'respond_to_help']);
	let confirmingId = $state<string>();
	let feedback = $state('');

	const permissionChoices: Array<{ id: SupportPermission; label: string }> = [
		{ id: 'view_schedule', label: 'Schedule' },
		{ id: 'view_care_status', label: 'Care visit status' },
		{ id: 'view_food_status', label: 'Food coverage' },
		{ id: 'view_attention_count', label: 'Number needing review' },
		{ id: 'suggest_help', label: 'Offer help' },
		{ id: 'respond_to_help', label: 'Respond when I ask for help' }
	];

	onMount(() => {
		dialog.showModal();
		closeButton.focus();
	});

	function close(): void {
		dialog.close();
		onClose();
	}

	function toggleInvitePermission(permission: SupportPermission): void {
		invitePermissions = invitePermissions.includes(permission)
			? invitePermissions.filter((candidate) => candidate !== permission)
			: [...invitePermissions, permission];
	}

	function toggleMemberPermission(personId: string, permission: SupportPermission): void {
		const member = data.supportCircle.find((candidate) => candidate.personId === personId);
		if (!member) return;
		const permissions = member.permissions.includes(permission)
			? member.permissions.filter((candidate) => candidate !== permission)
			: [...member.permissions, permission];
		if (permissions.length) feedback = onUpdate(personId, { permissions }).summary;
	}

	function invite(): void {
		const result = onInvite({
			name,
			relationship,
			email,
			permissions: invitePermissions,
			durationDays: duration === 'none' ? undefined : Number(duration)
		});
		feedback = result.summary;
		if (result.success) {
			name = '';
			relationship = '';
			email = '';
		}
	}
</script>

<dialog bind:this={dialog} class="support-setup-sheet" aria-labelledby="support-setup-title" oncancel={(event) => { event.preventDefault(); close(); }}>
	<div class="panel-heading">
		<div><span class="eyebrow">Private setup</span><h2 id="support-setup-title">Who can help</h2><p>Choose exactly what each person can see or do.</p></div>
		<button bind:this={closeButton} class="icon-button" aria-label="Close support settings" onclick={close}>×</button>
	</div>

	<section class="access-section" aria-labelledby="current-supporters-title">
		<h3 id="current-supporters-title">People you have chosen</h3>
		{#each data.supportCircle as member (member.personId)}
			{@const person = data.people.find((candidate) => candidate.id === member.personId)}
			<article class="access-person">
				<div class="access-person-heading">
					<span class="avatar small">{person?.name.slice(0, 1)}</span>
					<div><strong>{person?.name}</strong><small>{member.relationship} · {supportMemberIsActive(member) ? 'Access active' : member.status === 'invited' ? 'Invitation waiting' : member.status === 'revoked' ? 'Access removed' : 'Access expired'}</small></div>
					{#if supportMemberIsActive(member)}<button class="secondary-button" onclick={() => onPreview(member.personId)}>Preview their view</button>{/if}
				</div>
				{#if member.status !== 'revoked'}
					<div class="permission-grid" aria-label={`What ${person?.name} can access`}>
						{#each permissionChoices as permission}
							<button class:chosen={member.permissions.includes(permission.id)} aria-pressed={member.permissions.includes(permission.id)} onclick={() => toggleMemberPermission(member.personId, permission.id)}>{permission.label}</button>
						{/each}
					</div>
					<div class="access-lifetime">
						<span>{member.accessExpiresAt ? `Ends ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(member.accessExpiresAt))}` : 'No automatic end date'}</span>
						<button class="text-button" onclick={() => feedback = onUpdate(member.personId, { durationDays: 30 }).summary}>Set 30-day access</button>
						{#if confirmingId === member.personId}
							<span class="revoke-confirm"><strong>Remove {person?.name}'s access?</strong><button class="secondary-button" onclick={() => confirmingId = undefined}>Keep access</button><button class="danger-button" onclick={() => { feedback = onUpdate(member.personId, { revoke: true }).summary; confirmingId = undefined; }}>Remove access</button></span>
						{:else}
							<button class="text-button danger-text" onclick={() => confirmingId = member.personId}>Remove access</button>
						{/if}
					</div>
				{/if}
			</article>
		{/each}
	</section>

	<section class="invite-section" aria-labelledby="invite-title">
		<div><span class="eyebrow">New trusted person</span><h3 id="invite-title">Prepare an invitation</h3><p>They receive no information until they accept.</p></div>
		<div class="invite-fields">
			<label><span>Name</span><input bind:value={name} autocomplete="name" placeholder="For example, Pat" /></label>
			<label><span>Relationship</span><input bind:value={relationship} placeholder="For example, neighbour" /></label>
			<label><span>Email</span><input bind:value={email} type="email" autocomplete="email" placeholder="pat@example.com" /></label>
			<label><span>Access ends</span><select bind:value={duration}><option value="7">After 7 days</option><option value="30">After 30 days</option><option value="90">After 90 days</option><option value="none">No automatic end</option></select></label>
		</div>
		<div class="permission-grid" aria-label="Invitation permissions">
			{#each permissionChoices as permission}
				<button class:chosen={invitePermissions.includes(permission.id)} aria-pressed={invitePermissions.includes(permission.id)} onclick={() => toggleInvitePermission(permission.id)}>{permission.label}</button>
			{/each}
		</div>
		<button class="primary-button invite-button" disabled={!name.trim() || !relationship.trim() || !email.trim() || !invitePermissions.length} onclick={invite}><Icon name="family" size={20} /> Prepare invitation</button>
		{#if feedback}<p class="setup-feedback" role="status">{feedback}</p>{/if}
		<p class="settings-note"><Icon name="shield" size={20} /> This demonstration records an invitation locally. It does not send email or grant real access.</p>
	</section>
</dialog>
