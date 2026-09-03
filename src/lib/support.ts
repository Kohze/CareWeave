import { commitmentsForDate } from './planner';
import { syncOverview, type SyncOverview } from './reliability';
import type { AppData, CommitmentKind, SupportMember } from './types';

export interface SupportOverview {
	ownerName: string;
	date: string;
	status: 'on_track' | 'needs_attention';
	statusSummary: string;
	supporter: {
		personId: string;
		name: string;
		relationship: string;
		permissions: SupportMember['permissions'];
	};
	schedule: Array<{
		id: string;
		kind: CommitmentKind;
		title: string;
		startAt: string;
		endAt: string;
		status: string;
		place?: string;
		timeZone?: string;
	}>;
	careVisits: Array<{
		commitmentId: string;
		title: string;
		startAt: string;
		status: string;
		updatedAt?: string;
		timeZone?: string;
	}>;
	food?: {
		daysCovered: number;
		nextShoppingBy: string;
		itemsRemaining: number;
	};
	attentionCount?: number;
	appointmentPreparation: Array<{
		commitmentId: string;
		title: string;
		ready: number;
		total: number;
	}>;
	openOffers: number;
	dataFreshness: SyncOverview;
	helpRequests: Array<{
		reminderId: string;
		label: string;
		status: 'help_requested' | 'help_acknowledged';
		requestedAt?: string;
	}>;
	acceptedAssignments: Array<{
		offerId: string;
		message: string;
		status: 'accepted' | 'acknowledged' | 'completed';
	}>;
}

export function supportMemberIsActive(member: SupportMember, now = new Date()): boolean {
	if (member.status !== 'active') return false;
	if (member.accessStartsAt && new Date(member.accessStartsAt) > now) return false;
	if (member.accessExpiresAt && new Date(member.accessExpiresAt) <= now) return false;
	return true;
}

/**
 * Produces the deliberately limited family view. Message contents, medical
 * notes, source records and carer notes never cross this boundary.
 */
export function supportOverview(data: AppData, supporterPersonId: string, date: string): SupportOverview | undefined {
	const membership = data.supportCircle.find((member) => member.personId === supporterPersonId && supportMemberIsActive(member));
	const person = data.people.find((candidate) => candidate.id === supporterPersonId);
	if (!membership || !person) return undefined;

	const visibleSchedule = membership.permissions.includes('view_schedule')
		? commitmentsForDate(data, date).map((item) => ({
			id: item.id,
			kind: item.kind,
			title: item.title,
			startAt: item.startAt,
			endAt: item.endAt,
			status: item.status,
			place: data.places.find((place) => place.id === item.locationId)?.name,
			timeZone: item.timeZone
		}))
		: [];

	const careVisits = membership.permissions.includes('view_care_status')
		? commitmentsForDate(data, date)
			.filter((item) => item.kind === 'care')
			.map((item) => {
				const update = data.careVisitUpdates.find((candidate) => candidate.commitmentId === item.id);
				return {
					commitmentId: item.id,
					title: item.title,
					startAt: item.startAt,
					status: update?.status ?? 'scheduled',
					updatedAt: update?.updatedAt,
					timeZone: item.timeZone
				};
			})
		: [];

	const food = membership.permissions.includes('view_food_status')
		? {
			daysCovered: data.food.daysCovered,
			nextShoppingBy: data.food.nextShoppingBy,
			itemsRemaining: data.food.groceryItems.filter((item) => !item.checked).length
		}
		: undefined;

	const appointmentPreparation = membership.permissions.includes('view_schedule')
		? data.commitments
			.filter((item) => item.kind === 'health' && item.status !== 'cancelled' && item.startAt.slice(0, 10) >= date && item.prep.length > 0)
			.slice(0, 2)
			.map((item) => ({
				commitmentId: item.id,
				title: item.title,
				ready: item.prep.filter((prep) => prep.done).length,
				total: item.prep.length
			}))
		: [];

	const careProblem = careVisits.some((visit) => visit.status === 'late' || visit.status === 'missed');
	const foodProblem = Boolean(food && food.daysCovered < 1);
	const dataFreshness = syncOverview(data);
	const status = careProblem || foodProblem || dataFreshness.status !== 'current' ? 'needs_attention' : 'on_track';
	const helpRequests = membership.permissions.includes('respond_to_help')
		? data.reminders
			.filter((reminder) => reminder.status === 'help_requested' || (reminder.status === 'help_acknowledged' && reminder.helpAcknowledgedById === supporterPersonId))
			.map((reminder) => ({ reminderId: reminder.id, label: reminder.label, status: reminder.status as 'help_requested' | 'help_acknowledged', requestedAt: reminder.helpRequestedAt }))
		: [];
	const acceptedAssignments = membership.permissions.includes('respond_to_help')
		? data.supportOffers
			.filter((offer) => offer.createdById === supporterPersonId && offer.status === 'accepted')
			.map((offer) => ({ offerId: offer.id, message: offer.message, status: offer.fulfillmentStatus ?? 'accepted' }))
		: [];

	return {
		ownerName: data.preferences.ownerName,
		date,
		status,
		statusSummary: status === 'on_track'
			? 'No missed care visits or urgent food gaps are showing.'
			: dataFreshness.status !== 'current' ? 'Some connected information is not current.' : 'A care visit or food plan needs attention.',
		supporter: {
			personId: person.id,
			name: person.name,
			relationship: membership.relationship,
			permissions: membership.permissions
		},
		schedule: visibleSchedule,
		careVisits,
		food,
		attentionCount: membership.permissions.includes('view_attention_count') ? data.attentionItems.filter((item) => item.status === 'new').length : undefined,
		appointmentPreparation,
		openOffers: data.supportOffers.filter((offer) => offer.createdById === supporterPersonId && offer.status === 'suggested').length,
		dataFreshness,
		helpRequests,
		acceptedAssignments
	};
}
