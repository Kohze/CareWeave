import type { AppData, DataFeed } from './types';

export interface SyncOverview {
	status: 'current' | 'delayed' | 'offline';
	label: string;
	detail: string;
	lastSuccessfulSyncAt?: string;
	problemFeeds: string[];
}

function ageMinutes(iso: string, now: Date): number {
	return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000));
}

function freshnessLabel(iso: string | undefined, now: Date): string {
	if (!iso) return 'No successful update yet';
	const minutes = ageMinutes(iso, now);
	if (minutes < 2) return 'Updated just now';
	if (minutes < 60) return `Updated ${minutes} minutes ago`;
	const hours = Math.floor(minutes / 60);
	return `Updated ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
}

export function feedIsStale(feed: DataFeed, now = new Date()): boolean {
	return ageMinutes(feed.lastSuccessfulSyncAt, now) > feed.staleAfterMinutes;
}

export function syncOverview(data: AppData, online = true, now = new Date()): SyncOverview {
	if (!data.dataFeeds.length) {
		return { status: 'delayed', label: 'Update status unavailable', detail: 'ClearDay cannot verify when connected information last refreshed.', problemFeeds: [] };
	}
	const oldestSync = [...data.dataFeeds]
		.sort((a, b) => a.lastSuccessfulSyncAt.localeCompare(b.lastSuccessfulSyncAt))[0]?.lastSuccessfulSyncAt;
	const offlineFeeds = data.dataFeeds.filter((feed) => feed.status === 'offline');
	const delayedFeeds = data.dataFeeds.filter((feed) => feed.status === 'delayed' || feedIsStale(feed, now));

	if (!online || offlineFeeds.length) {
		const problems = !online ? data.dataFeeds.map((feed) => feed.label) : offlineFeeds.map((feed) => feed.label);
		return {
			status: 'offline',
			label: `Offline - ${freshnessLabel(oldestSync, now).toLowerCase()}`,
			detail: 'Showing the latest saved information. Connected updates will retry automatically.',
			lastSuccessfulSyncAt: oldestSync,
			problemFeeds: problems
		};
	}

	if (delayedFeeds.length) {
		return {
			status: 'delayed',
			label: 'Some information could not refresh',
			detail: `${delayedFeeds.map((feed) => feed.label).join(', ')} ${delayedFeeds.length === 1 ? 'is' : 'are'} delayed. Other information is still available.`,
			lastSuccessfulSyncAt: oldestSync,
			problemFeeds: delayedFeeds.map((feed) => feed.label)
		};
	}

	return {
		status: 'current',
		label: freshnessLabel(oldestSync, now),
		detail: 'Calendar, care visits and messages are current.',
		lastSuccessfulSyncAt: oldestSync,
		problemFeeds: []
	};
}
