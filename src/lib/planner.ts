import { addMinutes, atTime, dateKeyFromIso, minutesBetween } from './dates';
import type { AppData, Commitment, PlanningOption, RoutePlan } from './types';

export function baseCommitmentId(commitmentId: string): string {
	return commitmentId.split('::')[0];
}

function dayDistance(from: string, to: string): number {
	return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

function occurrenceForDate(item: Commitment, date: string): Commitment | undefined {
	const originalDate = dateKeyFromIso(item.startAt);
	if (originalDate === date) return item;
	if (!item.recurrence || date < originalDate || (item.recurrence.until && date > item.recurrence.until)) return undefined;
	const distance = dayDistance(originalDate, date);
	const unit = item.recurrence.frequency === 'daily' ? 1 : 7;
	if (distance < 0 || distance % (unit * Math.max(1, item.recurrence.interval)) !== 0) return undefined;
	const startTime = `${String(new Date(item.startAt).getHours()).padStart(2, '0')}:${String(new Date(item.startAt).getMinutes()).padStart(2, '0')}`;
	const startAt = atTime(date, startTime);
	return {
		...item,
		id: `${item.id}::${date}`,
		seriesId: item.seriesId ?? item.id,
		startAt,
		endAt: addMinutes(startAt, minutesBetween(item.startAt, item.endAt))
	};
}

export function commitmentsForDate(data: AppData, date: string): Commitment[] {
	return data.commitments
		.map((item) => occurrenceForDate(item, date))
		.filter((item): item is Commitment => Boolean(item && item.status !== 'cancelled'))
		.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function dayPacing(data: AppData, date: string): { level: 'calm' | 'steady' | 'busy'; reasons: string[] } {
	const items = commitmentsForDate(data, date);
	const timedMinutes = items.reduce((sum, item) => sum + minutesBetween(item.startAt, item.endAt), 0);
	const travelMinutes = items.reduce((sum, item) => sum + (item.travelMinutes ?? 0), 0);
	const closeGaps = items.slice(1).filter((item, index) => minutesBetween(items[index].endAt, item.startAt) < 30).length;
	const score = items.length + timedMinutes / 120 + travelMinutes / 30 + closeGaps;
	const level = score >= 8 ? 'busy' : score >= 4 ? 'steady' : 'calm';
	const reasons = [`${items.length} planned ${items.length === 1 ? 'item' : 'items'}`];
	if (travelMinutes) reasons.push(`${travelMinutes} minutes of travel`);
	if (closeGaps) reasons.push(`${closeGaps} short gap${closeGaps === 1 ? '' : 's'}`);
	if (!closeGaps && items.length > 1) reasons.push('comfortable gaps between plans');
	return { level, reasons };
}

export function findPlanningOptions(
	data: AppData,
	date: string,
	durationMinutes: number,
	count = 3
): PlanningOption[] {
	const existing = commitmentsForDate(data, date);
	const options: PlanningOption[] = [];
	for (let hour = data.preferences.dayStartHour; hour < data.preferences.dayEndHour; hour += 1) {
		for (const minute of [0, 30]) {
			const startAt = atTime(date, `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
			const endAt = addMinutes(startAt, durationMinutes);
			if (new Date(endAt).getHours() > data.preferences.dayEndHour) continue;
			const overlapping = existing.filter(
				(item) => new Date(startAt) < new Date(item.endAt) && new Date(endAt) > new Date(item.startAt)
			);
			if (overlapping.length) continue;
			const before = [...existing].reverse().find((item) => item.endAt <= startAt);
			const after = existing.find((item) => item.startAt >= endAt);
			const beforeGap = before ? minutesBetween(before.endAt, startAt) : 90;
			const afterGap = after ? minutesBetween(endAt, after.startAt) : 90;
			const buffer = data.preferences.defaultBufferMinutes;
			const minGap = Math.min(beforeGap, afterGap);
			const fit = minGap >= buffer * 2 ? 'comfortable' : minGap >= buffer ? 'possible' : 'rushed';
			const reasons = [
				before && after ? `Fits between ${before.title} and ${after.title}` : before ? `Open after ${before.title}` : after ? `Open before ${after.title}` : 'No other plans nearby',
				`${minGap} minute minimum breathing room`
			];
			options.push({ startAt, endAt, fit, reasons });
		}
	}
	return options
		.sort((a, b) => {
			const rank = { comfortable: 0, possible: 1, rushed: 2 };
			return rank[a.fit] - rank[b.fit] || a.startAt.localeCompare(b.startAt);
		})
		.slice(0, count);
}

export function routeForCommitment(data: AppData, commitmentId: string): RoutePlan | undefined {
	const occurrenceDate = commitmentId.split('::')[1];
	const base = data.commitments.find((item) => item.id === baseCommitmentId(commitmentId));
	const commitment = occurrenceDate && base ? occurrenceForDate(base, occurrenceDate) : base;
	if (!commitment?.locationId) return undefined;
	const place = data.places.find((item) => item.id === commitment.locationId);
	const home = data.places.find((item) => item.id === data.preferences.homePlaceId);
	if (!place || !home) return undefined;
	const durationMinutes = commitment.travelMinutes ?? 15;
	const middleLatitude = (home.latitude + place.latitude) / 2;
	const middleLongitude = (home.longitude + place.longitude) / 2;
	const path = [
		{ latitude: home.latitude, longitude: home.longitude },
		{ latitude: middleLatitude - 0.0007, longitude: home.longitude + (place.longitude - home.longitude) * 0.34 },
		{ latitude: middleLatitude + 0.0005, longitude: home.longitude + (place.longitude - home.longitude) * 0.72 },
		{ latitude: place.latitude, longitude: place.longitude }
	];
	return {
		commitmentId,
		mode: 'walk',
		leaveAt: addMinutes(commitment.startAt, -durationMinutes - 5),
		durationMinutes,
		destination: place.name,
		destinationAddress: place.address,
		timeZone: commitment.timeZone,
		origin: { latitude: home.latitude, longitude: home.longitude },
		destinationPoint: { latitude: place.latitude, longitude: place.longitude },
		path,
		steps: [
			{ instruction: 'Leave home and follow the highlighted walking route', minutes: 3 },
			{ instruction: `Continue towards ${place.shortAddress}`, minutes: Math.max(5, durationMinutes - 8) },
			{ instruction: `Arrive at ${place.shortAddress}`, minutes: 5 }
		]
	};
}

export function describeCommitment(data: AppData, item: Commitment): Record<string, unknown> {
	const place = data.places.find((candidate) => candidate.id === item.locationId);
	const people = item.participantIds.map((id) => data.people.find((person) => person.id === id)?.name).filter(Boolean);
	return {
		...item,
		date: dateKeyFromIso(item.startAt),
		place: place ? { name: place.name, address: place.address } : undefined,
		people
	};
}
