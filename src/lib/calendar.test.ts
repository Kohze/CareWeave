import { describe, expect, it } from 'vitest';
import { checkCalendarIntegrity } from './calendar';
import { createSeedData } from './seed';

describe('calendar integrity', () => {
	it('keeps possible cross-source duplicates for human review', () => {
		const data = createSeedData();
		const doctor = data.commitments.find((item) => item.id === 'event-doctor')!;
		data.commitments.push({ ...structuredClone(doctor), id: 'event-doctor-email-copy', sourceEventId: 'another-provider-id' });
		const duplicate = checkCalendarIntegrity(data).find((issue) => issue.type === 'duplicate');
		expect(duplicate?.commitmentIds).toEqual(['event-doctor', 'event-doctor-email-copy']);
		expect(duplicate?.requiresReview).toBe(true);
	});

	it('does not report issues for the seeded calendar', () => {
		expect(checkCalendarIntegrity(createSeedData())).toEqual([]);
	});
});
