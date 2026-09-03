import { expect, test } from '@playwright/test';

declare global {
	interface Window {
		__registeredTools: Array<{ name: string; execute: (input: Record<string, unknown>) => Promise<unknown> }>;
	}
}

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		window.__registeredTools = [];
		Object.defineProperty(document, 'modelContext', {
			configurable: true,
			value: {
				registerTool: async (tool: { name: string; execute: (input: Record<string, unknown>) => Promise<unknown> }) => {
					window.__registeredTools.push(tool);
				}
			}
		});
		localStorage.clear();
	});
	await page.goto('/');
	await expect(page.locator('.app-shell')).toHaveAttribute('data-ready', 'true');
});

test('renders the touch-first dayboard and switches views', async ({ page }) => {
	await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
	await expect(page.getByText('Elena visits')).toBeVisible();
	await page.getByRole('button', { name: 'Food', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Food at home' })).toBeVisible();
	await expect(page.getByText('Milk', { exact: true })).toBeVisible();
});

test('imports Gmail previews and creates a draft only after visible approval', async ({ page }) => {
	let draftRequests = 0;
	await page.route('**/api/gmail/status', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ configured: true, connected: true, email: 'owner@example.com', capabilities: ['read_messages', 'create_drafts'] })
	}));
	await page.route('**/api/gmail/messages?*', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ messages: [{
			id: 'gmail-live-1', provider: 'gmail', from: 'Green Lane Clinic <clinic@example.com>', to: 'owner@example.com',
			subject: 'Please confirm your appointment', receivedAt: new Date().toISOString(),
			summary: 'Please confirm that the proposed appointment time is suitable.', untrusted: true
		}] })
	}));
	await page.route('**/api/gmail/drafts', async (route) => {
		draftRequests += 1;
		expect((await route.request().postDataJSON()).to).toBe('clinic@example.com');
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ created: true, draftId: 'draft-live-1' }) });
	});
	await page.reload();
	await expect(page.locator('.app-shell')).toHaveAttribute('data-ready', 'true');
	await page.getByRole('button', { name: /Attention$/ }).click();
	const checkGmail = page.getByRole('button', { name: 'Check Gmail' });
	await expect(checkGmail).toBeVisible();
	await checkGmail.click();
	const gmailItem = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Please confirm your appointment' }) });
	await expect(gmailItem).toBeVisible();
	await gmailItem.getByRole('button', { name: 'Prepare reply' }).click();
	const dialog = page.getByRole('dialog', { name: /Reply about Please confirm your appointment/ });
	await expect(dialog.getByRole('button', { name: 'Create Gmail draft' })).toBeVisible();
	expect(draftRequests).toBe(0);
	await dialog.getByRole('button', { name: 'Create Gmail draft' }).click();
	expect(draftRequests).toBe(1);
	await page.getByRole('button', { name: 'History', exact: true }).click();
	await expect(page.getByText('Gmail draft — not sent')).toBeVisible();
});

test('registers the WebMCP tool suite and tools update the same visible state', async ({ page }) => {
	await expect.poll(() => page.evaluate(() => window.__registeredTools.length)).toBe(32);
	await expect(page.getByRole('note', { name: /WebMCP: 32 site tools connected/i })).toBeVisible();
	const names = await page.evaluate(() => window.__registeredTools.map((tool) => tool.name));
	expect(names).toContain('get_day_brief');
	expect(names).toContain('create_appointment_request_plan');
	expect(names).toContain('approve_action_plan');
	expect(names).toContain('apply_confirmed_cancellation');
	expect(names).toContain('scan_mailbox_for_actions');
	expect(names).toContain('ingest_email_action');
	expect(names).toContain('get_support_overview');
	expect(names).toContain('suggest_support');
	expect(names).toContain('get_sync_status');
	expect(names).toContain('respond_to_reminder');
	expect(names).toContain('respond_to_help_request');
	expect(names).toContain('check_calendar_integrity');
	expect(names).toContain('record_care_visit_status');

	const tomorrow = await page.evaluate(() => {
		const date = new Date();
		date.setDate(date.getDate() + 1);
		const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
		const focus = window.__registeredTools.find((tool) => tool.name === 'focus_date')!;
		return focus.execute({ date: local }).then(() => local);
	});
	await expect(page.getByRole('heading', { name: new RegExp(new Date(`${tomorrow}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })) })).toBeVisible();
	await expect(page.getByRole('article', { name: /Appointment with Dr Patel/ })).toBeVisible();
});

test('shows a complete approval preview before saving a message in the test outbox', async ({ page }) => {
	await page.getByRole('button', { name: 'Next day' }).click();
	await page.getByRole('article', { name: /Appointment with Dr Patel/ }).getByRole('button').first().click();
	await page.getByRole('button', { name: 'Ask to move this' }).click();
	const dialog = page.getByRole('dialog', { name: /Ask to move/ });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('reception@greenlane.example', { exact: true })).toBeVisible();
	await expect(page.getByText(/appointment remains at its current time/i)).toBeVisible();
	if ((await page.viewportSize())?.width === 1024) await page.screenshot({ path: 'artifacts/audit-final-review-dialog.png' });
	await page.getByRole('button', { name: 'Save this demo message' }).click();
	await expect(page.getByText('change requested', { exact: true }).first()).toBeVisible();
});

test('keeps a stale request open and explains that nothing changed', async ({ page }) => {
	await page.getByRole('button', { name: 'Next day' }).click();
	await page.getByRole('article', { name: /Appointment with Dr Patel/ }).getByRole('button').first().click();
	await page.getByRole('button', { name: 'Ask to move this' }).click();
	await page.evaluate(async () => {
		const scan = window.__registeredTools.find((tool) => tool.name === 'scan_mailbox_for_actions')!;
		await scan.execute({});
	});
	await page.getByRole('button', { name: 'Save this demo message' }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.getByRole('alert')).toContainText(/nothing changed/i);
	await expect(page.getByRole('alert')).toContainText(/review a fresh plan/i);
});

test('reconciles a verified clinic cancellation and preserves a visible audit record', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const call = (name: string, input: Record<string, unknown>) => window.__registeredTools.find((tool) => tool.name === name)!.execute(input) as Promise<{ success: boolean; data?: { id: string } }>;
		const draft = await call('create_appointment_request_plan', {
			commitment_id: 'event-doctor', request: 'cancel', email_message: 'Please cancel this appointment and confirm.'
		});
		await call('approve_action_plan', { plan_id: draft.data!.id, user_confirmed: true });
		const refused = await call('apply_confirmed_cancellation', {
			commitment_id: 'event-doctor', confirmation_note: 'Clinic confirmation email received.', confirmation_verified: false
		});
		const applied = await call('apply_confirmed_cancellation', {
			commitment_id: 'event-doctor', confirmation_note: 'Clinic confirmation email received.', confirmation_verified: true
		});
		const stored = JSON.parse(localStorage.getItem('clearday.household.v1') ?? '{}');
		return { refused, applied, status: stored.commitments.find((item: { id: string }) => item.id === 'event-doctor')?.status };
	});

	expect(result.refused.success).toBe(false);
	expect(result.applied.success).toBe(true);
	expect(result.status).toBe('cancelled');
	await page.getByRole('button', { name: 'History', exact: true }).click();
	await expect(page.getByText('Confirmed cancellation applied', { exact: true })).toBeVisible();
	if ((await page.viewportSize())?.width === 1024) await page.screenshot({ path: 'artifacts/audit-final-cancellation-history.png' });
});

test('shows a truthful disconnected state when the host rejects part of registration', async ({ page }) => {
	await page.addInitScript(() => {
		window.__registeredTools = [];
		Object.defineProperty(document, 'modelContext', {
			configurable: true,
			value: {
				registerTool: async (tool: { name: string; execute: (input: Record<string, unknown>) => Promise<unknown> }, options?: { signal?: AbortSignal }) => {
					if (tool.name === 'get_attention_items') throw new Error('Host rejected the tool.');
					window.__registeredTools.push(tool);
					options?.signal?.addEventListener('abort', () => {
						window.__registeredTools = window.__registeredTools.filter((candidate) => candidate.name !== tool.name);
					}, { once: true });
				}
			}
		});
	});
	await page.reload();
	await expect(page.getByRole('note', { name: /WebMCP: connection failed/i })).toBeVisible();
	await expect(page.getByRole('note', { name: /WebMCP:/i })).toHaveAttribute('title', /failed after 2 of 32 tools/i);
	await expect.poll(() => page.evaluate(() => window.__registeredTools.length)).toBe(0);
	if ((await page.viewportSize())?.width === 1024) await page.screenshot({ path: 'artifacts/audit-final-webmcp-failure.png' });
});

test('lets a trusted relative offer help while Margaret keeps control', async ({ page }) => {
	await page.getByRole('button', { name: 'Support', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Supporting Margaret' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Today is on track' })).toBeVisible();
	await expect(page.getByText('Completed', { exact: true })).toBeVisible();
	await expect(page.getByText(/Message contents, medical notes and detailed care notes are not shown/i)).toBeVisible();

	const appointmentCard = page.getByText('Come to the appointment').locator('xpath=ancestor::article');
	await appointmentCard.getByRole('button', { name: 'Offer help' }).click();
	await expect(appointmentCard.getByRole('button', { name: 'Offer sent' })).toBeDisabled();
	await page.getByRole('button', { name: "Open Margaret's board" }).click();
	await page.getByRole('button', { name: /Attention/ }).click();
	await expect(page.getByRole('heading', { name: 'Sam offered to help' })).toBeVisible();
	await page.getByRole('button', { name: 'Accept help' }).click();
	await expect(page.getByRole('heading', { name: 'Sam offered to help' }).locator('..').locator('..')).toHaveClass(/resolved/);

	await page.getByRole('button', { name: 'Support', exact: true }).click();
	await expect(page.getByText(/Latest offer:/).locator('..')).toContainText('accepted');
	if ((await page.viewportSize())?.width === 1024) await page.screenshot({ path: 'artifacts/audit-final-family-support.png' });
});

test('shows truthful freshness and keeps the saved board usable offline', async ({ page, context }) => {
	await expect(page.getByRole('status')).toContainText(/Updated just now/i);
	await context.setOffline(true);
	await expect(page.getByRole('status')).toContainText(/Offline/i);
	await expect(page.getByText('Elena visits')).toBeVisible();
	await context.setOffline(false);
	await expect(page.getByRole('status')).toContainText(/Updated/i);
});

test('connects reminder acknowledgement to a supporter response', async ({ page }) => {
	const lunch = page.getByRole('article', { name: /Lunch/ });
	await lunch.getByRole('button').first().click();
	await expect(page.getByText('Lunch is ready in the fridge', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'I need help' }).click();
	await expect(page.getByText(/support circle can see that you asked/i)).toBeVisible();
	await page.getByRole('button', { name: 'Support', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Lunch is ready in the fridge' })).toBeVisible();
	await page.getByRole('button', { name: 'I can help' }).click();
	await expect(page.getByText(/You said you are helping/i)).toBeVisible();
	await page.getByRole('button', { name: "Open Margaret's board" }).click();
	await lunch.getByRole('button').first().click();
	await expect(page.getByText(/trusted supporter has said they are helping/i)).toBeVisible();
});

test('keeps support invitations and disclosure choices outside everyday navigation', async ({ page }) => {
	await page.getByRole('button', { name: 'Support', exact: true }).click();
	await page.getByRole('button', { name: 'Manage access' }).click();
	const dialog = page.getByRole('dialog', { name: 'Who can help' });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByLabel('What Sam can access').getByRole('button', { name: 'Number needing review' })).toHaveAttribute('aria-pressed', 'false');
	await dialog.getByLabel('Name').fill('Pat');
	await dialog.getByLabel('Relationship').fill('Neighbour');
	await dialog.getByLabel('Email').fill('pat@example.test');
	await dialog.getByLabel('Access ends').selectOption('7');
	await dialog.getByRole('button', { name: /Prepare invitation/ }).click();
	await expect(dialog.getByText('Pat', { exact: true })).toBeVisible();
	await expect(dialog.getByText(/Invitation waiting/)).toBeVisible();
	await dialog.getByRole('button', { name: 'Close support settings' }).click();
});

test('states the emergency boundary and offers direct human handoff', async ({ page }) => {
	await page.getByRole('button', { name: 'Help now' }).click();
	const dialog = page.getByRole('dialog', { name: 'Do you need help now?' });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText(/not an emergency monitoring service/i)).toBeVisible();
	await expect(dialog.getByRole('link', { name: /Call Sam/ })).toHaveAttribute('href', /^tel:/);
	await expect(dialog.getByRole('link', { name: /112/ })).toHaveAttribute('href', 'tel:112');
	await dialog.getByRole('button', { name: 'Close urgent help' }).click();
});

test('can quickly hide private wall-screen information', async ({ page }) => {
	await page.getByRole('button', { name: 'Hide private details' }).click();
	const cover = page.getByRole('dialog', { name: /details are hidden/ });
	await expect(cover).toBeVisible();
	await expect(page.getByText('Appointment with Dr Patel')).not.toBeVisible();
	await cover.getByRole('button', { name: /Show Margaret's board/ }).click();
	await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
});
