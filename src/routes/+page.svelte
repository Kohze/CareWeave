<script lang="ts">
	import { onMount } from 'svelte';
	import { household, ui } from '$lib/app';
	import { addDays, formatDay, formatTime, localDateKey } from '$lib/dates';
	import { baseCommitmentId, commitmentsForDate, dayPacing, routeForCommitment } from '$lib/planner';
	import { fallbackWeather, loadWeatherForecast, type ForecastDay, type WeatherScene } from '$lib/weather';
	import { CareWeaveRealtimeVoice, resultSummary, type VoiceStatus } from '$lib/realtime';
	import { createGmailDraft, disconnectGmail, getGmailStatus, listGmailMessages, type GmailConnectionStatus } from '$lib/gmail';
	import { registerCareWeaveTools, toolInventory, unregisterCareWeaveTools, webMcpStatus } from '$lib/webmcp';
	import type { ActionPlan, AppView, CareVisitUpdate, Commitment, Reminder, SupportOfferCategory, SupportPermission, ToolResult } from '$lib/types';
	import EventCard from '$lib/components/EventCard.svelte';
	import EventDetails from '$lib/components/EventDetails.svelte';
	import DisplaySheet from '$lib/components/DisplaySheet.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PlanDialog from '$lib/components/PlanDialog.svelte';
	import RoutePanel from '$lib/components/RoutePanel.svelte';
	import SupportView from '$lib/components/SupportView.svelte';
	import SupportSetupSheet from '$lib/components/SupportSetupSheet.svelte';
	import HelpSheet from '$lib/components/HelpSheet.svelte';
	import PrivacyCover from '$lib/components/PrivacyCover.svelte';
	import ReminderSheet from '$lib/components/ReminderSheet.svelte';
	import VoiceSheet from '$lib/components/VoiceSheet.svelte';
	import WeatherGlyph from '$lib/components/WeatherGlyph.svelte';
	import WeatherForecastSheet from '$lib/components/WeatherForecastSheet.svelte';
	import ToolInventorySheet from '$lib/components/ToolInventorySheet.svelte';
	import ReplyComposerSheet from '$lib/components/ReplyComposerSheet.svelte';

	let voiceOpen = $state(false);
	let displayOpen = $state(false);
	let supportSetupOpen = $state(false);
	let helpOpen = $state(false);
	let privacyOpen = $state(false);
	let weatherOpen = $state(false);
	let toolsOpen = $state(false);
	let replyAttentionId = $state<string>();
	let activeReminderId = $state<string>();
	let selectedSupporterId = $state('person-sam');
	let voiceSupported = $state(false);
	let voiceStatus = $state<VoiceStatus>('idle');
	let voiceStatusMessage = $state('Ready when you are.');
	let voiceTranscript = $state('');
	let voiceResponse = $state('');
	let appReady = $state(false);
	let gmailStatus = $state<GmailConnectionStatus>({ configured: false, connected: false, capabilities: [] });
	let gmailBusy = $state(false);
	let gmailMessage = $state('');
	let boardForecast = $state<WeatherScene>(fallbackWeather);
	let columnStrip: HTMLElement;
	let todayColumn: HTMLElement;
	let weekColumn: HTMLElement;
	let attentionColumn: HTMLElement;
	let foodColumn: HTMLElement;
	let supportColumn: HTMLElement;
	let historyColumn: HTMLElement;
	let detailColumn: HTMLElement | undefined;
	let webMcpButton: HTMLButtonElement;
	let scrollFrame = 0;
	let slideFrame = 0;
	let programmaticSlide = false;
	let viewUpdatedByScroll: AppView | undefined;
	let realtimeVoice: CareWeaveRealtimeVoice | undefined;
	const scrollbarTimers = new WeakMap<HTMLElement, number>();

	onMount(() => {
		household.initialize();
		household.refreshDueReminders();
		const reminderTimer = window.setInterval(() => household.refreshDueReminders(), 60_000);
		voiceSupported = Boolean(window.RTCPeerConnection && navigator.mediaDevices?.getUserMedia);
		const gmailOutcome = new URL(window.location.href).searchParams.get('gmail');
		if (gmailOutcome) {
			gmailMessage = gmailOutcome === 'connected' ? 'Gmail connected. Messages remain untrusted until you review them.' : '';
			const cleanUrl = new URL(window.location.href);
			cleanUrl.searchParams.delete('gmail');
			window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
		}
		refreshGmailStatus();
		const weatherController = new AbortController();
		const home = $household.places.find((place) => place.id === $household.preferences.homePlaceId);
		void loadWeatherForecast(home ? { latitude: home.latitude, longitude: home.longitude } : { latitude: 51.51, longitude: -0.13 }, weatherController.signal)
			.then((forecast) => { boardForecast = forecast; })
			.catch(() => { /* the calm fallback remains visible */ });
		appReady = true;
		registerCareWeaveTools().catch(() => {
			webMcpStatus.update((status) => status.message.startsWith('WebMCP registration failed')
				? status
				: { state: 'error', supported: false, registered: 0, message: 'WebMCP could not be registered in this browser.' });
		});
		return () => {
			window.clearInterval(reminderTimer);
			weatherController.abort();
			cancelAnimationFrame(scrollFrame);
			cancelAnimationFrame(slideFrame);
			realtimeVoice?.disconnect(false);
			unregisterCareWeaveTools();
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
	const webMcpTools = toolInventory();
	const webMcpToolCount = webMcpTools.length;

	let selectedDate = $derived($ui.selectedDate);
	let selectedDayForecast = $derived.by((): ForecastDay & { temperature?: number } => {
		if (selectedDate === localDateKey()) {
			return {
				date: selectedDate,
				condition: boardForecast.condition,
				label: boardForecast.label,
				temperature: boardForecast.temperature,
				high: boardForecast.high,
				low: boardForecast.low,
				precipitationProbability: boardForecast.precipitationProbability
			};
		}

		return boardForecast.outlook.find((forecast) => forecast.date === selectedDate) ?? {
			date: selectedDate,
			condition: 'fair',
			label: 'Changeable skies'
		};
	});
	let dayItems = $derived(commitmentsForDate($household, selectedDate));
	let pacing = $derived(dayPacing($household, selectedDate));
	let newAttention = $derived($household.attentionItems.filter((item) => item.status === 'new'));
	let selectedItem = $derived(dayItems.find((item) => item.id === $ui.selectedCommitmentId) ?? $household.commitments.find((item) => item.id === baseCommitmentId($ui.selectedCommitmentId ?? '')));
	let activeReminders = $derived($household.reminders.filter((reminder) => reminder.status !== 'done'));
	let activeReminder = $derived($household.reminders.find((reminder) => reminder.id === activeReminderId));
	let activeReminderItem = $derived($household.commitments.find((item) => item.id === activeReminder?.commitmentId));
	let replyAttentionItem = $derived($household.attentionItems.find((item) => item.id === replyAttentionId));
	let replySource = $derived($household.sources.find((source) => source.id === replyAttentionItem?.sourceId));
	let activePlan = $derived($household.plans.find((plan) => plan.id === $ui.activePlanId && plan.status === 'draft'));
	let activeRoute = $derived($ui.showRouteForId ? routeForCommitment($household, $ui.showRouteForId) : undefined);
	const weekStartDate = localDateKey();
	const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStartDate, index));
	let primarySupporter = $derived($household.people.find((person) => person.id === $household.supportCircle.find((member) => member.status === 'active')?.personId));
	let upcomingDayItem = $derived.by(() => {
		const availableItems = dayItems
			.filter((item) => item.status !== 'cancelled' && item.status !== 'completed')
			.sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
		if (selectedDate === localDateKey()) {
			return availableItems.find((item) => new Date(item.startAt).getTime() >= Date.now());
		}
		return availableItems[0];
	});
	let nextFutureItem = $derived.by(() => {
		const dates = Array.from({ length: 31 }, (_, index) => addDays(localDateKey(), index));
		return dates
			.flatMap((date) => commitmentsForDate($household, date))
			.filter((item) => item.status !== 'cancelled' && item.status !== 'completed' && new Date(item.startAt).getTime() >= Date.now())
			.sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime())[0];
	});
	let visibleDayItems = $derived($household.preferences.guidedMode ? (upcomingDayItem ? [upcomingDayItem] : []) : dayItems);
	let guidedFocusItem = $derived(upcomingDayItem ?? (selectedDate === localDateKey() ? nextFutureItem : undefined));
	let displayedDetailItem = $derived(selectedItem ?? upcomingDayItem);
	let selectedReminder = $derived($household.reminders.find((reminder) => reminder.commitmentId === baseCommitmentId(displayedDetailItem?.id ?? '')));
	let privacyLocation = $derived.by(() => {
		const home = $household.places.find((place) => place.id === $household.preferences.homePlaceId);
		return home ? { latitude: home.latitude, longitude: home.longitude } : { latitude: 51.51, longitude: -0.13 };
	});

	function careVisitUpdateFor(item: Commitment): CareVisitUpdate | undefined {
		if (item.kind !== 'care') return undefined;
		return $household.careVisitUpdates.find((update) =>
			update.commitmentId === baseCommitmentId(item.id) && update.updatedAt.slice(0, 10) === item.startAt.slice(0, 10)
		);
	}

	function selectCommitment(id: string): void {
		const item = dayItems.find((candidate) => candidate.id === id) ?? $household.commitments.find((candidate) => candidate.id === baseCommitmentId(id));
		ui.update((value) => ({ ...value, selectedCommitmentId: id, showRouteForId: undefined, announcement: item ? `Details opened for ${item.title}.` : 'Plan details opened.' }));
		if (item && $household.preferences.readAloud) speak(`${item.title}. ${formatTime(item.startAt, item.timeZone)}. ${item.notes ?? ''}`);
	}

	function openCommitment(item: Commitment): void {
		if (item.startAt.slice(0, 10) !== selectedDate) focusDay(item.startAt.slice(0, 10));
		selectCommitment(item.id);
	}

	function focusDay(date: string): void {
		const availableItems = commitmentsForDate($household, date).filter((item) => item.status !== 'cancelled');
		household.focusDate(date);
		ui.update((value) => ({
			...value,
			selectedCommitmentId: undefined,
			showRouteForId: undefined,
			announcement: availableItems.length ? `Showing ${date}. The next planned item is marked.` : `Showing ${date}.`
		}));
	}

	function closeSidePanel(): void {
		ui.update((value) => ({ ...value, selectedCommitmentId: undefined, showRouteForId: undefined }));
		requestAnimationFrame(() => scrollToColumn(todayColumn));
	}

	function showRoute(id: string): void {
		household.showRoute(id);
		revealDetailColumn();
	}

	function columnForView(view: AppView): HTMLElement | undefined {
		return { today: todayColumn, week: weekColumn, attention: attentionColumn, food: foodColumn, support: supportColumn, history: historyColumn }[view];
	}

	function cancelColumnSlide(): void {
		if (slideFrame) cancelAnimationFrame(slideFrame);
		slideFrame = 0;
		programmaticSlide = false;
		columnStrip?.style.removeProperty('scroll-snap-type');
	}

	function scrollToColumn(column: HTMLElement | undefined, behavior: ScrollBehavior = 'smooth'): void {
		if (!columnStrip || !column) return;
		const scrollInset = Number.parseFloat(getComputedStyle(columnStrip).scrollPaddingInlineStart) || 20;
		const target = Math.max(0, column.offsetLeft - scrollInset);
		cancelColumnSlide();
		if (behavior === 'auto' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			columnStrip.scrollTo({ left: target, behavior: 'auto' });
			return;
		}
		const start = columnStrip.scrollLeft;
		const distance = target - start;
		if (Math.abs(distance) < 2) return;
		const duration = Math.min(1100, Math.max(520, Math.abs(distance) * .38));
		const startedAt = performance.now();
		programmaticSlide = true;
		columnStrip.style.scrollSnapType = 'none';
		const step = (now: number) => {
			const progress = Math.min(1, (now - startedAt) / duration);
			const eased = progress < .5
				? 4 * progress ** 3
				: 1 - Math.pow(-2 * progress + 2, 3) / 2;
			columnStrip.scrollLeft = start + distance * eased;
			if (progress < 1) {
				slideFrame = requestAnimationFrame(step);
				return;
			}
			columnStrip.scrollLeft = target;
			slideFrame = 0;
			programmaticSlide = false;
			columnStrip.style.removeProperty('scroll-snap-type');
		};
		slideFrame = requestAnimationFrame(step);
	}

	function goToView(view: AppView): void {
		if (view === $ui.view) {
			scrollToColumn(columnForView(view));
			return;
		}
		household.setView(view);
	}

	function revealDetailColumn(): void {
		requestAnimationFrame(() => requestAnimationFrame(() => scrollToColumn(detailColumn)));
	}

	function showScrollbarWhileScrolling(event: Event): void {
		const scroller = event.currentTarget as HTMLElement;
		scroller.classList.add('is-scrolling');
		const existingTimer = scrollbarTimers.get(scroller);
		if (existingTimer) window.clearTimeout(existingTimer);
		scrollbarTimers.set(scroller, window.setTimeout(() => {
			scroller.classList.remove('is-scrolling');
			scrollbarTimers.delete(scroller);
		}, 700));
	}

	function syncViewFromScroll(event: Event): void {
		showScrollbarWhileScrolling(event);
		if (programmaticSlide) return;
		cancelAnimationFrame(scrollFrame);
		scrollFrame = requestAnimationFrame(() => {
			if (!columnStrip) return;
			const focusPoint = columnStrip.scrollLeft + Math.min(columnStrip.clientWidth * .42, 420);
			const columns = Array.from(columnStrip.querySelectorAll<HTMLElement>('.care-column[data-view]'));
			const nearest = columns.find((column) => focusPoint >= column.offsetLeft && focusPoint < column.offsetLeft + column.offsetWidth)
				?? columns.reduce<HTMLElement | undefined>((best, column) => !best || Math.abs(column.offsetLeft - focusPoint) < Math.abs(best.offsetLeft - focusPoint) ? column : best, undefined);
			const view = nearest?.dataset.view as AppView | undefined;
			if (view && view !== $ui.view) {
				viewUpdatedByScroll = view;
				ui.update((value) => ({ ...value, view }));
			}
		});
	}

	$effect(() => {
		const view = $ui.view;
		if (!appReady) return;
		if (viewUpdatedByScroll === view) {
			viewUpdatedByScroll = undefined;
			return;
		}
		requestAnimationFrame(() => scrollToColumn(columnForView(view)));
	});

	function requestAppointment(id: string, request: 'reschedule' | 'cancel' = 'reschedule'): void {
		const item = $household.commitments.find((candidate) => candidate.id === id);
		const ownerName = $household.preferences.ownerName.trim();
		const signOff = ownerName ? `Thank you, ${ownerName}.` : 'Thank you.';
		const message = request === 'cancel'
			? `Hello, I need to cancel my appointment with Dr Patel currently shown for ${item ? formatDay(item.startAt.slice(0, 10)) : 'the scheduled date'}. Please confirm when it has been cancelled. ${signOff}`
			: `Hello, I would like to move my appointment with Dr Patel. Could you please offer a calm morning time later this week? Please keep the current appointment until I confirm a new time. ${signOff}`;
		household.createAppointmentRequestPlan(id, request, message, undefined, gmailStatus.connected ? 'gmail_draft' : 'demo');
	}

	function draftAttentionReply(attentionId: string): void {
		replyAttentionId = attentionId;
	}

	function reviewAttentionReply(message: string): void {
		if (!replyAttentionId) return;
		const attentionId = replyAttentionId;
		replyAttentionId = undefined;
		household.createAttentionReplyPlan(attentionId, message, gmailStatus.connected ? 'gmail_draft' : 'demo');
	}

	function closeTools(): void {
		toolsOpen = false;
		requestAnimationFrame(() => webMcpButton?.focus({ preventScroll: true }));
	}

	async function refreshGmailStatus(): Promise<void> {
		try {
			gmailStatus = await getGmailStatus();
		} catch {
			gmailStatus = { configured: false, connected: false, capabilities: [] };
			gmailMessage = '';
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
			const failureMessage = cause instanceof Error ? cause.message : 'Gmail could not be checked.';
			gmailMessage = '';
			if (failureMessage.toLowerCase().includes('reconnect') || failureMessage.toLowerCase().includes('not connected')) {
				gmailStatus = { ...gmailStatus, connected: false, email: undefined, capabilities: [] };
			}
		} finally {
			gmailBusy = false;
		}
	}

	async function removeGmailConnection(): Promise<void> {
		if (!window.confirm('Disconnect Gmail from this device? Existing CareWeave items and Gmail drafts will remain.')) return;
		gmailBusy = true;
		try {
			await disconnectGmail();
			gmailStatus = { ...gmailStatus, connected: false, email: undefined, capabilities: [] };
			gmailMessage = 'Gmail disconnected from this device.';
		} catch (cause) {
			gmailMessage = '';
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
			gmailMessage = result.success ? 'Gmail draft created. Open Gmail to review and send it.' : `A Gmail draft may have been created, but CareWeave could not finish updating the board: ${result.summary}`;
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
		activeReminderId = reminder.id;
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
		realtimeVoice = new CareWeaveRealtimeVoice({
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
	<title>CareWeave — everyday care, woven together</title>
	<meta name="description" content="CareWeave is a calm shared dayboard where older adults and WebMCP agents understand care plans, focus the same screen and prepare safe next steps together." />
	<link rel="canonical" href="https://care-weave.vercel.app/" />
	<meta property="og:title" content="CareWeave — everyday care, woven together" />
	<meta property="og:description" content="One calm shared care surface where people and WebMCP agents understand, focus and prepare together." />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://care-weave.vercel.app/" />
	<meta property="og:site_name" content="CareWeave" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="CareWeave — everyday care, woven together" />
	<meta name="twitter:description" content="One calm shared care surface where people and WebMCP agents understand, focus and prepare together." />
</svelte:head>

<a class="skip-link" href="#main-content">Skip to today’s plan</a>
<div class="app-shell" class:guided={$household.preferences.guidedMode} class:private-hidden={privacyOpen} aria-hidden={privacyOpen ? 'true' : undefined} inert={privacyOpen} data-contrast={$household.preferences.contrast} data-text-size={$household.preferences.textSize} data-ready={appReady}>
	<aside class="sidebar" aria-label="Main navigation">
		<div class="brand-mark" aria-hidden="true">
			<svg class="careweave-symbol" viewBox="0 0 64 64" fill="none">
				<path class="symbol-heart" d="M32 51S11 40 11 24.5C11 17.6 16.1 12 23 12c4 0 7.3 1.9 9 5 1.7-3.1 5-5 9-5 6.9 0 12 5.6 12 12.5C53 40 32 51 32 51Z"/>
				<path class="symbol-weave-under" d="M13.5 29.5c7.2-6.5 13.4-6.5 18.5 0s11.3 6.5 18.5 0"/>
				<path class="symbol-weave" d="M13.5 29.5c7.2-6.5 13.4-6.5 18.5 0s11.3 6.5 18.5 0"/>
			</svg>
		</div>
		<nav>
			{#each nav as item}
				<button class:active={$ui.view === item.id} onclick={() => goToView(item.id)} aria-current={$ui.view === item.id ? 'page' : undefined}>
					<span class="nav-icon"><Icon name={item.icon} size={25} />{#if item.id === 'attention' && newAttention.length}<em>{newAttention.length}</em>{/if}</span>
					<span>{item.label}</span>
				</button>
			{/each}
		</nav>
		<button class="sidebar-settings" aria-label="Open settings" title="Settings" onclick={() => displayOpen = true}><Icon name="settings" size={26} /></button>
	</aside>

	<div class="workspace">
		<header class="topbar">
			<div class="brand-copy"><strong>CareWeave</strong><span>everyday care, woven together</span></div>
			<div class="system-status" title={gmailStatus.connected ? `Connected as ${gmailStatus.email ?? 'your Google account'}` : $webMcpStatus.message} role="note" aria-label={gmailStatus.connected ? 'Gmail connected. CareWeave can read recent messages and create drafts, but cannot send them.' : 'Fictional demonstration. No real messages are sent.'}>
				<span aria-hidden="true"></span>
				<span><strong>{gmailStatus.connected ? 'Gmail connected' : 'Fictional demo'}</strong><small>{gmailStatus.connected ? 'Drafts only · never sends' : 'No real messages sent'}</small></span>
			</div>
			<button
				bind:this={webMcpButton}
				class="webmcp-indicator"
				class:connected={$webMcpStatus.supported}
				class:failed={$webMcpStatus.state === 'error'}
				aria-live="polite"
				aria-label={`Show WebMCP tools: ${$webMcpStatus.state === 'connected' ? `${$webMcpStatus.registered} site tools connected` : $webMcpStatus.state === 'error' ? 'connection failed' : `${webMcpToolCount} site tools ready`}`}
				title={$webMcpStatus.message}
				onclick={() => toolsOpen = true}
			>
				<span aria-hidden="true"></span>
				<span><strong>Assistant ready</strong><small>{$webMcpStatus.state === 'connected' ? `WebMCP · ${$webMcpStatus.registered} tools connected` : $webMcpStatus.state === 'error' ? 'WebMCP unavailable' : `WebMCP · ${webMcpToolCount} tools ready`}</small></span>
			</button>
			<button class="display-button" onclick={() => displayOpen = true} aria-label="Open display settings"><span>Aa</span><strong>Display</strong></button>
			<button class="privacy-button" onclick={() => privacyOpen = true} aria-label="Start privacy screensaver"><Icon name="shield" size={20} /><strong>Hide</strong></button>
		</header>

		<main id="main-content" class="column-strip" bind:this={columnStrip} tabindex="-1" aria-label="CareWeave board sections" onscroll={syncViewFromScroll} onpointerdown={cancelColumnSlide} onwheel={cancelColumnSlide} ontouchstart={cancelColumnSlide}>
			<section class="care-column today-column" class:route-column-active={!!activeRoute} data-view="today" bind:this={todayColumn} aria-label="Day" onscroll={showScrollbarWhileScrolling}>
				<section class="page-intro">
						<div>
							<span class="eyebrow">{$household.preferences.ownerName.trim() ? `Hello ${$household.preferences.ownerName.trim()}` : 'Welcome'}</span>
							<h1>{selectedDate === localDateKey() ? 'Today' : formatDay(selectedDate)}</h1>
							<p class="calm-line" title={pacing.reasons.join(' · ')}><span class="pacing-dot {pacing.level}"></span> {#if selectedDate === localDateKey()}<strong>{formatDay(selectedDate, 'short')}</strong> · {/if}<strong>{pacing.level === 'calm' ? 'Calm' : pacing.level === 'steady' ? 'Steady' : 'Busy'}</strong> · {dayItems.length} {dayItems.length === 1 ? 'plan' : 'plans'}</p>
						</div>
						<div class="page-intro-side">
							<div class="date-switcher" aria-label="Choose day">
								<button aria-label="Previous day" onclick={() => focusDay(addDays(selectedDate, -1))}>‹</button>
								<div><span>{selectedDate === localDateKey() ? 'Today' : formatDay(selectedDate, 'short')}</span><strong>{new Date(`${selectedDate}T12:00:00`).getDate()}</strong></div>
								<button aria-label="Next day" onclick={() => focusDay(addDays(selectedDate, 1))}>›</button>
							</div>
						</div>
				</section>

				{#if $household.preferences.guidedMode}
					<section class="guided-brief" aria-labelledby="guided-brief-title">
						<span class="guided-brief-icon"><Icon name={guidedFocusItem ? (guidedFocusItem.kind === 'health' ? 'heart' : guidedFocusItem.kind === 'food' ? 'basket' : guidedFocusItem.kind === 'care' ? 'care-visit' : 'calendar') : 'sun'} size={31} /></span>
						<div>
							<span class="eyebrow">One step at a time</span>
							<h2 id="guided-brief-title">{upcomingDayItem ? `Next: ${upcomingDayItem.title}` : selectedDate === localDateKey() ? 'Today is finished' : guidedFocusItem ? guidedFocusItem.title : 'A calm day'}</h2>
							{#if guidedFocusItem}
								<p>{guidedFocusItem === nextFutureItem && !upcomingDayItem ? `Your next plan is ${formatDay(guidedFocusItem.startAt.slice(0, 10))} at ${formatTime(guidedFocusItem.startAt, guidedFocusItem.timeZone)}.` : `${formatTime(guidedFocusItem.startAt, guidedFocusItem.timeZone)} · ${$household.places.find((place) => place.id === guidedFocusItem?.locationId)?.shortAddress ?? 'At home'}`}</p>
							{:else}<p>There is nothing you need to be somewhere for.</p>{/if}
						</div>
						<div class="guided-brief-actions">
							{#if guidedFocusItem}<button class="primary-button" onclick={() => openCommitment(guidedFocusItem!)}>Show this plan</button>{/if}
							<button class="secondary-button" onclick={() => household.setDisplay({ guidedMode: false })}>Show full day</button>
						</div>
					</section>
				{:else}
				<section class="glance-grid" aria-label="At a glance">
					<button class={`week-forecast-summary today-forecast-summary weather-${selectedDayForecast.condition}`} aria-haspopup="dialog" aria-label={`Open hourly forecast for ${selectedDate === localDateKey() ? 'today' : formatDay(selectedDate)}`} onclick={() => weatherOpen = true}>
						<span class="week-forecast-icon"><WeatherGlyph condition={selectedDayForecast.condition} size={54} /></span>
						<span class="forecast-copy"><strong>{selectedDayForecast.label}{selectedDayForecast.temperature !== undefined ? ` · ${selectedDayForecast.temperature}°` : ''}</strong><em>{selectedDayForecast.high !== undefined && selectedDayForecast.low !== undefined ? `High ${Math.round(selectedDayForecast.high)}° · Low ${Math.round(selectedDayForecast.low)}°` : 'Weather updates automatically'}{selectedDayForecast.precipitationProbability !== undefined ? ` · ${Math.round(selectedDayForecast.precipitationProbability)}% rain` : ''}</em></span>
						<span class="weather-open-label" aria-hidden="true"><Icon name="arrow" size={18} /></span>
					</button>
						<button class="glance attention-glance" onclick={() => goToView('attention')}>
							<span class="glance-icon"><Icon name="mail" size={25} /></span><span><strong>{newAttention[0]?.title ?? 'Nothing waiting'}</strong><small>{newAttention.length ? `${newAttention.length} ${newAttention.length === 1 ? 'decision' : 'decisions'} to review` : 'Everything is reviewed'}</small></span><Icon name="arrow" size={21} />
						</button>
						<button class="glance food-glance" onclick={() => goToView('food')}>
							<span class="glance-icon"><Icon name="basket" size={25} /></span><span><strong>Food for {$household.food.daysCovered} days</strong><small>shop by {formatDay($household.food.nextShoppingBy, 'short')}</small></span><Icon name="arrow" size={21} />
						</button>
						<button class="glance safe-glance" onclick={() => activeReminders[0] && openReminder(activeReminders[0])}><span class="glance-icon"><Icon name="clock" size={25} /></span><span><strong>{activeReminders[0]?.label ?? 'No reminders due'}</strong><small>{activeReminders.some((reminder) => reminder.status === 'help_requested') ? 'Someone has been asked to help' : activeReminders.length ? `${activeReminders.length} ${activeReminders.length === 1 ? 'reminder' : 'reminders'} · tap to respond` : 'Nothing needs a response'}</small></span><Icon name="arrow" size={21} /></button>
				</section>
				{/if}

				<div class="day-layout" class:route-active={!!activeRoute} class:details-active={!!displayedDetailItem && !activeRoute}>
					<section class="timeline-section" aria-labelledby="timeline-title">
						<div class="section-heading"><div><span class="eyebrow">{formatDay(selectedDate)}</span><h2 id="timeline-title">What’s happening</h2></div><span>{$household.preferences.guidedMode ? `${visibleDayItems.length} shown` : `${dayItems.length} planned`}</span></div>
						<div class="timeline" class:empty={visibleDayItems.length === 0}>
							{#if visibleDayItems.length === 0}
								{#if selectedDate === localDateKey() && dayItems.length}
									<div class="empty-state"><Icon name="check" size={35} /><h3>Today is finished</h3><p>Your planned items for today have passed.</p></div>
								{:else}
								<div class="empty-state"><Icon name="sun" size={35} /><h3>A calm day</h3><p>There is nothing you need to be somewhere for.</p></div>
								{/if}
							{:else}
								{#each visibleDayItems as item (item.id)}
									<EventCard {item} careVisitUpdate={careVisitUpdateFor(item)} reminder={$household.reminders.find((reminder) => reminder.commitmentId === baseCommitmentId(item.id))} place={$household.places.find((place) => place.id === item.locationId)} highlighted={$ui.highlightedCommitmentIds.includes(item.id)} selected={displayedDetailItem?.id === item.id && !$ui.showRouteForId} onSelect={() => selectCommitment(item.id)} onRequest={() => requestAppointment(baseCommitmentId(item.id))} />
								{/each}
							{/if}
						</div>
					</section>

					<aside class="right-rail" bind:this={detailColumn} aria-label="Helpful details">
						{#if activeRoute}
							<RoutePanel route={activeRoute} onClose={closeSidePanel} />
						{:else if displayedDetailItem}
							<EventDetails
								item={displayedDetailItem}
								place={$household.places.find((place) => place.id === displayedDetailItem?.locationId)}
								participants={$household.people.filter((person) => displayedDetailItem?.participantIds.includes(person.id))}
								sources={$household.sources.filter((source) => displayedDetailItem?.sourceIds.includes(source.id))}
								reminder={selectedReminder}
								careVisitUpdate={careVisitUpdateFor(displayedDetailItem)}
								onClose={closeSidePanel}
								showClose={Boolean(selectedItem)}
								onTogglePrep={(prepId) => household.togglePrep(baseCommitmentId(displayedDetailItem!.id), prepId)}
								onRoute={() => showRoute(displayedDetailItem!.id)}
								onRequest={(request) => requestAppointment(baseCommitmentId(displayedDetailItem!.id), request)}
								onReminder={(response) => household.respondToReminder(selectedReminder!.id, response)}
							/>
						{:else}
							<section class="detail-panel empty-day-detail">
								<div class="detail-about">
									<h2>{selectedDate === localDateKey() && dayItems.length ? 'Today is finished' : 'A calm day'}</h2>
									<p>{selectedDate === localDateKey() && dayItems.length ? 'Everything planned for today has passed.' : 'There are no active plans to show for this day.'}</p>
									{#if selectedDate === localDateKey() && nextFutureItem}
										<div class="next-plan-card"><span class="eyebrow">Next plan</span><strong>{nextFutureItem.title}</strong><span>{formatDay(nextFutureItem.startAt.slice(0, 10))} at {formatTime(nextFutureItem.startAt, nextFutureItem.timeZone)}</span><button class="primary-button" onclick={() => openCommitment(nextFutureItem!)}>Show next plan</button></div>
									{/if}
								</div>
							</section>
						{/if}
					</aside>
				</div>
			</section>
			<section class="care-column week-column" data-view="week" bind:this={weekColumn} aria-label="Next 7 days" onscroll={showScrollbarWhileScrolling}>
				<section class="standard-page">
					<div class="page-title-row"><div><span class="eyebrow">A simple look ahead</span><h1>Next 7 days</h1><p>Your plans for the week, with the forecast beside each day.</p></div></div>
					<div class="week-grid">
						{#each weekDates as date}
							{@const dayWeather = boardForecast.outlook.find((forecast) => forecast.date === date)}
							<button
								class:today={date === weekStartDate}
								class:selected={date === selectedDate}
								data-date={date}
								aria-pressed={date === selectedDate}
								aria-label={`Show ${formatDay(date)} in the Day column`}
								onclick={() => focusDay(date)}
							>
								<header><span class="week-day-label"><span>{formatDay(date, 'short').split(' ')[0]}</span><strong>{new Date(`${date}T12:00:00`).getDate()}</strong></span><span class={`week-weather-compact weather-${dayWeather?.condition ?? 'fair'}`} title={dayWeather?.label ?? 'Forecast pending'}><WeatherGlyph condition={dayWeather?.condition ?? 'fair'} size={50} /><b>{dayWeather?.high !== undefined ? `${Math.round(dayWeather.high)}°` : '—'}</b></span></header>
								{#each commitmentsForDate($household, date) as item}<span class="week-event {item.kind}"><small>{formatTime(item.startAt, item.timeZone)}</small>{item.title}</span>{/each}
								{#if commitmentsForDate($household, date).length === 0}<em>Clear</em>{/if}
							</button>
						{/each}
					</div>
				</section>
			</section>
			<section class="care-column attention-column" data-view="attention" bind:this={attentionColumn} aria-label="Needs attention" onscroll={showScrollbarWhileScrolling}>
				<section class="standard-page narrow-page">
					<div class="page-title-row"><div><span class="eyebrow">Messages and support</span><h1>Needs attention</h1><p>Messages can be wrong, and family offers are only suggestions. You decide before anything changes.</p></div><div class="attention-header-actions">{#if gmailStatus.connected}<span class="trust-label"><Icon name="shield" size={18} /> Connected{gmailStatus.email ? ` as ${gmailStatus.email}` : ''}</span><button class="secondary-button" aria-label="Check Gmail" onclick={checkMessages} disabled={gmailBusy}><Icon name="mail" size={19} /> {gmailBusy ? 'Checking…' : 'Check'}</button><button class="text-button" onclick={removeGmailConnection} disabled={gmailBusy}>Disconnect</button>{:else if gmailStatus.configured}<button class="primary-button" onclick={connectGmail}><Icon name="mail" size={19} /> Connect Gmail</button><button class="secondary-button" aria-label="Check sample messages" onclick={checkMessages}><Icon name="mail" size={19} /> Check</button>{:else}<button class="secondary-button" aria-label="Check sample messages" onclick={checkMessages}><Icon name="mail" size={19} /> Check</button>{/if}</div></div>
					{#if gmailMessage}<p class="gmail-feedback" role="status">{gmailMessage}</p>{/if}
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
			</section>
			<section class="care-column food-column" data-view="food" bind:this={foodColumn} aria-label="Food at home" onscroll={showScrollbarWhileScrolling}>
				<section class="standard-page food-page">
					<div class="page-title-row"><div><span class="eyebrow">Meals and groceries</span><h1>Food at home</h1><p>You have enough planned for <strong>{$household.food.daysCovered} days</strong>. Shop by {formatDay($household.food.nextShoppingBy)}.</p></div><div class="food-days"><strong>{$household.food.daysCovered}</strong><span>days covered</span></div></div>
					<div class="food-layout">
						<section><div class="section-heading"><div><span class="eyebrow">Simple list</span><h2>Shopping</h2></div><span>{$household.food.groceryItems.filter((item) => !item.checked).length} left</span></div>
							<div class="grocery-list">{#each $household.food.groceryItems as item}<button class:done={item.checked} onclick={() => household.toggleGrocery(item.id)}><span class="big-check"><Icon name="check" size={21} /></span><span><strong>{item.name}</strong><small>{item.quantity} · needed by {formatDay(item.neededBy, 'short')}</small></span></button>{/each}</div>
						</section>
						<aside class="meal-notes"><span class="eyebrow">At a glance</span><h2>You’re covered</h2>{#each $household.food.notes as note}<p><Icon name="check" size={19} /> {note}</p>{/each}<div class="shopping-date"><Icon name="basket" size={27} /><span><small>Next shopping</small><strong>{formatDay($household.food.nextShoppingBy)}</strong></span></div></aside>
					</div>
				</section>
			</section>
			<section class="care-column support-column" data-view="support" bind:this={supportColumn} aria-label="Support" onscroll={showScrollbarWhileScrolling}>
				<SupportView
					data={$household}
					date={localDateKey()}
					supporterId={selectedSupporterId}
					onOffer={offerSupport}
					onHelpRequest={(reminderId, response) => household.respondToHelpRequest(selectedSupporterId, reminderId, response)}
					onFulfillment={(offerId, status) => household.updateSupportOfferFulfillment(selectedSupporterId, offerId, status)}
					onManage={() => supportSetupOpen = true}
					onOpenBoard={() => goToView('today')}
				/>
			</section>
			<section class="care-column history-column" data-view="history" bind:this={historyColumn} aria-label="History" onscroll={showScrollbarWhileScrolling}>
				<section class="standard-page narrow-page">
					<div class="page-title-row"><div><span class="eyebrow">Your activity</span><h1>What happened</h1><p>Every message you save and every change you make appears here.</p></div><button class="secondary-button" aria-label="Reset fictional demo" onclick={resetDemo}>Reset</button></div>
					<div class="history-list">{#each $household.activity as entry}<article><span class="history-dot"></span><div><span>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(entry.createdAt))}</span><h2>{entry.label}</h2><p>{entry.detail}</p></div></article>{/each}</div>
					{#if $household.outbox.length}<section class="outbox"><span class="eyebrow">Prepared messages</span><h2>Messages created from reviewed plans</h2>{#each $household.outbox as email}<div><strong>{email.subject}</strong><span>To {email.to} · {email.status === 'saved_demo' ? 'local suggestion — not sent' : 'Gmail draft — not sent'}</span></div>{/each}</section>{/if}
				</section>
			</section>
		</main>

		<footer class="voice-bar">
			<button class="undo-button" onclick={() => household.undo()} title="Undo last change"><Icon name="undo" size={22} /><span>Undo</span></button>
			<button class="voice-prompt" onclick={() => { voiceTranscript = ''; voiceResponse = ''; voiceOpen = true; }}><span class="voice-button"><Icon name="mic" size={27} /></span><span><strong>Talk to CareWeave</strong><small>{voiceSupported ? 'Have a full conversation' : 'Use ChatGPT voice or tap an example'}</small></span></button>
			<button class="help-now-button" aria-label="Help now" onclick={() => helpOpen = true}><Icon name="help" size={21} /><span>Help now</span></button>
			<div class="live-announcement" aria-live="polite">{$ui.announcement}</div>
		</footer>
	</div>
</div>

{#if activePlan}<PlanDialog plan={activePlan} onApprove={() => approvePlan(activePlan!)} onDiscard={() => household.discardPlan(activePlan!.id)} />{/if}
{#if voiceOpen}<VoiceSheet supported={voiceSupported} status={voiceStatus} statusMessage={voiceStatusMessage} transcript={voiceTranscript} response={voiceResponse} onConversation={toggleVoiceConversation} onExample={handleVoiceCommand} onClose={closeVoice} />{/if}
{#if displayOpen}<DisplaySheet textSize={$household.preferences.textSize} contrast={$household.preferences.contrast} guidedMode={$household.preferences.guidedMode} readAloud={$household.preferences.readAloud} onTextSize={(textSize) => household.setDisplay({ textSize })} onContrast={(contrast) => household.setDisplay({ contrast })} onGuidedMode={(guidedMode) => household.setDisplay({ guidedMode })} onReadAloud={(readAloud) => household.setDisplay({ readAloud })} onClose={() => displayOpen = false} />{/if}
{#if supportSetupOpen}<SupportSetupSheet data={$household} onInvite={inviteSupporter} onUpdate={(personId, input) => household.updateSupportAccess(personId, input)} onPreview={(personId) => { selectedSupporterId = personId; supportSetupOpen = false; household.setView('support'); }} onClose={() => supportSetupOpen = false} />{/if}
{#if helpOpen}<HelpSheet supporterName={primarySupporter?.name} supporterPhone={primarySupporter?.phone} onClose={() => helpOpen = false} />{/if}
{#if privacyOpen}<PrivacyCover ownerName={$household.preferences.ownerName} location={privacyLocation} onUnlock={() => privacyOpen = false} />{/if}
{#if weatherOpen}<WeatherForecastSheet date={selectedDate} forecast={selectedDayForecast} hours={boardForecast.hourly ?? []} onClose={() => weatherOpen = false} />{/if}
{#if activeReminder && activeReminderItem}<ReminderSheet reminder={activeReminder} item={activeReminderItem} onResponse={(response) => household.respondToReminder(activeReminder!.id, response)} onClose={() => activeReminderId = undefined} />{/if}
{#if toolsOpen}<ToolInventorySheet tools={webMcpTools} connected={$webMcpStatus.state === 'connected'} registered={$webMcpStatus.registered} onClose={closeTools} />{/if}
{#if replyAttentionItem}<ReplyComposerSheet item={replyAttentionItem} source={replySource} onReview={reviewAttentionReply} onClose={() => replyAttentionId = undefined} />{/if}
