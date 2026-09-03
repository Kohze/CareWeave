<script lang="ts">
	import type { SyncOverview } from '$lib/reliability';
	import Icon from './Icon.svelte';

	let { overview, compact = false }: { overview: SyncOverview; compact?: boolean } = $props();
</script>

<div class="freshness-strip {overview.status}" class:compact role="status" aria-live="polite">
	<span class="freshness-icon"><Icon name={overview.status === 'current' ? 'check' : 'shield'} size={19} /></span>
	<span><strong>{overview.label}</strong>{#if !compact}<small>{overview.detail}</small>{/if}</span>
</div>
