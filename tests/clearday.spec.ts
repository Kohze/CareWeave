import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

declare global {
	interface Window {
		__registeredTools: Array<{ name: string; annotations?: Record<string, boolean>; execute: (input: Record<string, unknown>) => Promise<unknown> }>;
	}
}

async function waitForViewToSettle(page: Page, selector: string): Promise<void> {
	await expect.poll(() => page.evaluate((targetSelector) => {
		const strip = document.querySelector<HTMLElement>('.column-strip')!;
		const target = document.querySelector<HTMLElement>(targetSelector)!;
		const inset = Number.parseFloat(getComputedStyle(strip).scrollPaddingInlineStart) || 20;
		return Math.abs(strip.scrollLeft - Math.max(0, target.offsetLeft - inset));
	}, selector)).toBeLessThan(2);
}

test.beforeEach(async ({ page }) => {
	await page.route('**/api/weather**', async (route) => {
		const today = new Date().toISOString().slice(0, 10);
		const days = Array.from({ length: 7 }, (_, index) => new Date(`${today}T12:00:00Z`).getTime() + index * 86_400_000).map((time) => new Date(time).toISOString().slice(0, 10));
		const hours = days.flatMap((date) => Array.from({ length: 24 }, (_, hour) => `${date}T${String(hour).padStart(2, '0')}:00`));
		const dailyCodes = [61, 2, 3, 0, 80, 1, 51];
		await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
			current: { time: `${today}T14:00`, temperature_2m: 14, precipitation: .7, weather_code: 61, cloud_cover: 91, wind_speed_10m: 18 },
			daily: { time: days, weather_code: dailyCodes, temperature_2m_max: [16, 18, 17, 20, 15, 19, 17], temperature_2m_min: [9, 10, 11, 12, 8, 10, 9], precipitation_probability_max: [78, 24, 18, 5, 62, 12, 48] },
			hourly: {
				time: hours,
				weather_code: hours.map((_, index) => dailyCodes[Math.floor(index / 24)]),
				temperature_2m: hours.map((_, index) => 10 + Math.floor(index / 24) + (index % 24) / 10),
				apparent_temperature: hours.map((_, index) => 9 + Math.floor(index / 24) + (index % 24) / 10),
				precipitation_probability: hours.map((_, index) => [78, 24, 18, 5, 62, 12, 48][Math.floor(index / 24)]),
				wind_speed_10m: hours.map((_, index) => 8 + (index % 24) / 2)
			}
		}) });
	});
	await page.addInitScript(() => {
		window.__registeredTools = [];
		Object.defineProperty(document, 'modelContext', {
			configurable: true,
			value: {
				registerTool: async (tool: { name: string; annotations?: Record<string, boolean>; execute: (input: Record<string, unknown>) => Promise<unknown> }) => {
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
	await expect(page.locator('.today-column .timeline').getByText('Elena visits', { exact: true })).toBeVisible();
	await expect(page.locator('.today-column .freshness-strip')).toHaveCount(0);
	await expect(page.getByText(/saved local forecast|live local forecast|forecast preview/i)).toHaveCount(0);
	await expect(page.getByText("Next in today's plan", { exact: true })).toHaveCount(0);
	const selected = page.locator('.timeline .event-card.selected');
	if (await selected.count()) {
		expect(new Date((await selected.getAttribute('data-start-at'))!).getTime()).toBeGreaterThanOrEqual(Date.now() - 2_000);
		await expect(page.locator('.right-rail .detail-panel')).toBeVisible();
	} else {
		await expect(page.locator('.right-rail').getByRole('heading', { name: 'Today is finished' })).toBeVisible();
	}
	await page.getByRole('button', { name: 'Food', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Food at home' })).toBeVisible();
	await expect(page.getByText('Milk', { exact: true })).toBeVisible();
});

test('uses distinct professional icons for care people and urgent help', async ({ page }) => {
	const elena = page.getByRole('article', { name: /Elena visits/ });
	await expect(elena.locator('svg.lucide-hand-heart')).toBeVisible();
	await elena.getByRole('button').first().click();
	await expect(page.locator('.detail-panel dt').filter({ hasText: 'Who' }).locator('svg.lucide-users-round')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Help now' }).locator('svg.lucide-circle-question-mark')).toBeVisible();
	await page.getByRole('button', { name: 'Help now' }).click();
	await expect(page.getByRole('dialog', { name: 'Do you need help now?' }).locator('svg.lucide-siren')).toBeVisible();
});

test('opens the sole event details when changing the displayed day', async ({ page }) => {
	const initialScroll = await page.locator('.column-strip').evaluate((strip) => strip.scrollLeft);
	await page.getByRole('button', { name: 'Next day' }).click();
	const onlyEvent = page.locator('.timeline .event-card');
	await expect(onlyEvent).toHaveCount(1);
	const eventTitle = (await onlyEvent.locator('.event-copy strong').textContent())?.trim();
	expect(eventTitle).toBeTruthy();
	await expect(page.locator('.detail-panel').getByRole('heading', { name: eventTitle! })).toBeVisible();
	await expect(page.locator('.detail-panel').getByRole('heading', { name: 'What this is about' })).toBeVisible();
	await expect.poll(() => page.locator('.column-strip').evaluate((strip, start) => Math.abs(strip.scrollLeft - start), initialScroll)).toBeLessThan(2);
});

test('updates the Day forecast to match the selected date', async ({ page }) => {
	const forecast = page.locator('.today-forecast-summary');
	await expect(forecast).toContainText('Rain expected');
	await expect(forecast).toContainText('14°');

	await page.getByRole('button', { name: 'Next day' }).click();
	await expect(forecast).toContainText('Partly cloudy');
	await expect(forecast).toContainText('High 18° · Low 10°');
	await expect(forecast).toContainText('24% rain');
	await expect(forecast).not.toContainText('14°');

	await page.getByRole('button', { name: 'Next day' }).click();
	await expect(forecast).toContainText('Overcast');
	await expect(forecast).toContainText('High 17° · Low 11°');
	await expect(forecast).toContainText('18% rain');
});

test('opens a full hourly forecast for the selected day', async ({ page }) => {
	await page.getByRole('button', { name: 'Next day' }).click();
	await page.getByRole('button', { name: /Open hourly forecast/ }).click();
	const forecastPage = page.getByRole('dialog', { name: 'Hourly forecast' });
	await expect(forecastPage).toBeVisible();
	await expect(forecastPage.getByText('Partly cloudy').first()).toBeVisible();
	await expect(forecastPage.locator('.hour-cards article')).toHaveCount(24);
	await expect(forecastPage.locator('.hour-cards article').first()).toContainText('00:00');
	await expect(forecastPage.locator('.hour-cards article').first()).toContainText('11°');
	await forecastPage.getByRole('button', { name: 'Close hourly forecast' }).click();
	await expect(forecastPage).not.toBeVisible();
});

test('does not draw a timeline rail through an empty day', async ({ page }) => {
	for (let day = 0; day < 3; day += 1) await page.getByRole('button', { name: 'Next day' }).click();
	await expect(page.locator('.timeline')).toHaveClass(/empty/);
	expect(await page.locator('.timeline').evaluate((timeline) => getComputedStyle(timeline, '::before').display)).toBe('none');
});

test('lets horizontal gestures inside a card continue through the column ribbon', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name === 'mobile', 'Mouse-wheel horizontal gestures are covered at both iPad viewports; mobile uses touch swiping.');
	const card = page.locator('.timeline-section');
	const box = await card.boundingBox();
	expect(box).not.toBeNull();
	await page.mouse.move(box!.x + box!.width / 2, box!.y + 120);
	await page.mouse.wheel(420, 0);
	await expect.poll(() => page.locator('.column-strip').evaluate((strip) => strip.scrollLeft)).toBeGreaterThan(40);
	await expect(page.locator('.column-strip')).toHaveClass(/is-scrolling/);
	await expect(page.locator('.column-strip')).not.toHaveClass(/is-scrolling/, { timeout: 2_000 });
});

test('changes event details without horizontally scrolling the board', async ({ page }) => {
	const strip = page.locator('.column-strip');
	const initialScroll = await strip.evaluate((element) => element.scrollLeft);
	await page.getByRole('article', { name: /Lunch/ }).getByRole('button').first().click();
	await expect(page.locator('.right-rail .detail-panel').getByRole('heading', { name: 'Lunch' })).toBeVisible();
	await expect(page.getByRole('article', { name: /Lunch/ })).toHaveClass(/selected/);
	await expect.poll(() => strip.evaluate((element, start) => Math.abs(element.scrollLeft - start), initialScroll)).toBeLessThan(2);
});

test('aligns the overview and schedule grids on the same center line', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name === 'mobile', 'The mobile layout intentionally collapses both areas to one column.');
	const geometry = await page.evaluate(() => {
		const overviewCards = Array.from(document.querySelectorAll<HTMLElement>('.today-column .glance-grid > *'));
		const timeline = document.querySelector<HTMLElement>('.today-column .timeline-section')!;
		const details = document.querySelector<HTMLElement>('.today-column .right-rail')!;
		const first = overviewCards[0].getBoundingClientRect();
		const second = overviewCards[1].getBoundingClientRect();
		const timelineRect = timeline.getBoundingClientRect();
		const detailsRect = details.getBoundingClientRect();
		return {
			leftEdges: Math.abs(first.left - timelineRect.left),
			centerEdges: Math.abs(second.left - detailsRect.left),
			rightEdges: Math.abs(second.right - detailsRect.right),
			firstWidths: Math.abs(first.width - timelineRect.width),
			secondWidths: Math.abs(second.width - detailsRect.width),
			gapDifference: Math.abs((second.left - first.right) - (detailsRect.left - timelineRect.right))
		};
	});
	for (const difference of Object.values(geometry)) expect(difference).toBeLessThan(1);
});

test('presents the sample inbox as ready without integration warnings', async ({ page }) => {
	await page.getByRole('button', { name: /Attention$/ }).click();
	await expect(page.getByRole('button', { name: 'Check sample messages' })).toBeVisible();
	await expect(page.getByText(/Gmail status is unavailable|Gmail is not connected yet|could not refresh/i)).toHaveCount(0);
});

test('selects a day without shifting the fixed next-seven-day list', async ({ page }) => {
	const waitForWeekToSettle = () => expect.poll(() => page.evaluate(() => {
		const strip = document.querySelector<HTMLElement>('.column-strip')!;
		const week = document.querySelector<HTMLElement>('.week-column')!;
		const inset = Number.parseFloat(getComputedStyle(strip).scrollPaddingInlineStart) || 20;
		return Math.abs(strip.scrollLeft - Math.max(0, week.offsetLeft - inset));
	})).toBeLessThan(2);

	await page.getByRole('button', { name: '7 days', exact: true }).click();
	await waitForWeekToSettle();
	const weekDays = page.locator('.week-grid > button');
	const datesBefore = await weekDays.evaluateAll((buttons) => buttons.map((button) => (button as HTMLElement).dataset.date));
	const chosenDate = datesBefore[2]!;
	await weekDays.nth(2).click();

	await expect(weekDays.nth(2)).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('.today-column .date-switcher strong')).toHaveText(String(new Date(`${chosenDate}T12:00:00`).getDate()));
	await expect(page.locator('.detail-panel')).toBeVisible();
	expect(await weekDays.evaluateAll((buttons) => buttons.map((button) => (button as HTMLElement).dataset.date))).toEqual(datesBefore);

	await page.getByRole('button', { name: '7 days', exact: true }).click();
	await waitForWeekToSettle();
	await weekDays.first().click();
	await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
	expect(await weekDays.evaluateAll((buttons) => buttons.map((button) => (button as HTMLElement).dataset.date))).toEqual(datesBefore);
});

test('keeps manual sideways scrolling free of navigation feedback', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const strip = document.querySelector<HTMLElement>('.column-strip')!;
		const target = document.querySelector<HTMLElement>('.attention-column')!;
		const originalScrollTo = strip.scrollTo.bind(strip);
		let programmaticCalls = 0;
		strip.scrollTo = ((...args: Parameters<HTMLElement['scrollTo']>) => {
			programmaticCalls += 1;
			originalScrollTo(...args);
		}) as HTMLElement['scrollTo'];
		strip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		const inset = Number.parseFloat(getComputedStyle(strip).scrollPaddingInlineStart) || 20;
		strip.scrollLeft = target.offsetLeft - inset;
		strip.dispatchEvent(new Event('scroll'));
		await new Promise((resolve) => window.setTimeout(resolve, 420));
		return {
			programmaticCalls,
			attentionActive: document.querySelector('.sidebar button.active')?.textContent?.includes('Attention') ?? false
		};
	});
	expect(result.programmaticCalls).toBe(0);
	expect(result.attentionActive).toBe(true);
});

test('glides to a selected column and settles precisely', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'Animation timing is measured once at the primary viewport.');
	const geometry = await page.evaluate(() => {
		const strip = document.querySelector<HTMLElement>('.column-strip')!;
		const food = document.querySelector<HTMLElement>('.food-column')!;
		const inset = Number.parseFloat(getComputedStyle(strip).scrollPaddingInlineStart) || 20;
		return { start: strip.scrollLeft, target: Math.max(0, food.offsetLeft - inset) };
	});
	await page.getByRole('button', { name: 'Food', exact: true }).click();
	await page.waitForTimeout(90);
	const during = await page.locator('.column-strip').evaluate((strip) => strip.scrollLeft);
	expect(during).toBeGreaterThan(geometry.start);
	expect(during).toBeLessThan(geometry.target);
	await expect.poll(() => page.locator('.column-strip').evaluate((strip, target) => Math.abs(strip.scrollLeft - target), geometry.target)).toBeLessThan(2);
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
	await waitForViewToSettle(page, '.attention-column');
	const checkGmail = page.getByRole('button', { name: 'Check Gmail' });
	await expect(checkGmail).toBeVisible();
	await checkGmail.click();
	const gmailItem = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Please confirm your appointment' }) });
	await expect(gmailItem).toBeVisible();
	await gmailItem.getByRole('button', { name: 'Prepare reply' }).click();
	const composer = page.getByRole('dialog', { name: /Reply to Please confirm your appointment/ });
	await composer.getByLabel('Your reply').fill('Hello, the proposed appointment time is suitable. Thank you.');
	await composer.getByRole('button', { name: 'Review reply' }).click();
	const dialog = page.getByRole('dialog', { name: /Reply about Please confirm your appointment/ });
	await expect(dialog.getByRole('button', { name: 'Create Gmail draft' })).toBeVisible();
	expect(draftRequests).toBe(0);
	await dialog.getByRole('button', { name: 'Create Gmail draft' }).click();
	expect(draftRequests).toBe(1);
	await page.getByRole('button', { name: 'History', exact: true }).click();
	await expect(page.getByText('Gmail draft — not sent')).toBeVisible();
});

test('shows every WebMCP tool from the assistant status button', async ({ page }) => {
	const statusButton = page.getByRole('button', { name: /Show WebMCP tools/ });
	await statusButton.click();
	const catalogue = page.getByRole('dialog', { name: 'CareWeave’s WebMCP tools' });
	await expect(catalogue).toBeVisible();
	await expect(catalogue.getByRole('heading', { name: 'Understand' })).toBeVisible();
	await expect(catalogue.getByRole('heading', { name: 'Show together' })).toBeVisible();
	await expect(catalogue.getByRole('heading', { name: 'Prepare safely' })).toBeVisible();
	await expect(catalogue.getByRole('heading', { name: 'Update with consent' })).toBeVisible();
	await expect(catalogue.locator('.tool-list details')).toHaveCount(32);
	await catalogue.getByText('get_day_brief', { exact: true }).click();
	await expect(catalogue.getByText(/Read a concise, calm household brief/)).toBeVisible();
	const approvalTool = catalogue.locator('details').filter({ hasText: 'approve_action_plan' });
	await approvalTool.getByText('approve_action_plan', { exact: true }).click();
	await expect(approvalTool.getByText('Consequential action', { exact: true })).toBeVisible();
	if ((await page.viewportSize())?.width === 1024) await page.screenshot({ path: 'artifacts/audit-final-webmcp-tools.png' });
	await catalogue.getByRole('button', { name: 'Close WebMCP tools' }).click();
	await expect(statusButton).toBeFocused();
});

test('turns dictated words into a reviewable reply without sending', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'The browser dictation bridge is exercised once.');
	await page.evaluate(() => {
		class TestSpeechRecognition {
			continuous = false;
			interimResults = false;
			lang = '';
			onstart: (() => void) | null = null;
			onend: (() => void) | null = null;
			onerror: ((event: { error: string }) => void) | null = null;
			onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null = null;
			start() {
				this.onstart?.();
				this.onresult?.({ results: [{ 0: { transcript: 'Hello, the smaller bottle is fine. Thank you.' }, isFinal: true }] });
				this.onend?.();
			}
			stop() { this.onend?.(); }
			abort() { this.onend?.(); }
		}
		Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: TestSpeechRecognition });
		Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: TestSpeechRecognition });
	});
	await page.getByRole('button', { name: /Attention$/ }).click();
	await waitForViewToSettle(page, '.attention-column');
	const milkItem = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Choose a milk substitute' }) });
	const prepareReply = milkItem.getByRole('button', { name: 'Prepare reply' });
	await prepareReply.scrollIntoViewIfNeeded();
	await expect(prepareReply).toBeInViewport();
	await prepareReply.click();
	const composer = page.getByRole('dialog', { name: /Reply to Choose a milk substitute/ });
	await expect(composer).toBeVisible();
	const composerAlignment = await composer.evaluate((dialog) => {
		const dictate = dialog.querySelector<HTMLElement>('.dictate-button')!.getBoundingClientRect();
		const privacy = dialog.querySelector<HTMLElement>('.privacy-note')!.getBoundingClientRect();
		return { left: Math.abs(dictate.left - privacy.left), right: Math.abs(dictate.right - privacy.right) };
	});
	expect(composerAlignment.left).toBeLessThan(2);
	expect(composerAlignment.right).toBeLessThan(2);
	await composer.getByRole('button', { name: /Speak your reply/ }).click();
	await expect(composer.getByLabel('Your reply')).toHaveValue('Hello, the smaller bottle is fine. Thank you.');
	await page.screenshot({ path: 'artifacts/audit-final-voice-reply-composer.png' });
	await composer.getByRole('button', { name: 'Review reply' }).click();
	const review = page.getByRole('dialog', { name: /Reply about Choose a milk substitute/ });
	await expect(review.getByText('Hello, the smaller bottle is fine. Thank you.', { exact: true })).toBeVisible();
	await expect(review.getByRole('button', { name: 'Save suggested message' })).toBeVisible();
	await page.screenshot({ path: 'artifacts/audit-final-voice-reply.png' });
});

test('registers the WebMCP tool suite and tools update the same visible state', async ({ page }) => {
	await expect.poll(() => page.evaluate(() => window.__registeredTools.length)).toBe(32);
	await expect(page.getByRole('button', { name: /Show WebMCP tools: 32 site tools connected/i })).toBeVisible();
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
	const consequential = await page.evaluate(() => window.__registeredTools
		.filter((tool) => tool.annotations?.consequentialHint === true)
		.map((tool) => tool.name));
	expect(consequential).toEqual([
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

test('completes the judge WebMCP journey while keeping the appointment unchanged', async ({ page }) => {
	await expect.poll(() => page.evaluate(() => window.__registeredTools.length)).toBe(32);
	const discovery = await page.evaluate(async () => {
		const call = (name: string, input: Record<string, unknown> = {}) => window.__registeredTools
			.find((tool) => tool.name === name)!
			.execute(input) as Promise<{ success: boolean; summary: string; data?: unknown; needsUserConfirmation?: boolean }>;
		const date = new Date();
		date.setDate(date.getDate() + 1);
		const tomorrow = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
		const original = JSON.parse(localStorage.getItem('careweave.household.v1') ?? '{}').commitments
			.find((item: { id: string }) => item.id === 'event-doctor');
		const brief = await call('get_day_brief');
		const pacing = await call('check_day_pacing', { date: tomorrow });
		const commitments = await call('get_commitments', { date: tomorrow, kind: 'health' });
		const focus = await call('focus_date', { date: tomorrow });
		const route = await call('get_route_options', { commitment_id: 'event-doctor' });
		const showRoute = await call('show_route', { commitment_id: 'event-doctor' });
		return {
			tomorrow,
			original: { startAt: original.startAt, status: original.status },
			brief,
			pacing,
			commitments,
			focus,
			route,
			showRoute
		};
	});

	expect(discovery.brief.success).toBe(true);
	expect(discovery.pacing.success).toBe(true);
	expect(discovery.commitments.success).toBe(true);
	expect(discovery.commitments.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'event-doctor' })]));
	expect(discovery.focus.success).toBe(true);
	expect(discovery.route.success).toBe(true);
	expect(discovery.showRoute.success).toBe(true);
	await expect(page.getByRole('heading', { name: 'To Green Lane Medical Centre' })).toBeVisible();

	const planning = await page.evaluate(async () => {
		const createPlan = window.__registeredTools.find((tool) => tool.name === 'create_appointment_request_plan')!;
		const result = await createPlan.execute({
			commitment_id: 'event-doctor',
			request: 'reschedule',
			email_message: 'Please offer a calm morning appointment and confirm any new time.'
		}) as { success: boolean; summary: string; data?: { id: string; status: string }; needsUserConfirmation?: boolean };
		const stored = JSON.parse(localStorage.getItem('careweave.household.v1') ?? '{}');
		const appointment = stored.commitments.find((item: { id: string }) => item.id === 'event-doctor');
		const plan = stored.plans.find((item: { id: string }) => item.id === result.data?.id);
		return {
			result,
			appointment: { startAt: appointment.startAt, status: appointment.status },
			planStatus: plan?.status
		};
	});

	expect(planning.result.success).toBe(true);
	expect(planning.result.needsUserConfirmation).toBe(true);
	expect(planning.result.summary).toMatch(/Nothing has been sent or changed yet/i);
	expect(planning.appointment).toEqual(discovery.original);
	expect(planning.planStatus).toBe('draft');
	const review = page.getByRole('dialog', { name: /Ask to move Appointment with Dr Patel/ });
	await expect(review).toBeVisible();
	await expect(review.getByText('Nothing has been sent yet. Check each detail below.')).toBeVisible();
});

test('shows a complete approval preview before saving a suggested message locally', async ({ page }) => {
	await page.getByRole('button', { name: 'Next day' }).click();
	await page.getByRole('article', { name: /Appointment with Dr Patel/ }).getByRole('button').first().click();
	await page.getByRole('button', { name: 'Ask to move this' }).click();
	const dialog = page.getByRole('dialog', { name: /Ask to move/ });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('reception@greenlane.example', { exact: true })).toBeVisible();
	await expect(page.getByText(/appointment remains at its current time/i)).toBeVisible();
	const reviewFit = await dialog.evaluate((node) => {
		const title = node.querySelector('h2')!.getBoundingClientRect();
		const actions = node.querySelector('.dialog-actions')!.getBoundingClientRect();
		return { titleTop: title.top, actionsBottom: actions.bottom, viewportHeight: innerHeight };
	});
	expect(reviewFit.titleTop).toBeGreaterThanOrEqual(0);
	expect(reviewFit.actionsBottom).toBeLessThanOrEqual(reviewFit.viewportHeight);
	if ((await page.viewportSize())?.width === 1024) await page.screenshot({ path: 'artifacts/audit-final-review-dialog.png' });
	if ((await page.viewportSize())?.width === 390) await page.screenshot({ path: 'artifacts/audit-final-review-dialog-mobile.png' });
	await page.getByRole('button', { name: 'Save suggested message' }).click();
	await expect(page.getByText('change requested', { exact: true })).not.toBeVisible();
});

test('keeps a stale request open and explains that nothing changed', async ({ page }) => {
	await page.getByRole('button', { name: 'Next day' }).click();
	await page.getByRole('article', { name: /Appointment with Dr Patel/ }).getByRole('button').first().click();
	await page.getByRole('button', { name: 'Ask to move this' }).click();
	await page.evaluate(async () => {
		const scan = window.__registeredTools.find((tool) => tool.name === 'scan_mailbox_for_actions')!;
		await scan.execute({});
	});
	await page.getByRole('button', { name: 'Save suggested message' }).click();
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
		const stored = JSON.parse(localStorage.getItem('careweave.household.v1') ?? '{}');
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
	await expect(page.getByRole('button', { name: /Show WebMCP tools: connection failed/i })).toBeVisible();
	await expect(page.getByRole('button', { name: /Show WebMCP tools:/i })).toHaveAttribute('title', /failed after 2 of 32 tools/i);
	await expect.poll(() => page.evaluate(() => window.__registeredTools.length)).toBe(0);
	if ((await page.viewportSize())?.width === 1024) await page.screenshot({ path: 'artifacts/audit-final-webmcp-failure.png' });
});

test('lets a trusted relative offer help while the account owner keeps control', async ({ page }) => {
	await page.getByRole('button', { name: 'Support', exact: true }).click();
	await waitForViewToSettle(page, '.support-column');
	await expect(page.getByRole('heading', { name: 'Family support' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Shared care looks on track' })).toBeVisible();
	await expect(page.getByText(/Private decisions are not included/i)).toBeVisible();
	await expect(page.getByText('Completed', { exact: true })).toBeVisible();
	await expect(page.getByText(/Message contents, medical notes and detailed care notes are not shown/i)).toBeVisible();

	const appointmentCard = page.getByText('Come to the appointment').locator('xpath=ancestor::article');
	await appointmentCard.getByRole('button', { name: 'Offer help' }).click();
	await expect(appointmentCard.getByRole('button', { name: 'Offer sent' })).toBeDisabled();
	await page.getByRole('button', { name: 'Open main board' }).click();
	await waitForViewToSettle(page, '.today-column');
	await page.getByRole('button', { name: /Attention/ }).click();
	await waitForViewToSettle(page, '.attention-column');
	await expect(page.getByRole('heading', { name: 'Sam offered to help' })).toBeVisible();
	await page.getByRole('button', { name: 'Accept help' }).click();
	await expect(page.getByRole('heading', { name: 'Sam offered to help' }).locator('..').locator('..')).toHaveClass(/resolved/);

	await page.getByRole('button', { name: 'Support', exact: true }).click();
	await waitForViewToSettle(page, '.support-column');
	await expect(page.getByText(/Latest offer:/).locator('..')).toContainText('accepted');
	if ((await page.viewportSize())?.width === 1024) await page.screenshot({ path: 'artifacts/audit-final-family-support.png' });
});

test('keeps the saved fictional board usable offline without demo warnings', async ({ page, context }) => {
	const dayColumn = page.locator('.today-column');
	const elenaCard = dayColumn.getByRole('article', { name: /Elena visits/ });
	await expect(dayColumn.locator('.freshness-strip')).toHaveCount(0);
	await context.setOffline(true);
	await expect(elenaCard).toBeVisible();
	await context.setOffline(false);
	await expect(elenaCard).toBeVisible();
});

test('connects reminder acknowledgement to a supporter response', async ({ page }) => {
	const lunch = page.getByRole('article', { name: /Lunch/ });
	await lunch.getByRole('button').first().click();
	await expect(page.getByLabel('Helpful details').getByText('Lunch is ready in the fridge', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'I need help' }).click();
	await expect(page.getByText(/support circle can see that you asked/i)).toBeVisible();
	await page.getByRole('button', { name: 'Support', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Lunch is ready in the fridge' })).toBeVisible();
	await page.getByRole('button', { name: 'I can help' }).click();
	await expect(page.getByText(/You said you are helping/i)).toBeVisible();
	await page.getByRole('button', { name: 'Open main board' }).click();
	await lunch.getByRole('button').first().click();
	await expect(page.getByText(/trusted supporter has said they are helping/i)).toBeVisible();
});

test('opens reminder choices directly from the day summary', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'The fourth summary tile is intentionally folded into event details on narrower screens.');
	await page.getByRole('button', { name: /Lunch is ready in the fridge/ }).click();
	const reminder = page.getByRole('dialog', { name: 'Lunch' });
	await expect(reminder).toBeVisible();
	await expect(reminder.getByRole('button', { name: 'Done' })).toBeVisible();
	await expect(reminder.getByRole('button', { name: 'Remind me later' })).toBeVisible();
	await expect(reminder.getByRole('button', { name: 'I need help' })).toBeVisible();
	await page.screenshot({ path: 'artifacts/audit-final-reminder-sheet.png' });
	await reminder.getByRole('button', { name: 'Back to my day' }).click();
});

test('guided mode reduces the day to one clear next step', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'The focused mode is visually audited at the primary iPad viewport.');
	await page.getByRole('button', { name: 'Next day' }).click();
	await page.getByRole('button', { name: 'Open display settings' }).click();
	await page.getByRole('button', { name: /Guided/ }).click();
	await page.getByRole('button', { name: 'Close display settings' }).click();
	await expect(page.getByRole('heading', { name: 'Next: Appointment with Dr Patel' })).toBeVisible();
	await expect(page.locator('.timeline .event-card')).toHaveCount(1);
	await expect(page.getByRole('button', { name: 'Show full day' })).toBeVisible();
	await page.screenshot({ path: 'artifacts/audit-final-guided-mode.png' });
});

test('keeps support invitations and disclosure choices outside everyday navigation', async ({ page }) => {
	await page.getByRole('button', { name: 'Support', exact: true }).click();
	await waitForViewToSettle(page, '.support-column');
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
	await page.getByRole('button', { name: 'Start privacy screensaver' }).click();
	const cover = page.getByRole('dialog', { name: /details are hidden/ });
	await expect(cover).toBeVisible();
	await expect(page.locator('.app-shell')).toHaveAttribute('aria-hidden', 'true');
	await expect(cover.getByText('Schedule and personal details stay out of sight.')).toBeVisible();
	await expect(cover.getByText(/Appointment with Dr Patel|Green Lane Clinic|Elena visits/)).toHaveCount(0);
	await expect(cover.getByRole('button', { name: 'Pause motion' })).toHaveCount(0);
	await expect(cover.locator('.screensaver-mark')).toHaveCount(0);
	await cover.getByRole('button', { name: 'Show main board' }).click();
	await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
});

test('keeps the privacy forecast still when reduced motion is requested', async ({ page }) => {
	test.setTimeout(45_000);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.getByRole('button', { name: 'Start privacy screensaver' }).click();
	const sky = page.locator('canvas.weather-sky');
	await expect(sky).toBeVisible();
	const before = Number(await sky.getAttribute('data-frame'));
	await page.waitForTimeout(500);
	const after = Number(await sky.getAttribute('data-frame'));
	expect(after).toBe(before);
	expect(await page.locator('.cloud-layer').first().evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
});
