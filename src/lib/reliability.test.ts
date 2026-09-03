import { describe, expect, it } from 'vitest';
import { syncOverview } from './reliability';
import { createSeedData } from './seed';

describe('data freshness', () => {
	it('never reports current when the device is offline', () => {
		const data = createSeedData();
		expect(syncOverview(data, false)).toMatchObject({ status: 'offline' });
	});

	it('identifies stale and delayed feeds by name', () => {
		const data = createSeedData();
		data.dataFeeds[1].lastSuccessfulSyncAt = '2020-01-01T00:00:00.000Z';
		const overview = syncOverview(data, true);
		expect(overview.status).toBe('delayed');
		expect(overview.problemFeeds).toContain('Care visits');
	});
});
