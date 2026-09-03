import type { AppData, Commitment } from './types';

export interface CalendarIntegrityIssue {
	type: 'duplicate' | 'conflict' | 'source_version';
	commitmentIds: string[];
	summary: string;
	requiresReview: true;
}

function normalizedTitle(item: Commitment): string {
	return item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function checkCalendarIntegrity(data: AppData): CalendarIntegrityIssue[] {
	const active = data.commitments.filter((item) => item.status !== 'cancelled');
	const issues: CalendarIntegrityIssue[] = [];
	for (let leftIndex = 0; leftIndex < active.length; leftIndex += 1) {
		const left = active[leftIndex];
		if (left.sourceEventId && !left.sourceVersion) {
			issues.push({ type: 'source_version', commitmentIds: [left.id], summary: `${left.title} has a provider ID but no source version.`, requiresReview: true });
		}
		for (let rightIndex = leftIndex + 1; rightIndex < active.length; rightIndex += 1) {
			const right = active[rightIndex];
			const sameProviderEvent = Boolean(left.sourceEventId && right.sourceEventId && left.sourceEventId === right.sourceEventId);
			const startsClose = Math.abs(new Date(left.startAt).getTime() - new Date(right.startAt).getTime()) <= 5 * 60_000;
			if (sameProviderEvent || (startsClose && normalizedTitle(left) === normalizedTitle(right))) {
				issues.push({ type: 'duplicate', commitmentIds: [left.id, right.id], summary: `${left.title} may appear twice. Keep both until a person reviews the sources.`, requiresReview: true });
				continue;
			}
			const overlaps = new Date(left.startAt) < new Date(right.endAt) && new Date(right.startAt) < new Date(left.endAt);
			if (overlaps) {
				issues.push({ type: 'conflict', commitmentIds: [left.id, right.id], summary: `${left.title} overlaps ${right.title}.`, requiresReview: true });
			}
		}
	}
	return issues;
}
