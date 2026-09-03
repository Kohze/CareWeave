import { describe, expect, it } from 'vitest';
import { addDays, dateKeyFromIso, localDateKey } from './dates';
import { commitmentsForDate, dayPacing, findPlanningOptions, routeForCommitment } from './planner';
import { createSeedData } from './seed';

describe('calm planning engine', () => {
	it('groups commitments by the household local date', () => {
		const data = createSeedData();
		expect(commitmentsForDate(data, localDateKey()).map((item) => item.id)).toEqual([
			'event-carer',
			'event-lunch',
			'event-walk'
		]);
	});

	it('seeds a varied but calm seven-day demonstration story', () => {
		const data = createSeedData();
		const today = localDateKey();
		expect(commitmentsForDate(data, addDays(today, 1)).map((item) => item.id)).toEqual(['event-doctor']);
		expect(commitmentsForDate(data, addDays(today, 2)).map((item) => item.id)).toEqual(['event-shopping']);
		expect(commitmentsForDate(data, addDays(today, 3))).toEqual([]);
		expect(commitmentsForDate(data, addDays(today, 4)).map((item) => item.id)).toEqual(['event-physio']);
		expect(commitmentsForDate(data, addDays(today, 5)).map((item) => item.id)).toEqual(['event-community']);
		expect(commitmentsForDate(data, addDays(today, 6)).map((item) => item.id)).toEqual(['event-pharmacy']);
	});

	it('never suggests an overlapping slot', () => {
		const data = createSeedData();
		const date = localDateKey();
		const options = findPlanningOptions(data, date, 60, 6);
		for (const option of options) {
			const overlaps = commitmentsForDate(data, date).some(
				(item) => new Date(option.startAt) < new Date(item.endAt) && new Date(option.endAt) > new Date(item.startAt)
			);
			expect(overlaps).toBe(false);
			expect(option.reasons.length).toBeGreaterThan(0);
		}
	});

	it('expands a recurring series as dated occurrences without duplicating the source record', () => {
		const data = createSeedData();
		const date = addDays(localDateKey(), 7);
		const occurrence = commitmentsForDate(data, date).find((item) => item.seriesId === 'series-elena-weekly');
		expect(occurrence?.id).toBe(`event-carer::${date}`);
		expect(dateKeyFromIso(occurrence!.startAt)).toBe(date);
		expect(data.commitments.filter((item) => item.seriesId === 'series-elena-weekly')).toHaveLength(1);
	});

	it('explains pacing and provides an early route arrival', () => {
		const data = createSeedData();
		const doctorDate = addDays(localDateKey(), 1);
		expect(dayPacing(data, doctorDate).reasons).toContain('18 minutes of travel');
		const route = routeForCommitment(data, 'event-doctor');
		expect(route).toBeDefined();
		expect(route!.path).toHaveLength(4);
		expect(route!.origin).toEqual({ latitude: 51.50755, longitude: -0.1372 });
		expect(route!.destinationPoint).toEqual({ latitude: 51.51415, longitude: -0.1255 });
		expect(dateKeyFromIso(route!.leaveAt)).toBe(doctorDate);
		expect(new Date(data.commitments.find((item) => item.id === 'event-doctor')!.startAt).getTime() - new Date(route!.leaveAt).getTime()).toBe(23 * 60_000);
	});
});
