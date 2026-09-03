import { describe, expect, it } from 'vitest';
import { extractAttention } from './mail';
import type { SourceMessage } from './types';

const base: SourceMessage = {
	id: 'mail-test', provider: 'demo_mailbox', from: 'sender@example.test', to: 'person@example.test',
	subject: 'Message', receivedAt: new Date().toISOString(), summary: 'Information', untrusted: true
};

describe('untrusted mailbox extraction', () => {
	it('recognizes scheduling and food candidates without executing anything', () => {
		expect(extractAttention({ ...base, subject: 'Carer will arrive later' }).category).toBe('schedule_change');
		expect(extractAttention({ ...base, subject: 'Milk substitution' }).category).toBe('food_need');
	});
});
