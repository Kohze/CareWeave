<script lang="ts">
	import { formatDay, formatTime } from '$lib/dates';
	import { supportOverview } from '$lib/support';
	import type { AppData, SupportOfferCategory } from '$lib/types';
	import Icon from './Icon.svelte';
	import FreshnessStrip from './FreshnessStrip.svelte';

	let {
		data,
		date,
		supporterId,
		onOffer,
		onHelpRequest,
		onFulfillment,
		onManage,
		onOpenBoard
	}: {
		data: AppData;
		date: string;
		supporterId: string;
		onOffer: (category: SupportOfferCategory, message: string, relatedCommitmentId?: string) => void;
		onHelpRequest: (reminderId: string, response: 'acknowledged' | 'completed') => void;
		onFulfillment: (offerId: string, status: 'acknowledged' | 'completed') => void;
		onManage: () => void;
		onOpenBoard: () => void;
	} = $props();

	let overview = $derived(supportOverview(data, supporterId, date));
	let supporter = $derived(data.people.find((person) => person.id === supporterId));
	let doctor = $derived(data.commitments.find((item) => item.kind === 'health' && item.status !== 'cancelled'));
	let shopping = $derived(data.commitments.find((item) => item.kind === 'shopping' && item.status !== 'cancelled'));
	let latestOffer = $derived(data.supportOffers.find((offer) => offer.createdById === supporterId));

	function isWaiting(category: SupportOfferCategory, relatedCommitmentId?: string): boolean {
		return data.supportOffers.some((offer) =>
			offer.createdById === supporterId && offer.category === category &&
			offer.relatedCommitmentId === relatedCommitmentId && offer.status === 'suggested'
		);
	}

</script>

{#if overview}
	<section class="standard-page support-page" aria-labelledby="support-title">
		<div class="support-heading">
			<div>
				<span class="eyebrow">{supporter?.name}'s family view</span>
				<h1 id="support-title">Supporting {overview.ownerName}</h1>
				<p>A simple, privacy-limited view for people {overview.ownerName} trusts.</p>
			</div>
			<div class="support-heading-actions"><button class="secondary-button" onclick={onManage}><Icon name="shield" size={20} /> Manage access</button><button class="secondary-button" onclick={onOpenBoard}><Icon name="calendar" size={20} /> Open {overview.ownerName}'s board</button></div>
		</div>

		<section class:needs-attention={overview.status === 'needs_attention'} class="support-status" aria-label="Today's support status">
			<span class="support-status-icon"><Icon name={overview.status === 'on_track' ? 'check' : 'care'} size={31} /></span>
			<div>
				<span class="eyebrow">Today · {formatDay(date)}</span>
				<h2>{overview.status === 'on_track' ? 'Today is on track' : 'Something may need help'}</h2>
				<p>{overview.statusSummary} Updates shown here are part of the fictional demonstration.</p>
			</div>
			<FreshnessStrip overview={overview.dataFreshness} compact />
		</section>

		<div class="support-metrics" aria-label="At a glance">
			<article>
				<span class="metric-icon care"><Icon name="care" size={25} /></span>
				<div><small>Care visit</small><strong>{overview.careVisits[0]?.status === 'completed' ? 'Completed' : overview.careVisits[0]?.status ?? 'None today'}</strong>{#if overview.careVisits[0]?.updatedAt}<span>Updated {formatTime(overview.careVisits[0].updatedAt, overview.careVisits[0].timeZone)}</span>{/if}</div>
			</article>
			<article>
				<span class="metric-icon food"><Icon name="basket" size={25} /></span>
				<div><small>Food at home</small><strong>{overview.food?.daysCovered ?? '—'} days covered</strong><span>{overview.food?.itemsRemaining ?? 0} shopping items left</span></div>
			</article>
			<article>
				<span class="metric-icon attention"><Icon name="mail" size={25} /></span>
				<div><small>For {overview.ownerName}</small>{#if overview.attentionCount === undefined}<strong>Private</strong><span>Review counts are not shared</span>{:else}<strong>{overview.attentionCount} to review</strong><span>Only {overview.ownerName} can decide</span>{/if}</div>
			</article>
		</div>

		{#if overview.helpRequests.length}
			<section class="help-request-banner" aria-labelledby="help-request-title">
				<span class="support-status-icon"><Icon name="family" size={28} /></span>
				<div><span class="eyebrow">Asked for help</span><h2 id="help-request-title">{overview.helpRequests[0].label}</h2><p>{overview.helpRequests[0].status === 'help_requested' ? `${overview.ownerName} is waiting for someone to respond.` : 'You said you are helping with this.'}</p></div>
				{#if overview.helpRequests[0].status === 'help_requested'}<button class="primary-button" onclick={() => onHelpRequest(overview.helpRequests[0].reminderId, 'acknowledged')}>I can help</button>{:else}<button class="primary-button" onclick={() => onHelpRequest(overview.helpRequests[0].reminderId, 'completed')}>Mark complete</button>{/if}
			</section>
		{/if}

		<div class="support-layout">
			<section class="support-card" aria-labelledby="support-schedule-title">
				<div class="section-heading"><div><span class="eyebrow">Shared with you</span><h2 id="support-schedule-title">Today's plan</h2></div><span>{overview.schedule.length} planned</span></div>
				<div class="support-schedule">
					{#each overview.schedule as item}
						<article>
							<time datetime={item.startAt}>{formatTime(item.startAt, item.timeZone)}</time>
							<span class="mini-icon {item.kind}"><Icon name={item.kind === 'care' ? 'care' : item.kind === 'food' ? 'basket' : item.kind === 'health' ? 'heart' : 'walk'} size={20} /></span>
							<div><strong>{item.title}</strong><small>{item.place ?? 'At home'} · {item.status.replaceAll('_', ' ')}</small></div>
						</article>
					{/each}
				</div>
				<div class="privacy-strip"><Icon name="shield" size={20} /><span><strong>Private by default.</strong> Message contents, medical notes and detailed care notes are not shown here.</span></div>
			</section>

			<section class="support-card" aria-labelledby="offer-help-title">
				<div class="section-heading"><div><span class="eyebrow">Support, not control</span><h2 id="offer-help-title">Offer some help</h2></div></div>
				<p class="support-intro">Your offer appears on Margaret's board. It does not change her calendar until she decides.</p>
				<div class="support-actions">
					{#if doctor}
						<article>
							<span class="action-icon"><Icon name="heart" size={23} /></span>
							<div><strong>Come to the appointment</strong><small>{formatDay(doctor.startAt.slice(0, 10), 'short')} at {formatTime(doctor.startAt, doctor.timeZone)}</small></div>
							<button disabled={isWaiting('appointment', doctor.id)} onclick={() => onOffer('appointment', `I can come with you to ${doctor.title}.`, doctor.id)}>{isWaiting('appointment', doctor.id) ? 'Offer sent' : 'Offer help'}</button>
						</article>
					{/if}
					{#if shopping}
						<article>
							<span class="action-icon"><Icon name="basket" size={23} /></span>
							<div><strong>Help with food shopping</strong><small>Needed by {formatDay(data.food.nextShoppingBy, 'short')}</small></div>
							<button disabled={isWaiting('shopping', shopping.id)} onclick={() => onOffer('shopping', 'I can help with the food shopping.', shopping.id)}>{isWaiting('shopping', shopping.id) ? 'Offer sent' : 'Offer help'}</button>
						</article>
					{/if}
					<article>
						<span class="action-icon"><Icon name="care" size={23} /></span>
						<div><strong>Call this evening</strong><small>A friendly check-in, if wanted</small></div>
						<button disabled={isWaiting('check_in')} onclick={() => onOffer('check_in', 'I can call this evening if you would like.')}>{isWaiting('check_in') ? 'Offer sent' : 'Offer help'}</button>
					</article>
				</div>
				{#if latestOffer}
					<div class="offer-receipt" aria-live="polite"><Icon name="check" size={20} /><span>Latest offer: <strong>{latestOffer.status}</strong></span></div>
				{/if}
				{#each overview.acceptedAssignments as assignment}
					<div class="accepted-assignment">
						<div><strong>{assignment.status === 'completed' ? 'Help completed' : assignment.status === 'acknowledged' ? 'You are helping' : `${overview.ownerName} accepted your help`}</strong><span>{assignment.message}</span></div>
						{#if assignment.status === 'accepted'}<button class="secondary-button" onclick={() => onFulfillment(assignment.offerId, 'acknowledged')}>I'm on it</button>{:else if assignment.status === 'acknowledged'}<button class="secondary-button" onclick={() => onFulfillment(assignment.offerId, 'completed')}>Mark complete</button>{/if}
					</div>
				{/each}
			</section>
		</div>
	</section>
{:else}
	<section class="standard-page narrow-page"><h1>Support access unavailable</h1><p>This trusted person no longer has access to the household view.</p><button class="secondary-button" onclick={onManage}><Icon name="shield" size={20} /> Manage trusted people</button></section>
{/if}
