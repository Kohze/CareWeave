import { beforeEach, describe, expect, it } from 'vitest';
import { household } from './app';

describe('reviewable appointment actions', () => {
	beforeEach(() => household.reset());

	it('keeps the confirmed appointment while a request plan is only a draft', () => {
		const result = household.createAppointmentRequestPlan('event-doctor', 'reschedule', 'Please offer another morning appointment.');
		expect(result.success).toBe(true);
		expect(result.needsUserConfirmation).toBe(true);
		expect(household.snapshot().commitments.find((item) => item.id === 'event-doctor')?.status).toBe('confirmed');
		expect(household.snapshot().outbox).toHaveLength(0);
	});

	it('saves a suggested message without changing the confirmed appointment', () => {
		const original = household.snapshot().commitments.find((item) => item.id === 'event-doctor')!;
		const result = household.createAppointmentRequestPlan('event-doctor', 'reschedule', 'Please offer another morning appointment.');
		const planId = result.data!.id;
		const approved = household.approvePlan(planId);
		const after = household.snapshot();
		const appointment = after.commitments.find((item) => item.id === 'event-doctor')!;
		expect(approved.success).toBe(true);
		expect(appointment.status).toBe('confirmed');
		expect(appointment.startAt).toBe(original.startAt);
		expect(after.outbox).toHaveLength(1);
		expect(after.outbox[0].status).toBe('saved_demo');
		expect(household.undo().success).toBe(false);
		expect(household.snapshot().outbox).toHaveLength(1);
	});

	it('rejects a stale plan without side effects', () => {
		const result = household.createAppointmentRequestPlan('event-doctor', 'cancel', 'Please cancel and confirm.');
		household.toggleGrocery('grocery-milk');
		const approved = household.approvePlan(result.data!.id);
		expect(approved.success).toBe(false);
		expect(household.snapshot().outbox).toHaveLength(0);
	});

	it('applies a cancellation only after external confirmation is explicitly verified', () => {
		const original = household.snapshot().commitments.find((item) => item.id === 'event-doctor')!;
		expect(household.applyConfirmedCancellation('event-doctor', 'Clinic confirmed by phone.').success).toBe(false);

		const draft = household.createAppointmentRequestPlan('event-doctor', 'cancel', 'Please cancel this appointment and confirm.');
		expect(household.approvePlan(draft.data!.id).success).toBe(true);
		const applied = household.applyConfirmedCancellation('event-doctor', 'Verified clinic email received.', true);
		const appointment = household.snapshot().commitments.find((item) => item.id === 'event-doctor')!;

		expect(applied.success).toBe(true);
		expect(appointment.status).toBe('cancelled');
		expect(appointment.startAt).toBe(original.startAt);
		expect(appointment.notes).toContain('Verified clinic email received.');
		expect(household.applyConfirmedCancellation('event-doctor', 'Repeated confirmation.').success).toBe(false);
	});

	it('imports only one minimal review item for a connected email', () => {
		const input = {
			provider: 'gmail' as const, sourceId: 'provider-123', from: 'clinic@example.test', subject: 'Please confirm your visit',
			receivedAt: new Date().toISOString(), category: 'confirmation' as const, summary: 'The clinic asks for confirmation.',
			requestedAction: 'Review and reply', confidence: 'high' as const
		};
		expect(household.ingestEmailAction(input).success).toBe(true);
		expect(household.ingestEmailAction(input).success).toBe(false);
		expect(household.snapshot().sources.filter((source) => source.id.includes('provider-123'))).toHaveLength(1);
	});

	it('imports normalized Gmail messages once and keeps them untrusted', () => {
		const message = {
			id: 'gmail-abc', provider: 'gmail' as const, from: 'Clinic <clinic@example.com>', to: 'owner@example.com',
			subject: 'Appointment moved', receivedAt: new Date().toISOString(), summary: 'Please review the new time.', untrusted: true as const
		};
		expect(household.importMailboxMessages([message]).affectedIds).toHaveLength(1);
		expect(household.importMailboxMessages([message]).affectedIds).toHaveLength(0);
		expect(household.snapshot().sources.find((source) => source.id === message.id)?.untrusted).toBe(true);
	});

	it('requires evidence of a Gmail draft before approving a Gmail plan', () => {
		const draft = household.createAppointmentRequestPlan('event-doctor', 'reschedule', 'Please offer another morning appointment.', undefined, 'gmail_draft');
		expect(household.approvePlan(draft.data!.id).success).toBe(false);
		expect(household.snapshot().outbox).toHaveLength(0);
		const approved = household.approvePlan(draft.data!.id, { mode: 'gmail_draft', providerId: 'draft-123' });
		expect(approved.success).toBe(true);
		expect(household.snapshot().outbox[0]).toMatchObject({ status: 'draft', providerId: 'draft-123' });
		expect(household.snapshot().commitments.find((item) => item.id === 'event-doctor')?.status).toBe('confirmed');
		expect(approved.summary).toContain('Nothing was sent');
	});

	it('accepts visit status only from the assigned carer and refreshes the care feed', () => {
		const observedAt = new Date().toISOString();
		expect(household.recordCareVisitUpdate('person-patel', 'event-carer', 'completed', observedAt).success).toBe(false);
		expect(household.recordCareVisitUpdate('person-elena', 'event-carer', 'completed', observedAt).success).toBe(true);
		expect(household.snapshot().dataFeeds.find((feed) => feed.id === 'care')).toMatchObject({ status: 'current', lastSuccessfulSyncAt: observedAt });
	});
});
