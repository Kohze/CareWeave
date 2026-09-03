import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
	await page.route('https://tile.openstreetmap.org/**', (request) => request.abort());
	await page.addInitScript(() => {
		if (!sessionStorage.getItem('clearday-test-ready')) {
			localStorage.clear();
			sessionStorage.setItem('clearday-test-ready', 'true');
		}
	});
	await page.goto('/');
	await expect(page.locator('.app-shell')).toHaveAttribute('data-ready', 'true');
});

test('uses readable text, forgiving targets, and a complete iPad week', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'Measured once at the wall-iPad viewport.');

	const initialAudit = await page.evaluate(() => {
		const visible = (element: Element) => {
			const rect = element.getBoundingClientRect();
			const style = getComputedStyle(element);
			return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
		};
		const proseBelow14px = [...document.querySelectorAll('body *')]
			.filter((element) => visible(element) && element.children.length === 0 && (element.textContent ?? '').trim())
			.filter((element) => !element.matches('.nav-icon em'))
			.filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 14)
			.map((element) => ({ text: element.textContent?.trim(), size: getComputedStyle(element).fontSize }));
		const controlsBelow44px = [...document.querySelectorAll('button, a')]
			.filter(visible)
			.map((element) => element.getBoundingClientRect())
			.filter((rect) => rect.width < 44 || rect.height < 44);
		const finalCard = document.querySelector('.event-card:last-child')?.getBoundingClientRect();
		const voiceBar = document.querySelector('.voice-bar')?.getBoundingClientRect();
		return { proseBelow14px, controlsBelow44px, finalCardBottom: finalCard?.bottom, voiceBarTop: voiceBar?.top };
	});

	expect(initialAudit.proseBelow14px).toEqual([]);
	expect(initialAudit.controlsBelow44px).toEqual([]);
	expect(initialAudit.finalCardBottom).toBeLessThanOrEqual(initialAudit.voiceBarTop!);
	await expect(page.getByText(/Wednesday|Thursday|Friday|Saturday|Sunday|Monday|Tuesday/).first()).toBeVisible();
	await page.screenshot({ path: 'artifacts/audit-final-ipad-landscape.png' });

	await page.getByRole('button', { name: '7 days', exact: true }).click();
	const viewport = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, width: innerWidth }));
	expect(viewport.scrollWidth).toBe(viewport.width);
	await expect(page.locator('.week-grid > button')).toHaveCount(7);
	await page.screenshot({ path: 'artifacts/audit-final-next-7-days.png' });
});

test('calendar events open complete details and clearly track selection', async ({ page }, testInfo) => {
	const elenaCard = page.getByRole('article', { name: /Elena visits/ });
	const elenaButton = elenaCard.getByRole('button').first();
	await expect(elenaButton).toHaveAttribute('aria-expanded', 'false');
	await elenaButton.click();
	await expect(elenaButton).toHaveAttribute('aria-expanded', 'true');
	await expect(elenaCard).toHaveClass(/selected/);
	let details = page.getByLabel('Helpful details');
	await expect(details.getByRole('heading', { name: 'Elena visits' })).toBeVisible();
	await expect(details.getByRole('heading', { name: 'What this is about' })).toBeVisible();
	await expect(details.getByText('Help with medication box and breakfast.')).toBeVisible();
	await expect(details.getByText('Elena', { exact: true })).toBeVisible();
	await expect(details.getByText('Carer', { exact: true })).toBeVisible();

	const lunchButton = page.getByRole('article', { name: /Lunch/ }).getByRole('button').first();
	await lunchButton.click();
	await expect(elenaButton).toHaveAttribute('aria-expanded', 'false');
	await expect(lunchButton).toHaveAttribute('aria-expanded', 'true');
	details = page.getByLabel('Helpful details');
	await expect(details.getByText(/There is food ready/)).toBeVisible();
	await expect(details.getByText('At home', { exact: true })).toBeVisible();

	await page.getByRole('button', { name: 'Next day' }).click();
	const doctorButton = page.getByRole('article', { name: /Appointment with Dr Patel/ }).getByRole('button').first();
	await doctorButton.click();
	details = page.getByLabel('Helpful details');
	await expect(details.getByText(/routine review of blood pressure/i)).toBeVisible();
	await expect(details.getByText('Green Lane Medical Centre', { exact: true })).toBeVisible();
	await expect(details.getByText('22 Green Lane, Brookfield', { exact: true })).toBeVisible();
	await expect(details.getByText('GP', { exact: true })).toBeVisible();
	await expect(details.getByText('Reminder: appointment with Dr Patel', { exact: true })).toBeVisible();
	await expect(details.getByText('Bring medication list', { exact: true })).toBeVisible();

	if (testInfo.project.name === 'ipad-landscape') {
		const detailBounds = await details.evaluate((node) => node.getBoundingClientRect().toJSON());
		expect(detailBounds.width).toBeGreaterThan(400);
		const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
		expect(results.violations).toEqual([]);
		await page.screenshot({ path: 'artifacts/audit-final-event-details-landscape.png' });
	}
	if (testInfo.project.name === 'ipad-portrait') {
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(768);
		await page.screenshot({ path: 'artifacts/audit-final-event-details-portrait.png' });
	}
	if (testInfo.project.name === 'ipad-landscape' || testInfo.project.name === 'ipad-portrait') {
		const changeAction = details.getByRole('button', { name: 'Ask to move this' });
		await changeAction.scrollIntoViewIfNeeded();
		await page.mouse.wheel(0, 280);
		const fit = await page.evaluate(() => {
			const action = [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Ask to move this'))?.getBoundingClientRect();
			const voiceBar = document.querySelector('.voice-bar')?.getBoundingClientRect();
			return { actionTop: action?.top, actionBottom: action?.bottom, voiceBarTop: voiceBar?.top };
		});
		expect(fit.actionTop).toBeGreaterThanOrEqual(0);
		expect(fit.actionBottom).toBeLessThanOrEqual(fit.voiceBarTop!);
		await page.screenshot({ path: `artifacts/audit-final-event-details-actions-${testInfo.project.name}.png` });
	}

	await page.getByRole('button', { name: 'Close details' }).click();
	await expect(page.getByRole('heading', { name: 'Appointment with Dr Patel' })).not.toBeVisible();
	await expect(doctorButton).toHaveAttribute('aria-expanded', 'false');
});

test('offers persistent large text and high contrast with focus returned to the opener', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'Measured once at the wall-iPad viewport.');
	const opener = page.getByRole('button', { name: 'Open display settings' });
	await opener.click();
	const displayDialog = page.getByRole('dialog', { name: 'Display settings' });
	await expect(displayDialog).toBeVisible();
	await expect(page.getByRole('button', { name: 'Close display settings' })).toBeFocused();
	const optionLayouts = await displayDialog.locator('.choice-grid button').evaluateAll((buttons) => buttons.map((button) => {
		const title = button.querySelector('.choice-copy strong')!.getBoundingClientRect();
		const description = button.querySelector('.choice-copy small')!.getBoundingClientRect();
		const visual = button.querySelector('.choice-visual')!.getBoundingClientRect();
		return { titleLeft: title.left, descriptionLeft: description.left, descriptionWidth: description.width, visualRight: visual.right };
	}));
	for (const option of optionLayouts) {
		expect(Math.abs(option.titleLeft - option.descriptionLeft)).toBeLessThan(2);
		expect(option.titleLeft).toBeGreaterThan(option.visualRight);
		expect(option.descriptionWidth).toBeGreaterThan(130);
	}
	await page.screenshot({ path: 'artifacts/audit-final-display-dialog.png' });
	await page.getByRole('button', { name: /Extra large/ }).click();
	await page.getByRole('button', { name: /High contrast/ }).click();
	await page.getByRole('button', { name: /Guided/ }).click();
	await page.getByRole('button', { name: /Read details aloud/ }).click();
	await page.getByRole('button', { name: 'Close display settings' }).click();
	await expect(opener).toBeFocused();
	await expect(page.locator('.app-shell')).toHaveAttribute('data-text-size', 'large');
	await expect(page.locator('.app-shell')).toHaveAttribute('data-contrast', 'high');
	await expect(page.locator('.app-shell')).toHaveClass(/guided/);
	await page.reload();
	await expect(page.locator('.app-shell')).toHaveAttribute('data-text-size', 'large');
	await expect(page.locator('.app-shell')).toHaveAttribute('data-contrast', 'high');
	await expect(page.locator('.app-shell')).toHaveClass(/guided/);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1024);
});

test('defaults appointment review focus to the safe action and Escape changes nothing', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'Keyboard behavior is viewport-independent.');
	await page.getByRole('button', { name: 'Next day' }).click();
	await page.getByRole('article', { name: /Appointment with Dr Patel/ }).getByRole('button').first().click();
	const opener = page.getByRole('button', { name: 'Ask to move this' });
	await opener.click();
	await expect(page.getByRole('button', { name: 'Keep things as they are' })).toBeFocused();
	const dialogBounds = await page.getByRole('dialog').evaluate((dialog) => {
		const rect = dialog.getBoundingClientRect();
		return { top: rect.top, bottom: rect.bottom, viewportHeight: innerHeight };
	});
	expect(dialogBounds.top).toBeGreaterThanOrEqual(0);
	expect(dialogBounds.bottom).toBeLessThanOrEqual(dialogBounds.viewportHeight);
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(opener).toBeFocused();
	await expect(page.getByText('change requested', { exact: true })).not.toBeVisible();
});

test('offers a keyboard bypass and clearly identifies the current view', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'Keyboard semantics are viewport-independent.');
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: /Skip to today/ })).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.locator('#main-content')).toBeFocused();
	await expect(page.getByRole('button', { name: 'Day', exact: true })).toHaveAttribute('aria-current', 'page');
	await page.getByRole('button', { name: '7 days', exact: true }).focus();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('button', { name: '7 days', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('voice examples give a plain-language answer and update the shared board', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'Voice UI is exercised once; speech recognition itself is browser-provided.');
	await page.getByRole('button', { name: /Talk to ClearDay/ }).click();
	await expect(page.getByRole('dialog', { name: 'What would you like help with?' })).toBeVisible();
	await page.getByRole('button', { name: '“When should I leave for the doctor?”' }).click();
	await expect(page.locator('.voice-response')).toContainText(/leave at 10:37/i);
	await page.getByRole('button', { name: 'Close voice help' }).click();
	await expect(page.getByText(/Route for Thursday|Route for Friday|Route for Saturday|Route for Sunday|Route for Monday|Route for Tuesday|Route for Wednesday/)).toBeVisible();
	await expect(page.getByRole('heading', { name: 'To Green Lane Medical Centre' })).toBeVisible();
});

test('reflows without horizontal clipping at 200 percent text size', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'Measured once at the wall-iPad viewport.');
	await page.addStyleTag({ content: 'html { font-size: 36px !important; }' });
	const fit = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, width: innerWidth }));
	expect(fit.scrollWidth).toBe(fit.width);
	await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
});

test('maintains WCAG AA text contrast across every main view', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'Measured once at the wall-iPad viewport.');
	for (const name of ['Day', '7 days', 'Attention', 'Food', 'Support', 'History']) {
		await page.getByRole('button', { name: name === 'Attention' ? /Attention/ : name, exact: name !== 'Attention' }).click();
		const failures = await page.evaluate(() => {
			const channels = (color: string) => (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
			const luminance = (values: number[]) => {
				const linear = values.map((value) => {
					const channel = value / 255;
					return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
				});
				return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
			};
			const background = (element: Element) => {
				for (let current: Element | null = element; current; current = current.parentElement) {
					const color = getComputedStyle(current).backgroundColor;
					if (color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') return channels(color);
				}
				return [244, 241, 233];
			};
			return [...document.querySelectorAll('body *')]
				.filter((element) => {
					const rect = element.getBoundingClientRect();
					return rect.width > 0 && rect.height > 0 && element.children.length === 0 && (element.textContent ?? '').trim();
				})
				.map((element) => {
					const style = getComputedStyle(element);
					const foregroundLuminance = luminance(channels(style.color));
					const backgroundLuminance = luminance(background(element));
					const ratio = (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
					const fontSize = Number.parseFloat(style.fontSize);
					const large = fontSize >= 24 || (fontSize >= 18.66 && Number.parseInt(style.fontWeight) >= 700);
					return { text: element.textContent?.trim(), ratio, required: large ? 3 : 4.5 };
				})
				.filter((result) => result.ratio < result.required);
		});
		expect(failures, `${name} view contrast failures`).toEqual([]);
	}
});

test('has no automatically detectable WCAG A or AA violations in every main view', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'Full semantic audit runs once at the primary viewport.');
	for (const name of ['Day', '7 days', 'Attention', 'Food', 'Support', 'History']) {
		await page.getByRole('button', { name: name === 'Attention' ? /Attention/ : name, exact: name !== 'Attention' }).click();
		const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
		expect(results.violations, `${name} view accessibility violations`).toEqual([]);
		await page.screenshot({ path: `artifacts/audit-final-${name.toLowerCase().replace('7 days', 'next-7-days')}.png` });
	}
});

test('keeps every visible control large enough in all views and dialogs', async ({ page }) => {
	const assertTargets = async (state: string) => {
		const small = await page.evaluate(() => [...document.querySelectorAll('button, a')]
			.filter((element) => {
				const rect = element.getBoundingClientRect();
				const style = getComputedStyle(element);
				return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && rect.bottom > 0 && rect.top < innerHeight;
			})
			.map((element) => ({ name: element.getAttribute('aria-label') ?? element.textContent?.trim(), ...element.getBoundingClientRect().toJSON() }))
			.filter((rect) => rect.width < 44 || rect.height < 44));
		expect(small, `${state} has undersized controls`).toEqual([]);
	};

	for (const name of ['Day', '7 days', 'Attention', 'Food', 'Support', 'History']) {
		await page.getByRole('button', { name: name === 'Attention' ? /Attention/ : name, exact: name !== 'Attention' }).click();
		await assertTargets(name);
	}
	await page.getByRole('button', { name: 'Day', exact: true }).click();
	await page.getByRole('button', { name: 'Open display settings' }).click();
	await assertTargets('Display dialog');
	await page.getByRole('button', { name: 'Close display settings' }).click();
	await page.getByRole('button', { name: /Talk to ClearDay/ }).click();
	await assertTargets('Voice dialog');
});

test('keeps dialogs semantically accessible and motion optional', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'Dialog and motion audit runs once.');
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.getByRole('button', { name: 'Open display settings' }).click();
	let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
	expect(results.violations).toEqual([]);
	await page.getByRole('button', { name: 'Close display settings' }).click();
	await page.getByRole('button', { name: /Talk to ClearDay/ }).click();
	results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
	expect(results.violations).toEqual([]);
	expect(await page.locator('.voice-orb').evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
	await page.screenshot({ path: 'artifacts/audit-final-voice-dialog.png' });
});

test('keeps support, urgent-help, and privacy dialogs accessible', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'Protected dialog audit runs once.');

	await page.getByRole('button', { name: 'Support', exact: true }).click();
	await page.getByRole('button', { name: 'Manage access' }).click();
	let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
	expect(results.violations, 'Support-access dialog accessibility violations').toEqual([]);
	await page.screenshot({ path: 'artifacts/audit-final-support-access.png' });
	await page.getByRole('button', { name: 'Close support settings' }).click();

	await page.getByRole('button', { name: 'Help now' }).click();
	results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
	expect(results.violations, 'Urgent-help dialog accessibility violations').toEqual([]);
	await page.getByRole('button', { name: 'Close urgent help' }).click();

	await page.getByRole('button', { name: 'Hide private details' }).click();
	results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
	expect(results.violations, 'Privacy-cover dialog accessibility violations').toEqual([]);
	await page.getByRole('button', { name: /Show Margaret's board/ }).click();
});

test('keeps controls and focus visible in forced-colour mode', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'Forced-colour rendering is checked once.');
	await page.emulateMedia({ forcedColors: 'active' });
	const food = page.getByRole('button', { name: 'Food', exact: true });
	await food.focus();
	const styles = await food.evaluate((node) => {
		const style = getComputedStyle(node);
		return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
	});
	expect(styles.outlineStyle).toBe('solid');
	expect(Number.parseFloat(styles.outlineWidth)).toBeGreaterThanOrEqual(3);
	await page.screenshot({ path: 'artifacts/audit-final-forced-colours.png' });
});

test('exploratory pass covers control cycles and safe exits', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'Exploratory flow runs once at the primary viewport.');

	await page.getByRole('button', { name: 'Next day' }).click();
	await expect(page.getByRole('heading', { name: 'Today', exact: true })).not.toBeVisible();
	await page.getByRole('button', { name: 'Previous day' }).click();
	await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();

	await page.getByRole('button', { name: /things need your attention/ }).click();
	await page.getByRole('button', { name: 'Prepare reply' }).first().click();
	await expect(page.getByRole('button', { name: 'Keep things as they are' })).toBeFocused();
	await page.getByRole('button', { name: 'Keep things as they are' }).click();
	await expect(page.getByRole('dialog')).not.toBeVisible();

	await page.getByRole('button', { name: 'Food', exact: true }).click();
	const milk = page.getByRole('button', { name: /Milk/ });
	await milk.click();
	await expect(milk).toHaveClass(/done/);
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	await expect(milk).not.toHaveClass(/done/);

	await page.getByRole('button', { name: 'Day', exact: true }).click();
	await page.getByRole('article', { name: /Elena visits/ }).getByRole('button').click();
	await expect(page.getByRole('heading', { name: 'Elena visits' })).toBeVisible();
	await page.getByRole('button', { name: 'Close details' }).click();
	await page.getByRole('button', { name: /Appointment with Dr Patel/ }).click();
	await page.getByRole('button', { name: 'Show route on map' }).click();
	await expect(page.getByRole('heading', { name: 'To Green Lane Medical Centre' })).toBeVisible();
	await page.getByRole('button', { name: 'Close route' }).click();
	await page.getByRole('article', { name: /Appointment with Dr Patel/ }).getByRole('button').first().click();
	await page.getByRole('button', { name: 'I need to cancel instead' }).click();
	await expect(page.getByRole('dialog', { name: /Ask to cancel/ })).toBeVisible();
	await page.getByRole('button', { name: 'Keep things as they are' }).click();

	await page.getByRole('button', { name: /Talk to ClearDay/ }).click();
	await page.getByRole('button', { name: '“What do I need to do today?”' }).click();
	await expect(page.locator('.voice-response')).toContainText(/Today/);
	await page.getByRole('button', { name: 'Close voice help' }).click();

	await page.getByRole('button', { name: 'History', exact: true }).click();
	page.once('dialog', (dialog) => dialog.dismiss());
	await page.getByRole('button', { name: 'Reset fictional demo' }).click();
	await expect(page.getByRole('heading', { name: 'What happened' })).toBeVisible();
	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('button', { name: 'Reset fictional demo' }).click();
	await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
});

test('real map is interactive, attributed, and keeps written directions', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'Map interaction is checked once at the primary viewport.');
	await page.route('https://tile.openstreetmap.org/**', (request) => request.abort());
	await page.getByRole('button', { name: 'Next day' }).click();
	const appointment = page.getByRole('article', { name: /Appointment with Dr Patel/ });
	await appointment.getByRole('button', { name: 'Route', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'To Green Lane Medical Centre' })).toBeVisible();
	const map = page.getByRole('region', { name: /Interactive map from Home/ });
	await expect(map).toHaveAttribute('data-map-ready', 'true');
	const mapBounds = await map.evaluate((node) => node.getBoundingClientRect().toJSON());
	expect(mapBounds.width).toBeGreaterThan(500);
	expect(mapBounds.height).toBeGreaterThanOrEqual(330);
	const voiceBarTop = await page.locator('.voice-bar').evaluate((node) => node.getBoundingClientRect().top);
	expect(mapBounds.bottom).toBeLessThanOrEqual(voiceBarTop);
	await expect(page.locator('.day-layout .timeline-section')).not.toBeVisible();
	await expect(page.getByRole('link', { name: /OpenStreetMap contributors/ })).toBeVisible();
	await expect(page.getByRole('link', { name: /Open full directions/ })).toHaveAttribute('href', /maps\.apple\.com/);
	const zoomIn = page.getByRole('button', { name: 'Zoom in' });
	const zoomBox = await zoomIn.boundingBox();
	expect(zoomBox?.width).toBeGreaterThanOrEqual(44);
	expect(zoomBox?.height).toBeGreaterThanOrEqual(44);
	await zoomIn.click();
	await page.getByRole('button', { name: 'Zoom out' }).click();
	await expect(page.getByText(/follow the highlighted walking route/i)).toBeVisible();
	const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
	expect(results.violations).toEqual([]);
	await page.screenshot({ path: 'artifacts/audit-final-large-route.png' });
});

test('map failure leaves the route usable', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-landscape', 'Offline fallback is checked once.');
	await page.getByRole('button', { name: 'Next day' }).click();
	await page.getByRole('article', { name: /Appointment with Dr Patel/ }).getByRole('button', { name: 'Route', exact: true }).click();
	await page.evaluate(() => window.dispatchEvent(new Event('offline')));
	await expect(page.getByRole('status').filter({ hasText: /background unavailable/i })).toBeVisible();
	await expect(page.getByText(/follow the highlighted walking route/i)).toBeVisible();
	await expect(page.getByRole('link', { name: /Open full directions/ })).toBeVisible();
});

test('real map fits the portrait iPad without horizontal overflow', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-portrait', 'Portrait map layout check.');
	await page.route('https://tile.openstreetmap.org/**', (request) => request.abort());
	await page.getByRole('button', { name: 'Next day' }).click();
	await page.getByRole('article', { name: /Appointment with Dr Patel/ }).getByRole('button', { name: 'Route', exact: true }).click();
	const map = page.getByRole('region', { name: /Interactive map from Home/ });
	await expect(map).toHaveAttribute('data-map-ready', 'true');
	expect(await map.evaluate((node) => node.getBoundingClientRect().height)).toBe(320);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(768);
});

test('shows all seven days without sideways scrolling on a portrait iPad', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'ipad-portrait', 'Portrait-specific layout check.');
	await page.getByRole('button', { name: '7 days', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Next 7 days' })).toBeVisible();
	expect(await page.locator('.week-grid > button').count()).toBe(7);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(768);
	const columns = await page.locator('.week-grid').evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length);
	expect(columns).toBe(2);
	await page.screenshot({ path: 'artifacts/audit-final-ipad-portrait.png' });
});

test('mobile keeps every visible control at least 44 pixels', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile', 'Measured once at the mobile viewport.');
	const smallControls = await page.evaluate(() => [...document.querySelectorAll('button, a')]
		.filter((element) => {
			const rect = element.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		})
		.map((element) => element.getBoundingClientRect())
		.filter((rect) => rect.width < 44 || rect.height < 44));
	expect(smallControls).toEqual([]);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
