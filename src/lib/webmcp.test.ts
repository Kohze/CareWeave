import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { household } from './app';
import { careWeaveTools, executeCareWeaveTool, realtimeToolDefinitions, registerCareWeaveTools, toolInventory, webMcpStatus } from './webmcp';

describe('shared WebMCP and voice tools', () => {
	beforeEach(() => household.reset());
	afterEach(() => vi.unstubAllGlobals());

	it('keeps the full WebMCP inventory and exposes a voice-safe subset', () => {
		const webMcpNames = toolInventory().map((tool) => tool.name);
		const voiceNames = realtimeToolDefinitions().map((tool) => tool.name);

		expect(webMcpNames).toHaveLength(32);
		expect(voiceNames).toHaveLength(23);
		expect(voiceNames).toContain('get_day_brief');
		expect(voiceNames).toContain('get_sync_status');
		expect(voiceNames).toContain('get_reminders');
		expect(voiceNames).toContain('respond_to_reminder');
		expect(voiceNames).toContain('get_support_circle');
		expect(voiceNames).toContain('check_calendar_integrity');
		expect(voiceNames).toContain('get_support_overview');
		expect(voiceNames).toContain('create_appointment_request_plan');
		expect(voiceNames).not.toContain('suggest_support');
		expect(voiceNames).not.toContain('respond_to_help_request');
		expect(voiceNames).not.toContain('update_support_offer_fulfillment');
		expect(voiceNames).not.toContain('record_care_visit_status');
		expect(voiceNames).not.toContain('approve_action_plan');
		expect(voiceNames).not.toContain('apply_confirmed_change');
		expect(voiceNames).not.toContain('apply_confirmed_cancellation');
		expect(voiceNames).not.toContain('reset_demo');
	});

	it('marks meaningful decisions and reconciliations as consequential', () => {
		const consequentialNames = careWeaveTools()
			.filter((tool) => tool.annotations?.consequentialHint === true)
			.map((tool) => tool.name);

		expect(consequentialNames).toEqual([
			'respond_to_reminder',
			'respond_to_help_request',
			'record_care_visit_status',
			'update_support_offer_fulfillment',
			'approve_action_plan',
			'apply_confirmed_change',
			'apply_confirmed_cancellation',
			'undo_last_change',
			'reset_demo'
		]);
	});

	it('refuses a final approval even if a voice model invents the tool call', async () => {
		const result = await executeCareWeaveTool('approve_action_plan', { plan_id: 'anything', user_confirmed: true });
		expect(result).toMatchObject({ success: false });
		expect(JSON.stringify(result)).toMatch(/deliberate tap/i);
	});

	it('rejects malformed input inside the handler even when a host skips schema validation', async () => {
		const plansBefore = household.snapshot().plans.length;
		const appointmentTool = careWeaveTools().find((tool) => tool.name === 'create_appointment_request_plan')!;
		const invalidRequest = await appointmentTool.execute({
			commitment_id: 'event-doctor', request: 'delete', email_message: 'Please remove this appointment.'
		});
		const invalidDate = await careWeaveTools().find((tool) => tool.name === 'focus_date')!.execute({ date: '2026-02-31' });
		const invalidDateTime = await careWeaveTools().find((tool) => tool.name === 'apply_confirmed_change')!.execute({
			commitment_id: 'event-doctor', start_at: '2026-09-03T09:00:00', end_at: '2026-09-03T09:30:00',
			confirmation_note: 'Clinic email received.', confirmation_verified: true
		});
		const unexpectedField = await careWeaveTools().find((tool) => tool.name === 'get_food_status')!.execute({ ignored: true });

		expect(invalidRequest).toMatchObject({ success: false });
		expect(invalidDate).toMatchObject({ success: false });
		expect(invalidDateTime).toMatchObject({ success: false });
		expect(unexpectedField).toMatchObject({ success: false });
		expect(household.snapshot().plans).toHaveLength(plansBefore);
	});

	it('withdraws attempted registrations and reports zero connected tools if one registration fails', async () => {
		const active = new Set<string>();
		vi.stubGlobal('window', {});
		vi.stubGlobal('document', {
			modelContext: {
				registerTool: async (tool: { name: string }, options?: { signal?: AbortSignal }) => {
					if (tool.name === 'get_attention_items') throw new Error('Host rejected the tool.');
					active.add(tool.name);
					options?.signal?.addEventListener('abort', () => active.delete(tool.name), { once: true });
				}
			}
		});

		await expect(registerCareWeaveTools()).rejects.toThrow('Host rejected the tool.');
		expect(active.size).toBe(0);
		expect(get(webMcpStatus)).toMatchObject({ state: 'error', supported: false, registered: 0 });
		expect(get(webMcpStatus).message).toMatch(/failed after 2 of 32/i);
	});

	it('keeps support tools role-scoped and privacy-limited', async () => {
		const tools = careWeaveTools();
		const date = new Date();
		const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
		const overview = await tools.find((tool) => tool.name === 'get_support_overview')!.execute({
			supporter_person_id: 'person-sam', date: localDate
		});
		const denied = await tools.find((tool) => tool.name === 'suggest_support')!.execute({
			supporter_person_id: 'person-patel', category: 'check_in', message: 'I can call later.'
		});

		expect(overview).toMatchObject({ success: true });
		expect(JSON.stringify(overview)).not.toContain('blood pressure');
		expect(JSON.stringify(overview)).not.toContain('medication box was checked');
		expect(denied).toMatchObject({ success: false });
	});

	it('exposes freshness and the complete reminder-to-support loop', async () => {
		const tools = careWeaveTools();
		const sync = await tools.find((tool) => tool.name === 'get_sync_status')!.execute({});
		const reminder = await tools.find((tool) => tool.name === 'respond_to_reminder')!.execute({ reminder_id: 'reminder-lunch', response: 'need_help' });
		const accepted = await tools.find((tool) => tool.name === 'respond_to_help_request')!.execute({ supporter_person_id: 'person-sam', reminder_id: 'reminder-lunch', response: 'acknowledged' });

		expect(sync).toMatchObject({ success: true, data: { status: 'current' } });
		expect(reminder).toMatchObject({ success: true });
		expect(accepted).toMatchObject({ success: true });
		expect(household.snapshot().reminders.find((item) => item.id === 'reminder-lunch')?.status).toBe('help_acknowledged');
	});
});
