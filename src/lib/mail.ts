import type { AttentionCategory, AttentionItem, SourceMessage } from './types';

/** A production adapter returns normalized metadata, never provider credentials. */
export interface MailboxAdapter {
	readonly name: string;
	listMessages(): Promise<SourceMessage[]>;
}

function categoryFor(message: SourceMessage): AttentionCategory {
	const text = `${message.subject} ${message.summary}`.toLowerCase();
	if (/(late|later|reschedul|moved|time changed)/.test(text)) return 'schedule_change';
	if (/(milk|grocery|food|substitut|order)/.test(text)) return 'food_need';
	if (/(deliver|parcel)/.test(text)) return 'delivery';
	if (/(confirm|reply|respond)/.test(text)) return 'reply_required';
	if (/(appointment|visit|booking)/.test(text)) return 'new_commitment';
	return 'information';
}

function requestedActionFor(category: AttentionCategory): string {
	if (category === 'schedule_change') return 'Review the proposed time and prepare a reply';
	if (category === 'food_need') return 'Review the food choice or add it to shopping';
	if (category === 'delivery') return 'Check the delivery time';
	if (category === 'reply_required') return 'Review and prepare a reply';
	if (category === 'new_commitment') return 'Check whether this belongs on the dayboard';
	return 'Read when convenient';
}

/**
 * Extracts a candidate action from normalized, untrusted mail metadata.
 * This deliberately does not execute instructions, choose recipients, or create commitments.
 */
export function extractAttention(message: SourceMessage): AttentionItem {
	const category = categoryFor(message);
	return {
		id: `attention-${message.id}`,
		category,
		title: message.subject,
		summary: message.summary,
		requestedAction: requestedActionFor(category),
		confidence: category === 'information' ? 'low' : 'medium',
		status: 'new',
		sourceId: message.id,
		createdAt: message.receivedAt
	};
}
