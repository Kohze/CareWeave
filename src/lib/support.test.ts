import { beforeEach, describe, expect, it } from 'vitest';
import { household } from './app';
import { localDateKey } from './dates';
import { supportOverview } from './support';

describe('trusted family support', () => {
	beforeEach(() => household.reset());

	it('returns a deliberately privacy-limited overview', () => {
		const overview = supportOverview(household.snapshot(), 'person-sam', localDateKey());
		expect(overview).toBeDefined();
		expect(overview?.status).toBe('on_track');
		expect(overview?.careVisits[0]).toMatchObject({ commitmentId: 'event-carer', status: 'completed' });
		expect(overview?.food).toMatchObject({ daysCovered: 2, itemsRemaining: 3 });
		expect(overview?.attentionCount).toBeUndefined();
		const serialized = JSON.stringify(overview);
		expect(serialized).not.toContain('blood pressure');
		expect(serialized).not.toContain('medication box was checked');
		expect(serialized).not.toContain('mail-clinic');
	});

	it('turns a reminder into an acknowledged and completed help request', () => {
		expect(household.respondToReminder('reminder-lunch', 'need_help').success).toBe(true);
		let overview = supportOverview(household.snapshot(), 'person-sam', localDateKey());
		expect(overview?.helpRequests[0]).toMatchObject({ reminderId: 'reminder-lunch', status: 'help_requested' });
		expect(household.respondToHelpRequest('person-sam', 'reminder-lunch', 'completed').success).toBe(false);
		expect(household.respondToHelpRequest('person-sam', 'reminder-lunch', 'acknowledged').success).toBe(true);
		expect(household.respondToHelpRequest('person-sam', 'reminder-lunch', 'completed').success).toBe(true);
		expect(household.snapshot().reminders.find((item) => item.id === 'reminder-lunch')?.status).toBe('done');
	});

	it('supports narrow invitations, expiry, and revocation', () => {
		const invited = household.inviteSupporter({ name: 'Pat', relationship: 'Neighbour', email: 'pat@example.test', permissions: ['view_food_status'], durationDays: 7 });
		expect(invited.success).toBe(true);
		const personId = invited.affectedIds![0];
		expect(household.snapshot().supportCircle.find((member) => member.personId === personId)).toMatchObject({ status: 'invited', permissions: ['view_food_status'] });
		expect(supportOverview(household.snapshot(), personId, localDateKey())).toBeUndefined();
		expect(household.updateSupportAccess('person-sam', { permissions: ['view_food_status'], durationDays: 30 }).success).toBe(true);
		expect(supportOverview(household.snapshot(), 'person-sam', localDateKey())?.schedule).toEqual([]);
		expect(household.updateSupportAccess('person-sam', { revoke: true }).success).toBe(true);
		expect(supportOverview(household.snapshot(), 'person-sam', localDateKey())).toBeUndefined();
	});

	it('rejects people without active support access', () => {
		expect(supportOverview(household.snapshot(), 'person-patel', localDateKey())).toBeUndefined();
		expect(household.suggestSupport('person-patel', 'check_in', 'I can call this evening.').success).toBe(false);
	});

	it('creates a proposal without changing the calendar and lets the account owner respond', () => {
		const before = household.snapshot().commitments;
		const offered = household.suggestSupport('person-sam', 'appointment', 'I can come with you.', 'event-doctor');
		expect(offered.success).toBe(true);
		expect(household.snapshot().commitments).toEqual(before);
		expect(household.snapshot().attentionItems[0]).toMatchObject({ category: 'support_offer', status: 'new' });
		expect(household.suggestSupport('person-sam', 'appointment', 'A duplicate offer.', 'event-doctor').success).toBe(false);

		const accepted = household.respondToSupportOffer(offered.data!.id, 'accepted');
		expect(accepted.success).toBe(true);
		expect(household.snapshot().supportOffers[0].status).toBe('accepted');
		expect(household.snapshot().attentionItems[0].status).toBe('resolved');
		expect(household.snapshot().commitments).toEqual(before);
	});
});
