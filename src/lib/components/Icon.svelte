<script lang="ts">
	let { name, size = 24 }: { name: string; size?: number } = $props();
</script>

<svg class="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
	{#if name === 'sun'}
		<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>
	{:else if name === 'calendar'}
		<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>
	{:else if name === 'week'}
		<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"/>
	{:else if name === 'mail'}
		<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>
	{:else if name === 'basket'}
		<path d="m5 10 2 10h10l2-10zM9 10l3-6 3 6M4 10h16"/>
	{:else if name === 'history'}
		<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>
	{:else if name === 'mic'}
		<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>
	{:else if name === 'heart'}
		<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8z"/>
	{:else if name === 'care'}
		<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/><path d="M9 12h6M12 9v6"/>
	{:else if name === 'family'}
		<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M15 15a5 5 0 0 1 6 4.8V20"/>
	{:else if name === 'walk'}
		<circle cx="13" cy="4" r="2"/><path d="m10 22 2-7-3-2 2-5 4 3 4 1M15 22l-2-7 3-2"/>
	{:else if name === 'route'}
		<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19c7 0 3-14 8-14"/>
	{:else if name === 'clock'}
		<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
	{:else if name === 'check'}
		<path d="m5 12 4 4L19 6"/>
	{:else if name === 'arrow'}
		<path d="m9 18 6-6-6-6"/>
	{:else if name === 'undo'}
		<path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6"/>
	{:else if name === 'shield'}
		<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-5"/>
	{:else}
		<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17h.01"/>
	{/if}
</svg>
