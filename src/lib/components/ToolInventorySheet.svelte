<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';

	type ToolSummary = { name: string; title: string; description: string; readOnly: boolean; consequential: boolean };
	type ToolGroup = { title: string; note: string; icon: string; tone: string; tools: ToolSummary[] };

	let {
		tools,
		connected,
		registered,
		onClose
	}: {
		tools: ToolSummary[];
		connected: boolean;
		registered: number;
		onClose: () => void;
	} = $props();

	let dialog: HTMLDialogElement;
	let closeButton: HTMLButtonElement;

	const viewTools = new Set(['focus_date', 'highlight_commitments', 'show_route', 'show_attention_item']);
	const prepareTools = new Set(['scan_mailbox_for_actions', 'ingest_email_action', 'create_appointment_request_plan', 'create_attention_reply_plan', 'suggest_support', 'find_planning_options']);

	let groups = $derived.by((): ToolGroup[] => {
		const read = tools.filter((tool) => tool.readOnly && !prepareTools.has(tool.name));
		const view = tools.filter((tool) => viewTools.has(tool.name));
		const prepare = tools.filter((tool) => prepareTools.has(tool.name));
		const act = tools.filter((tool) => !read.includes(tool) && !view.includes(tool) && !prepare.includes(tool));
		return [
			{ title: 'Understand', note: 'Reads structured care information without changing it.', icon: 'search', tone: 'read', tools: read },
			{ title: 'Show together', note: 'Moves or highlights the shared CareWeave board.', icon: 'calendar', tone: 'view', tools: view },
			{ title: 'Prepare safely', note: 'Finds options or creates something for human review.', icon: 'mail', tone: 'prepare', tools: prepare },
			{ title: 'Update with consent', note: 'Records bounded decisions with validation and history.', icon: 'shield', tone: 'act', tools: act }
		];
	});

	onMount(() => {
		dialog.showModal();
		closeButton.focus({ preventScroll: true });
	});

	function close(): void {
		dialog.close();
		onClose();
	}
</script>

<dialog bind:this={dialog} class="tool-inventory-sheet" aria-labelledby="tool-inventory-title" oncancel={(event) => { event.preventDefault(); close(); }}>
	<header>
		<div class="tool-inventory-heading">
			<span class:connected class="tool-live-dot" aria-hidden="true"></span>
			<div><span class="eyebrow">Agent-native care coordination</span><h2 id="tool-inventory-title">CareWeave’s WebMCP tools</h2></div>
		</div>
		<button bind:this={closeButton} class="icon-button" aria-label="Close WebMCP tools" onclick={close}>×</button>
	</header>
	<p class="tool-inventory-lead">{connected ? `${registered} tools are connected to this browser.` : `${tools.length} tools are built in and ready in a WebMCP browser.`} The agent works with the same plans and decisions you see here.</p>
	<div class="tool-groups">
		{#each groups as group}
			<section class="tool-group {group.tone}" aria-labelledby={`tool-group-${group.tone}`}>
				<div class="tool-group-heading"><span><Icon name={group.icon} size={22} /></span><div><h3 id={`tool-group-${group.tone}`}>{group.title}</h3><p>{group.note}</p></div><strong>{group.tools.length}</strong></div>
				<div class="tool-list">
					{#each group.tools as tool}
						<details>
							<summary><span><strong>{tool.title}</strong><code>{tool.name}</code></span><Icon name="arrow" size={18} /></summary>
							<p>{tool.description}</p>
							{#if tool.consequential}<span class="tool-annotation"><Icon name="shield" size={15} /> Consequential action</span>{/if}
						</details>
					{/each}
				</div>
			</section>
		{/each}
	</div>
	<footer><Icon name="shield" size={20} /><span><strong>Human control is part of the protocol.</strong> Drafts do not send themselves, and consequential changes require explicit confirmation.</span></footer>
</dialog>
