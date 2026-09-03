<script lang="ts">
	import { onMount } from 'svelte';
	import { household, ui } from '$lib/app';
	import { addDays, formatDay, formatTime, localDateKey } from '$lib/dates';
	import { baseCommitmentId, commitmentsForDate, dayPacing, routeForCommitment } from '$lib/planner';
	import { syncOverview } from '$lib/reliability';
	import { ClearDayRealtimeVoice, resultSummary, type VoiceStatus } from '$lib/realtime';
	import { createGmailDraft, disconnectGmail, getGmailStatus, listGmailMessages, type GmailConnectionStatus } from '$lib/gmail';
	import { registerClearDayTools, toolInventory, unregisterClearDayTools, webMcpStatus } from '$lib/webmcp';
	import type { ActionPlan, AppView, Reminder, SupportOfferCategory, SupportPermission, ToolResult } from '$lib/types';
	import EventCard from '$lib/components/EventCard.svelte';
	import EventDetails from '$lib/components/EventDetails.svelte';
	import DisplaySheet from '$lib/components/DisplaySheet.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PlanDialog from '$lib/components/PlanDialog.svelte';
	import RoutePanel from '$lib/components/RoutePanel.svelte';
	import SupportView from '$lib/components/SupportView.svelte';
	import SupportSetupSheet from '$lib/components/SupportSetupSheet.svelte';
	import FreshnessStrip from '$lib/components/FreshnessStrip.svelte';
	import HelpSheet from '$lib/components/HelpSheet.svelte';
	import PrivacyCover from '$lib/components/PrivacyCover.svelte';
	import VoiceSheet from '$lib/components/VoiceSheet.svelte';

	let voiceOpen = $state(false);
	let displayOpen = $state(false);
	let supportSetupOpen = $state(false);
	let helpOpen = $state(false);
	let privacyOpen = $state(false);
	let selectedSupporterId = $state('person-sam');
	let online = $state(true);
	let voiceSupported = $state(false);
	let voiceStatus = $state<VoiceStatus>('idle');
	let voiceStatusMessage = $state('Ready when you are.');
	let voiceTranscript = $state('');
	let voiceResponse = $state('');
	let appReady = $state(false);
	let gmailStatus = $state<GmailConnectionStatus>({ configured: false, connected: false, capabilities: [] });
	let gmailBusy = $state(false);
	let gmailMessage = $state('');
	let realtimeVoice: ClearDayRealtimeVoice | undefined;

	onMount(() => {
		household.initialize();
		household.refreshDueReminders();
		online = navigator.onLine;
		const updateOnlineState = () => { online = navigator.onLine; };
		window.addEventListener('online', updateOnlineState);
		window.addEventListener('offline', updateOnlineState);
		const reminderTimer = window.setInterval(() => household.refreshDueReminders(), 60_000);
		voiceSupported = Boolean(window.RTCPeerConnection && navigator.mediaDevices?.getUserMedia);
		const gmailOutcome = new URL(window.location.href).searchParams.get('gmail');
		if (gmailOutcome) {
			gmailMessage = gmailOutcome === 'connected' ? 'Gmail connected. Messages remain untrusted until you review them.' : gmailOutcome === 'cancelled' ? 'Gmail connection was cancelled.' : 'Gmail could not be connected. Check the OAuth settings and try again.';
			const cleanUrl = new URL(window.location.href);
			cleanUrl.searchParams.delete('gmail');
			window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
		}
		refreshGmailStatus();
		appReady = true;
		registerClearDayTools().catch(() => {
			webMcpStatus.update((status) => status.message.startsWith('WebMCP registration failed')
				? status
				: { state: 'error', supported: false, registered: 0, message: 'WebMCP could not be registered in this browser.' });
		});
		return () => {
			window.removeEventListener('online', updateOnlineState);
			window.removeEventListener('offline', updateOnlineState);
			window.clearInterval(reminderTimer);
			realtimeVoice?.disconnect(false);
			unregisterClearDayTools();
		};
	});

	const nav: Array<{ id: AppView; label: string; icon: string }> = [
		{ id: 'today', label: 'Day', icon: 'calendar' },
		{ id: 'week', label: '7 days', icon: 'week' },
		{ id: 'attention', label: 'Attention', icon: 'mail' },
		{ id: 'food', label: 'Food', icon: 'basket' },
		{ id: 'support', label: 'Support', icon: 'family' },
		{ id: 'history', label: 'History', icon: 'history' }
	];
	const webMcpToolCount = toolInventory().length;

	let selectedDate = $derived($ui.selectedDate);
	let dayItems = $derived(commitmentsForDate($household, selectedDate));
	let pacing = $derived(dayPacing($household, selectedDate));
	let newAttention = $derived($household.attentionItems.filter((item) => item.status === 'new'));
	let selectedItem = $derived(dayItems.find((item) => item.id === $ui.selectedCommitmentId) ?? $household.commitments.find((item) => item.id === baseCommitmentId($ui.selectedCommitmentId ?? '')));
	let selectedReminder = $derived($household.reminders.find((reminder) => reminder.commitmentId === baseCommitmentId(selectedItem?.id ?? '')));
	let currentSync = $derived(syncOverview($household, online));
	let activeReminders = $derived($household.reminders.filter((reminder) => reminder.status !== 'done'));
	let activePlan = $derived($household.plans.find((plan) => plan.id === $ui.activePlanId && plan.status === 'draft'));
	let activeRoute = $derived($ui.showRouteForId ? routeForCommitment($household, $ui.showRouteForId) : undefined);
	let weekDates = $derived(Array.from({ length: 7 }, (_, index) => addDays(selectedDate, index)));
	let primarySupporter = $derived($household.people.find((person) => person.id === $household.supportCircle.find((member) => member.status === 'active')?.personId));

	function selectCommitment(id: string): void {
		const item = dayItems.find((candidate) => candidate.id === id) ?? $household.commitments.find((candidate) => candidate.id === baseCommitmentId(id));
		ui.update((value) => ({ ...value, selectedCommitmentId: id, showRouteForId: undefined, announcement: item ? `Details opened for ${item.title}.` : 'Plan details opened.' }));
		if (item && $household.preferences.readAloud) speak(`${item.title}. ${formatTime(item.startAt, item.timeZone)}. ${item.notes ?? ''}`);
	}

	function closeSidePanel(): void {
		ui.update((value) => ({ ...value, selectedCommitmentId: undefined, showRouteForId: undefined }));
	}

	function requestAppointment(id: string, request: 'reschedule' | 'cancel' = 'reschedule'): void {
		const item = $household.commitments.find((candidate) => candidate.id === id);
		const message = request === 'cancel'
			? `Hello, I need to cancel my appointment with Dr Patel currently shown for ${item ? formatDay(item.startAt.slice(0, 10)) : 'the scheduled date'}. Please confirm when it has been cancelled. Thank you, Margaret.`
			: `Hello, I would like to move my appointment with Dr Patel. Could you please offer a calm morning time later this week? Please keep the current appointment until I confirm a new time. Thank you, Margaret.`;
		household.createAppointmentRequestPlan(id, request, message, undefined, gmailStatus.connected ? 'gmail_draft' : 'demo');
	}

	function draftAttentionReply(attentionId: string): void {
		const item = $household.attentionItems.find((candidate) => candidate.id === attentionId);
		const message = item?.relatedCommitmentId
			? 'Hello, 09:00 is all right. Thank you for letting me know. Kind regards, Margaret.'
			: 'Hello, the suggested substitute is fine. Thank you. Kind regards, Margaret.';
		household.createAttentionReplyPlan(attentionId, message, gmailStatus.connected ? 'gmail_draft' : 'demo');
	}

	async function refreshGmailStatus(): Promise<void> {
		try {
			gmailStatus = await getGmailStatus();
		} catch {
			gmailStatus = { configured: false, connected: false, capabilities: [] };
			gmailMessage = 'Gmail status is unavailable.';
		}
	}

	function connectGmail(): void {
		window.location.assign('/api/gmail/auth');
	}

	async function checkMessages(): Promise<void> {
		if (!gmailStatus.connected) {
			const result = household.scanMailbox();
			gmailMessage = result.summary;
			return;
		}
		gmailBusy = true;
		gmailMessage = 'Checking Gmail…';
		try {
			const messages = await listGmailMessages(10);
			const result = household.importMailboxMessages(messages);
			gmailMessage = result.summary;
		} catch (cause) {
			gmailMessage = cause instanceof Error ? cause.message : 'Gmail could not be checked.';
			if (gmailMessage.toLowerCase().includes('reconnect') || gmailMessage.toLowerCase().includes('not connected')) {
				gmailStatus = { ...gmailStatus, connected: false, email: undefined, capabilities: [] };
			}
		} finally {
			gmailBusy = false;
		}
	}

	async function removeGmailConnection(): Promise<void> {
		if (!window.confirm('Disconnect Gmail from this device? Existing ClearDay items and Gmail drafts will remain.')) return;
		gmailBusy = true;
		try {
			await disconnectGmail();
			gmailStatus = { ...gmailStatus, connected: false, email: undefined, capabilities: [] };
			gmailMessage = 'Gmail disconnected from this device.';
		} catch (cause) {
			gmailMessage = cause instanceof Error ? cause.message : 'Gmail could not be disconnected.';
		} finally {
			gmailBusy = false;
		}
	}

	async function approvePlan(plan: ActionPlan): Promise<ToolResult> {
		if (plan.deliveryMode !== 'gmail_draft') return household.approvePlan(plan.id);
		const email = plan.steps.find((step) => step.type === 'send_email');
		if (!email) return { success: false, summary: 'This plan has no email draft to create.', stateRevision: $household.revision };
		if (!gmailStatus.connected) return { success: false, summary: 'Gmail is disconnected. Reconnect it before creating this draft.', stateRevision: $household.revision };
		try {
			const draft = await createGmailDraft({ to: String(email.payload.to), subject: String(email.payload.subject), body: String(email.payload.body) });
			const result = household.approvePlan(plan.id, { mode: 'gmail_draft', providerId: draft.draftId });
			gmailMessage = result.success ? 'Gmail draft created. Open Gmail to review and send it.' : `A Gmail draft may have been created, but ClearDay could not finish updating the board: ${result.summary}`;
			return result;
		} catch (cause) {
			return { success: false, summary: cause instanceof Error ? cause.message : 'Gmail could not create the draft.', stateRevision: $household.revision, warnings: ['Nothing was sent.'] };
		}
	}

	function offerSupport(category: SupportOfferCategory, message: string, relatedCommitmentId?: string): void {
		household.suggestSupport(selectedSupporterId, category, message, relatedCommitmentId);
	}

	function inviteSupporter(input: { name: string; relationship: string; email: string; permissions: SupportPermission[]; durationDays?: number }) {
		return household.inviteSupporter(input);
	}

	function openReminder(reminder: Reminder): void {
		const item = $household.commitments.find((commitment) => commitment.id === reminder.commitmentId);
		if (!item) return;
		household.focusDate(item.startAt.slice(0, 10));
		selectCommitment(item.id);
	}

	function resetDemo(): void {
		if (window.confirm('Reset the fictional household and remove all changes made in this demo?')) household.reset();
	}

	function speak(message: string): void {
		if (!('speechSynthesis' in window)) return;
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(message);
		utterance.rate = 0.88;
		utterance.pitch = 1;
		window.speechSynthesis.speak(utterance);
	}

	function respondToVoice(message: string): void {
		voiceResponse = message;
		speak(message);
	}

	function handleVoiceCommand(command: string): void {
		voiceTranscript = command.trim();
		const words = voiceTranscript.toLowerCase();
		const today = localDateKey();
		const doctor = $household.commitments
			.filter((item) => item.kind === 'health' && item.status !== 'cancelled')
			.sort((a, b) => a.startAt.localeCompare(b.startAt))[0];

		if ((words.includes('doctor') || words.includes('appointment')) && (words.includes('leave') || words.includes('route') || words.includes('get there'))) {
			if (!doctor) return respondToVoice('I could not find an upcoming doctor appointment.');
			const route = routeForCommitment($household, doctor.id);
			household.focusDate(doctor.startAt.slice(0, 10));
			household.showRoute(doctor.id);
			return respondToVoice(route ? `For ${doctor.title}, leave at ${formatTime(route.leaveAt, route.timeZone)}. The walk is about ${route.durationMinutes} minutes, with five minutes to spare.` : 'I found the appointment, but there is no route saved for it.');
		}

		if ((words.includes('doctor') || words.includes('appointment')) && (words.includes('move') || words.includes('change') || words.includes('reschedule'))) {
			if (!doctor) return respondToVoice('I could not find an upcoming doctor appointment.');
			voiceOpen = false;
			requestAppointment(doctor.id, 'reschedule');
			speak('I prepared a request to move the appointment. Nothing has been sent. Please check the recipient and message on the screen.');
			return;
		}

		if ((words.includes('doctor') || words.includes('appointment')) && words.includes('cancel')) {
			if (!doctor) return respondToVoice('I could not find an upcoming doctor appointment.');
			voiceOpen = false;
			requestAppointment(doctor.id, 'cancel');
			speak('I prepared a cancellation request. Nothing has been sent. Please check it on the screen.');
			return;
		}

		if (words.includes('tomorrow')) {
			const date = addDays(today, 1);
			const items = commitmentsForDate($household, date);
			household.focusDate(date);
			return respondToVoice(items.length ? `Tomorrow you have ${items.length} planned ${items.length === 1 ? 'thing' : 'things'}. ${items.map((item) => `${item.title} at ${formatTime(item.startAt, item.timeZone)}`).join('. ')}.` : 'Tomorrow is clear.');
		}

		if (words.includes('week')) {
			household.setView('week');
			return respondToVoice('I have opened the next seven days.');
		}

		if (words.includes('food') || words.includes('shopping') || words.includes('grocer')) {
			household.setView('food');
			return respondToVoice(`You have food covered for ${$household.food.daysCovered} days. There are ${$household.food.groceryItems.filter((item) => !item.checked).length} things left on the shopping list.`);
		}

		if (words.includes('message') || words.includes('email') || words.includes('attention')) {
			household.setView('attention');
			return respondToVoice(`There are ${newAttention.length} new things to review. Nothing from a message will happen without your approval.`);
		}

		if (words.includes('today') || words.includes('plan') || words.includes('doing')) {
			const items = commitmentsForDate($household, today);
			household.focusDate(today);
			return respondToVoice(items.length ? `Today you have ${items.length} planned things. ${items.map((item) => `${item.title} at ${formatTime(item.startAt, item.timeZone)}`).join('. ')}.` : 'Today is clear.');
		}

		if (words.includes('doctor') || words.includes('appointment')) {
			if (!doctor) return respondToVoice('I could not find an upcoming doctor appointment.');
			household.focusDate(doctor.startAt.slice(0, 10));
			selectCommitment(doctor.id);
			return respondToVoice(`${doctor.title} is at ${formatTime(doctor.startAt, doctor.timeZone)} on ${formatDay(doctor.startAt.slice(0, 10))}.`);
		}

		respondToVoice('I did not understand that yet. Try asking about today, food, messages, your week, or the route to the doctor.');
	}

	function attentionCategoryLabel(category: string): string {
		return ({
			new_commitment: 'New plan', schedule_change: 'Schedule change', confirmation: 'Confirmation',
			reply_required: 'Reply needed', food_need: 'Food reminder', delivery: 'Delivery', support_offer: 'Offer of help', information: 'Information'
		} as Record<string, string>)[category] ?? 'Message';
	}

	async function toggleVoiceConversation(): Promise<void> {
		if (voiceStatus !== 'idle' && voiceStatus !== 'error') {
			realtimeVoice?.disconnect();
			realtimeVoice = undefined;
			return;
		}
		if (!voiceSupported) return;
		voiceTranscript = '';
		voiceResponse = '';
		realtimeVoice = new ClearDayRealtimeVoice({
			onStatus: (status, message) => {
				voiceStatus = status;
				if (message) voiceStatusMessage = message;
			},
			onUserTranscript: (text) => { voiceTranscript = text; },
			onAssistantTranscript: (text) => { voiceResponse = text; },
			onToolResult: (_name, result) => {
				const summary = resultSummary(result);
				if (summary) voiceStatusMessage = summary;
			}
		});
		try {
			await realtimeVoice.connect();
		} catch {
			// A calm, actionable error is already shown by the session callback.
		}
	}

	function closeVoice(): void {
		realtimeVoice?.disconnect(false);
		realtimeVoice = undefined;
		voiceStatus = 'idle';
		voiceStatusMessage = 'Ready when you are.';
		voiceOpen = false;
	}
</script>

<svelte:head>
	<title>ClearDay — a calmer day, together</title>
	<meta name="description" content="A voice-first household dayboard for appointments, care, food and everyday plans." />
	<meta property="og:title" content="ClearDay — a calmer day, together" />
	<meta property="og:description" content="A voice-first household dayboard for appointments, care, food, shopping and routes." />
	<meta property="og:type" content="website" />
</svelte:head>

<a class="skip-link" href="#main-content">Skip to today’s plan</a>
<div class="app-shell" class:guided={$household.preferences.guidedMode} class:private-hidden={privacyOpen} aria-hidden={privacyOpen ? 'true' : undefined} inert={privacyOpen} data-contrast={$household.preferences.contrast} data-text-size={$household.preferences.textSize} data-ready={appReady}>
	<aside class="sidebar" aria-label="Main navigation">
		<div class="brand-mark" aria-hidden="true"><Icon name="sun" size={30} /></div>
		<nav>
			{#each nav as item}
				<button class:active={$ui.view === item.id} onclick={() => household.setView(item.id)} aria-current={$ui.view === item.id ? 'page' : undefined}>
					<span class="nav-icon"><Icon name={item.icon} size={25} />{#if item.id === 'attention' && newAttention.length}<em>{newAttention.length}</em>{/if}</span>
					<span>{item.label}</span>
				</button>
			{/each}
		</nav>
		<div class="avatar" title="Margaret's board">M</div>
	</aside>

	<div class="workspace">
		<header class="topbar">
			<div class="brand-copy"><strong>ClearDay</strong><span>a calmer day, together</span></div>
			<div class="system-status" title={gmailStatus.connected ? `Connected as ${gmailStatus.email ?? 'your Google account'}` : $webMcpStatus.message} role="note" aria-label={gmailStatus.connected ? 'Gmail connected. ClearDay can read recent messages and create drafts, but cannot send them.' : 'Fictional demonstration. No real messages are sent.'}>
				<span aria-hidden="true"></span>
				<span><strong>{gmailStatus.connected ? 'Gmail connected' : 'Fictional demo'}</strong><small>{gmailStatus.connected ? 'Drafts only · never sends' : 'No real messages sent'}</small></span>
			</div>
			<div
				class="webmcp-indicator"
				class:connected={$webMcpStatus.supported}
				class:failed={$webMcpStatus.state === 'error'}
				role="note"
				aria-live="polite"
				aria-label={`WebMCP: ${$webMcpStatus.state === 'connected' ? `${$webMcpStatus.registered} site tools connected` : $webMcpStatus.state === 'error' ? 'connection failed' : `${webMcpToolCount} site tools ready`}`}
				title={$webMcpStatus.message}
			>
				<span aria-hidden="true"></span>
				<span><strong>WebMCP</strong><small>{$webMcpStatus.state === 'connected' ? `${$webMcpStatus.registered} tools connected` : $webMcpStatus.state === 'error' ? 'Connection failed' : `${webMcpToolCount} tools ready`}</small></span>
			</div>
			<button class="display-button" onclick={() => displayOpen = true} aria-label="Open display settings"><span>Aa</span><strong>Display</strong></button>
			<button class="privacy-button" onclick={() => privacyOpen = true} aria-label="Hide private details"><Icon name="shield" size={20} /><strong>Hide</strong></button>
		</header>

		<main id="main-content" tabindex="-1">
			{#if $ui.view === 'today'}
				{#if !activeRoute}
					<section class="page-intro">
						<div>
							<span class="eyebrow">Hello {$household.preferences.ownerName}</span>
							<h1>{selectedDate === localDateKey() ? 'Today' : formatDay(selectedDate)}</h1>
							<p class="calm-line"><span class="pacing-dot {pacing.level}"></span> {#if selectedDate === localDateKey()}<strong>{formatDay(selectedDate)}</strong> · {/if}This day looks <strong>{pacing.level}</strong> · {pacing.reasons.join(' · ')}</p>
						</div>
						<div class="page-intro-side">
							<FreshnessStrip overview={currentSync} compact />
							<div class="date-switcher" aria-label="Choose day">
								<button aria-label="Previous day" onclick={() => household.focusDate(addDays(selectedDate, -1))}>‹</button>
								<div><span>{selectedDate === localDateKey() ? 'Today' : formatDay(selectedDate, 'short')}</span><strong>{new Date(`${selectedDate}T12:00:00`).getDate()}</strong></div>
								<button aria-label="Next day" onclick={() => household.focusDate(addDays(selectedDate, 1))}>›</button>
							</div>
						</div>
					</section>
				{/if}

				{#if !activeRoute}
					<section class="glance-grid" aria-label="At a glance">
						<button class="glance attention-glance" onclick={() => household.setView('attention')}>
							<span class="glance-icon"><Icon name="mail" size={25} /></span><span><strong>{newAttention.length} {newAttention.length === 1 ? 'thing' : 'things'}</strong><small>need your attention</small></span><Icon name="arrow" size={21} />
						</button>
						<button class="glance food-glance" onclick={() => household.setView('food')}>
							<span class="glance-icon"><Icon name="basket" size={25} /></span><span><strong>Food for {$household.food.daysCovered} days</strong><small>shop by {formatDay($household.food.nextShoppingBy, 'short')}</small></span><Icon name="arrow" size={21} />
						</button>
						<button class="glance safe-glance" onclick={() => activeReminders[0] && openReminder(activeReminders[0])}><span class="glance-icon"><Icon name="clock" size={25} /></span><span><strong>{activeReminders.length} {activeReminders.length === 1 ? 'reminder' : 'reminders'}</strong><small>{activeReminders.some((reminder) => reminder.status === 'help_requested') ? 'waiting for help' : 'done, later, or ask for help'}</small></span><Icon name="arrow" size={21} /></button>
					</section>
				{/if}

				<div class="day-layout" class:route-active={!!activeRoute} class:details-active={!!selectedItem && !activeRoute}>
					<section class="timeline-section" aria-labelledby="timeline-title">
						<div class="section-heading"><div><span class="eyebrow">{formatDay(selectedDate)}</span><h2 id="timeline-title">What’s happening</h2></div><span>{dayItems.length} planned</span></div>
						<div class="timeline">
							{#if dayItems.length === 0}
								<div class="empty-state"><Icon name="sun" size={35} /><h3>A clear day</h3><p>There is nothing you need to be somewhere for.</p></div>
							{:else}
								{#each dayItems as item (item.id)}
									<EventCard {item} reminder={$household.reminders.find((reminder) => reminder.commitmentId === baseCommitmentId(item.id))} place={$household.places.find((place) => place.id === item.locationId)} highlighted={$ui.highlightedCommitmentIds.includes(item.id)} selected={$ui.selectedCommitmentId === item.id && !$ui.showRouteForId} onSelect={() => selectCommitment(item.id)} onRoute={() => household.showRoute(item.id)} onRequest={() => requestAppointment(baseCommitmentId(item.id))} />
								{/each}
							{/if}
						</div>
					</section>

					<aside class="right-rail" aria-label="Helpful details">
						{#if activeRoute}
							<RoutePanel route={activeRoute} onClose={closeSidePanel} />
						{:else if selectedItem}
							<EventDetails
								item={selectedItem}
								place={$household.places.find((place) => place.id === selectedItem?.locationId)}
								participants={$household.people.filter((person) => selectedItem?.participantIds.includes(person.id))}
								sources={$household.sources.filter((source) => selectedItem?.sourceIds.includes(source.id))}
								reminder={selectedReminder}
								onClose={closeSidePanel}
								onTogglePrep={(prepId) => household.togglePrep(baseCommitmentId(selectedItem!.id), prepId)}
								onRoute={() => household.showRoute(selectedItem!.id)}
								onRequest={(request) => requestAppointment(baseCommitmentId(selectedItem!.id), request)}
								onReminder={(response) => household.respondToReminder(selectedReminder!.id, response)}
							/>
						{:else}
							<section class="coming-panel">
								<span class="eyebrow">Coming up</span><h2>{selectedDate === localDateKey() ? 'Tomorrow' : 'Next day'}</h2>
								{#each commitmentsForDate($household, addDays(selectedDate, 1)).slice(0, 2) as item}
									<button class="coming-item" onclick={() => { household.focusDate(addDays(selectedDate, 1)); selectCommitment(item.id); }}>
										<span class="coming-date">{formatTime(item.startAt, item.timeZone)}</span><span><strong>{item.title}</strong><small>{item.locationId ? $household.places.find((place) => place.id === item.locationId)?.shortAddress : 'At home'}</small></span><Icon name="arrow" size={20} />
									</button>
								{/each}
								<div class="reassurance"><Icon name="shield" size={24} /><p><strong>You’re prepared.</strong><br />ClearDay will keep requested changes separate from confirmed plans.</p></div>
							</section>
						{/if}
					</aside>
				</div>
			{:else if $ui.view === 'week'}
				<section class="standard-page">
					<div class="page-title-row"><div><span class="eyebrow">A gentle overview</span><h1>Next 7 days</h1><p>Starting today, with only the plans that matter.</p></div></div>
					<div class="week-grid">
						{#each weekDates as date}
							<button class:today={date === localDateKey()} onclick={() => household.focusDate(date)}>
								<header><span>{formatDay(date, 'short').split(' ')[0]}</span><strong>{new Date(`${date}T12:00:00`).getDate()}</strong></header>
								{#each commitmentsForDate($household, date) as item}<span class="week-event {item.kind}"><small>{formatTime(item.startAt, item.timeZone)}</small>{item.title}</span>{/each}
								{#if commitmentsForDate($household, date).length === 0}<em>Clear</em>{/if}
							</button>
						{/each}
					</div>
				</section>
			{:else if $ui.view === 'attention'}
				<section class="standard-page narrow-page">
					<div class="page-title-row"><div><span class="eyebrow">Messages and support</span><h1>Needs attention</h1><p>Messages can be wrong, and family offers are only suggestions. You decide before anything changes.</p></div><div class="attention-header-actions"><span class="trust-label"><Icon name="shield" size={18} /> {gmailStatus.connected ? `Connected${gmailStatus.email ? ` as ${gmailStatus.email}` : ''}` : 'You stay in control'}</span>{#if gmailStatus.connected}<button class="secondary-button" onclick={checkMessages} disabled={gmailBusy}><Icon name="mail" size={19} /> {gmailBusy ? 'Checking…' : 'Check Gmail'}</button><button class="text-button" onclick={removeGmailConnection} disabled={gmailBusy}>Disconnect</button>{:else if gmailStatus.configured}<button class="primary-button" onclick={connectGmail}><Icon name="mail" size={19} /> Connect Gmail</button><button class="secondary-button" onclick={checkMessages}><Icon name="mail" size={19} /> Check demo messages</button>{:else}<button class="secondary-button" onclick={checkMessages}><Icon name="mail" size={19} /> Check demo messages</button>{/if}</div></div>
					{#if gmailMessage}<p class="gmail-feedback" role="status">{gmailMessage}</p>{/if}
					{#if !gmailStatus.configured}<p class="gmail-setup-note"><strong>Gmail OAuth is not configured yet.</strong> Add the Google credentials and token-encryption secret in Vercel to enable connection.</p>{/if}
					<div class="attention-list">
						{#each $household.attentionItems as item (item.id)}
							<article class:resolved={item.status === 'resolved'} class:selected={$ui.selectedAttentionId === item.id}>
								<div class="attention-icon"><Icon name={item.category === 'food_need' ? 'basket' : item.category === 'support_offer' ? 'family' : 'mail'} size={27} /></div>
								<div><span class="attention-meta">{item.category === 'support_offer' ? 'From your support circle' : 'From a message'} · {attentionCategoryLabel(item.category)}</span><h2>{item.title}</h2><p>{item.summary}</p><strong class="requested">Suggested next step: {item.requestedAction}</strong></div>
								<div class="attention-actions">
									<span class="status-pill">{item.status === 'new' ? 'Needs review' : 'Reviewed'}</span>
									{#if item.status === 'new' && item.category === 'support_offer' && item.supportOfferId}
										<button class="primary-button" onclick={() => household.respondToSupportOffer(item.supportOfferId!, 'accepted')}>Accept help</button>
										<button class="secondary-button" onclick={() => household.respondToSupportOffer(item.supportOfferId!, 'declined')}>Not now</button>
									{:else if item.status === 'new'}
										<button class="primary-button" onclick={() => draftAttentionReply(item.id)}>Prepare reply</button>
									{/if}
								</div>
							</article>
						{/each}
					</div>
				</section>
			{:else if $ui.view === 'food'}
				<section class="standard-page food-page">
					<div class="page-title-row"><div><span class="eyebrow">Meals and groceries</span><h1>Food at home</h1><p>You have enough planned for <strong>{$household.food.daysCovered} days</strong>. Shop by {formatDay($household.food.nextShoppingBy)}.</p></div><div class="food-days"><strong>{$household.food.daysCovered}</strong><span>days covered</span></div></div>
					<div class="food-layout">
						<section><div class="section-heading"><div><span class="eyebrow">Simple list</span><h2>Shopping</h2></div><span>{$household.food.groceryItems.filter((item) => !item.checked).length} left</span></div>
							<div class="grocery-list">{#each $household.food.groceryItems as item}<button class:done={item.checked} onclick={() => household.toggleGrocery(item.id)}><span class="big-check"><Icon name="check" size={21} /></span><span><strong>{item.name}</strong><small>{item.quantity} · needed by {formatDay(item.neededBy, 'short')}</small></span></button>{/each}</div>
						</section>
						<aside class="meal-notes"><span class="eyebrow">At a glance</span><h2>You’re covered</h2>{#each $household.food.notes as note}<p><Icon name="check" size={19} /> {note}</p>{/each}<div class="shopping-date"><Icon name="basket" size={27} /><span><small>Next shopping</small><strong>{formatDay($household.food.nextShoppingBy)}</strong></span></div></aside>
					</div>
				</section>
			{:else if $ui.view === 'support'}
				<SupportView
					data={$household}
					date={localDateKey()}
					supporterId={selectedSupporterId}
					onOffer={offerSupport}
					onHelpRequest={(reminderId, response) => household.respondToHelpRequest(selectedSupporterId, reminderId, response)}
					onFulfillment={(offerId, status) => household.updateSupportOfferFulfillment(selectedSupporterId, offerId, status)}
					onManage={() => supportSetupOpen = true}
					onOpenBoard={() => household.setView('today')}
				/>
			{:else}
				<section class="standard-page narrow-page">
					<div class="page-title-row"><div><span class="eyebrow">Your activity</span><h1>What happened</h1><p>Every message you save and every change you make appears here.</p></div><button class="secondary-button" onclick={resetDemo}>Reset fictional demo</button></div>
					<div class="history-list">{#each $household.activity as entry}<article><span class="history-dot"></span><div><span>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(entry.createdAt))}</span><h2>{entry.label}</h2><p>{entry.detail}</p></div></article>{/each}</div>
					{#if $household.outbox.length}<section class="outbox"><span class="eyebrow">Prepared messages</span><h2>Messages created from reviewed plans</h2>{#each $household.outbox as email}<div><strong>{email.subject}</strong><span>To {email.to} · {email.status === 'saved_demo' ? 'saved for demonstration' : 'Gmail draft — not sent'}</span></div>{/each}</section>{/if}
				</section>
			{/if}
		</main>

		<footer class="voice-bar">
			<button class="undo-button" onclick={() => household.undo()} title="Undo last change"><Icon name="undo" size={22} /><span>Undo</span></button>
			<button class="voice-prompt" onclick={() => { voiceTranscript = ''; voiceResponse = ''; voiceOpen = true; }}><span class="voice-button"><Icon name="mic" size={27} /></span><span><strong>Talk to ClearDay</strong><small>{voiceSupported ? 'Have a full conversation' : 'Use ChatGPT voice or tap an example'}</small></span></button>
			<button class="help-now-button" aria-label="Help now" onclick={() => helpOpen = true}><Icon name="care" size={21} /><span>Help now</span></button>
			<div class="live-announcement" aria-live="polite">{$ui.announcement}</div>
		</footer>
	</div>
</div>

{#if activePlan}<PlanDialog plan={activePlan} onApprove={() => approvePlan(activePlan!)} onDiscard={() => household.discardPlan(activePlan!.id)} />{/if}
{#if voiceOpen}<VoiceSheet supported={voiceSupported} status={voiceStatus} statusMessage={voiceStatusMessage} transcript={voiceTranscript} response={voiceResponse} onConversation={toggleVoiceConversation} onExample={handleVoiceCommand} onClose={closeVoice} />{/if}
{#if displayOpen}<DisplaySheet textSize={$household.preferences.textSize} contrast={$household.preferences.contrast} guidedMode={$household.preferences.guidedMode} readAloud={$household.preferences.readAloud} onTextSize={(textSize) => household.setDisplay({ textSize })} onContrast={(contrast) => household.setDisplay({ contrast })} onGuidedMode={(guidedMode) => household.setDisplay({ guidedMode })} onReadAloud={(readAloud) => household.setDisplay({ readAloud })} onClose={() => displayOpen = false} />{/if}
{#if supportSetupOpen}<SupportSetupSheet data={$household} onInvite={inviteSupporter} onUpdate={(personId, input) => household.updateSupportAccess(personId, input)} onPreview={(personId) => { selectedSupporterId = personId; supportSetupOpen = false; household.setView('support'); }} onClose={() => supportSetupOpen = false} />{/if}
{#if helpOpen}<HelpSheet supporterName={primarySupporter?.name} supporterPhone={primarySupporter?.phone} onClose={() => helpOpen = false} />{/if}
{#if privacyOpen}<PrivacyCover ownerName={$household.preferences.ownerName} onUnlock={() => privacyOpen = false} />{/if}
