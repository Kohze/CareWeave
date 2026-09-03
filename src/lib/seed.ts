import { addDays, atTime, localDateKey } from './dates';
import type { AppData, Commitment } from './types';

function commitment(
	id: string,
	kind: Commitment['kind'],
	title: string,
	date: string,
	start: string,
	end: string,
	extra: Partial<Commitment> = {}
): Commitment {
	return {
		id,
		kind,
		title,
		startAt: atTime(date, start),
		endAt: atTime(date, end),
		status: 'confirmed',
		importance: 'normal',
		protected: false,
		participantIds: [],
		sourceIds: [],
		prep: [],
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
		updatedAt: new Date().toISOString(),
		...extra
	};
}

export function createSeedData(): AppData {
	const today = localDateKey();
	const tomorrow = addDays(today, 1);
	const afterTomorrow = addDays(today, 2);
	const now = new Date().toISOString();
	return {
		version: 1,
		revision: 1,
		people: [
			{ id: 'person-elena', name: 'Elena', role: 'Carer', email: 'elena@kindcare.example' },
			{ id: 'person-patel', name: 'Dr Patel', role: 'GP', email: 'reception@greenlane.example' },
			{ id: 'person-sam', name: 'Sam', role: 'Son', email: 'sam@example.test', phone: '+44 7700 900123' }
		],
		places: [
			{ id: 'place-home', name: 'Home', address: '14 Orchard Close', shortAddress: 'Home', latitude: 51.50755, longitude: -0.1372 },
			{
				id: 'place-clinic',
				name: 'Green Lane Medical Centre',
				address: '22 Green Lane, Brookfield',
				shortAddress: 'Green Lane Clinic',
				latitude: 51.51415,
				longitude: -0.1255
			},
			{ id: 'place-market', name: 'Local Market', address: '8 Market Street', shortAddress: 'Market', latitude: 51.51075, longitude: -0.1422 }
		],
		commitments: [
			commitment('event-carer', 'care', 'Elena visits', today, '08:30', '09:30', {
				participantIds: ['person-elena'],
				importance: 'important',
				seriesId: 'series-elena-weekly',
				recurrence: { frequency: 'weekly', interval: 1, until: addDays(today, 28) },
				sourceEventId: 'kindcare-elena-weekly',
				sourceVersion: '1',
				sourceSyncedAt: now,
				notes: 'Help with medication box and breakfast.'
			}),
			commitment('event-lunch', 'food', 'Lunch', today, '12:30', '13:15', {
				notes: 'Lunch at home. There is food ready, so nothing needs to be prepared beforehand.'
			}),
			commitment('event-walk', 'social', 'Short walk with Sam', today, '15:00', '15:45', {
				participantIds: ['person-sam'],
				notes: 'A gentle walk together around the nearby park. Turn back whenever you feel tired.'
			}),
			commitment('event-doctor', 'health', 'Appointment with Dr Patel', tomorrow, '11:00', '11:30', {
				participantIds: ['person-patel'],
				locationId: 'place-clinic',
				importance: 'critical',
				protected: true,
				travelMinutes: 18,
				sourceIds: ['mail-clinic'],
				notes: 'A routine review of blood pressure and current medication. You can also ask about the recent hospital letter.',
				prep: [
					{ id: 'prep-meds', label: 'Bring medication list', done: false },
					{ id: 'prep-letter', label: 'Bring hospital letter', done: true }
				]
			}),
			commitment('event-shopping', 'shopping', 'Food shopping', afterTomorrow, '10:30', '11:30', {
				locationId: 'place-market',
				travelMinutes: 12,
				notes: 'Weekly food shopping for milk, bread and bananas. The shopping list is available in Food.'
			})
		],
		sources: [
			{
				id: 'mail-clinic',
				provider: 'demo_mailbox',
				from: 'Green Lane Medical Centre <reception@greenlane.example>',
				to: 'owner@example.test',
				subject: 'Reminder: appointment with Dr Patel',
				receivedAt: now,
				summary: `Appointment with Dr Patel at 11:00 on ${tomorrow}. Please bring a medication list.`,
				untrusted: true
			},
			{
				id: 'mail-carer',
				provider: 'demo_mailbox',
				from: 'KindCare <visits@kindcare.example>',
				to: 'owner@example.test',
				subject: 'Elena may arrive 30 minutes later',
				receivedAt: now,
				summary: 'Elena may arrive at 09:00 today. Please confirm that this is all right.',
				untrusted: true
			},
			{
				id: 'mail-grocery',
				provider: 'demo_mailbox',
				from: 'FreshBasket <orders@freshbasket.example>',
				to: 'owner@example.test',
				subject: 'Milk unavailable in your usual size',
				receivedAt: now,
				summary: 'The usual milk is unavailable. A smaller bottle can be substituted.',
				untrusted: true
			}
		],
		attentionItems: [
			{
				id: 'attention-carer',
				category: 'schedule_change',
				title: 'Elena may be 30 minutes late',
				summary: 'KindCare says Elena may arrive at 09:00 instead of 08:30.',
				requestedAction: 'Confirm whether 09:00 is all right',
				confidence: 'high',
				status: 'resolved',
				sourceId: 'mail-carer',
				relatedCommitmentId: 'event-carer',
				createdAt: now
			},
			{
				id: 'attention-grocery',
				category: 'food_need',
				title: 'Choose a milk substitute',
				summary: 'Your usual milk is unavailable; a smaller bottle is available.',
				requestedAction: 'Review the substitution before the order closes',
				confidence: 'high',
				status: 'new',
				sourceId: 'mail-grocery',
				createdAt: now
			}
		],
		supportCircle: [
			{
				personId: 'person-sam',
				relationship: 'Son',
				status: 'active',
				permissions: ['view_schedule', 'view_care_status', 'view_food_status', 'suggest_help', 'respond_to_help'],
				accessStartsAt: now,
				lastSeenAt: now
			}
		],
		supportOffers: [],
		careVisitUpdates: [
			{
				commitmentId: 'event-carer',
				status: 'completed',
				updatedAt: atTime(today, '09:25'),
				note: 'Breakfast was prepared and the medication box was checked.'
			}
		],
		reminders: [
			{
				id: 'reminder-lunch',
				commitmentId: 'event-lunch',
				label: 'Lunch is ready in the fridge',
				dueAt: atTime(today, '12:15'),
				status: 'pending',
				updatedAt: now
			},
			{
				id: 'reminder-doctor-prep',
				commitmentId: 'event-doctor',
				label: 'Check what to bring tomorrow',
				dueAt: atTime(today, '18:00'),
				status: 'pending',
				updatedAt: now
			}
		],
		dataFeeds: [
			{ id: 'calendar', label: 'Calendar', status: 'current', lastSuccessfulSyncAt: now, staleAfterMinutes: 120 },
			{ id: 'care', label: 'Care visits', status: 'current', lastSuccessfulSyncAt: now, staleAfterMinutes: 60 },
			{ id: 'messages', label: 'Messages', status: 'current', lastSuccessfulSyncAt: now, staleAfterMinutes: 180 }
		],
		food: {
			daysCovered: 2,
			nextShoppingBy: afterTomorrow,
			groceryItems: [
				{ id: 'grocery-milk', name: 'Milk', quantity: '1 bottle', category: 'Dairy', checked: false, neededBy: tomorrow },
				{ id: 'grocery-bread', name: 'Bread', quantity: '1 loaf', category: 'Bakery', checked: false, neededBy: afterTomorrow },
				{ id: 'grocery-bananas', name: 'Bananas', quantity: '5', category: 'Fruit', checked: false, neededBy: afterTomorrow }
			],
			notes: ['Lunches are covered through tomorrow.', 'Milk is running low.']
		},
		plans: [],
		outbox: [],
		activity: [
			{ id: 'activity-ready', type: 'system', label: 'CareWeave is ready', detail: 'Demo household loaded safely.', createdAt: now },
			{ id: 'activity-mail', type: 'mail_scan', label: 'Mailbox checked', detail: '2 messages checked; 1 still needs attention.', createdAt: now }
		],
		preferences: {
			ownerName: '',
			homePlaceId: 'place-home',
			dayStartHour: 8,
			dayEndHour: 19,
			defaultBufferMinutes: 20,
			contrast: 'standard',
			textSize: 'standard',
			guidedMode: false,
			language: 'en',
			readAloud: false
		}
	};
}
