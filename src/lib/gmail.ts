import type { SourceMessage } from './types';

export interface GmailConnectionStatus {
	configured: boolean;
	connected: boolean;
	email?: string;
	connectedAt?: string;
	capabilities: string[];
}

export interface GmailDraftResult {
	created: true;
	draftId?: string;
	messageId?: string;
	threadId?: string;
}

async function responseJson<T>(response: Response): Promise<T> {
	const data = await response.json().catch(() => ({})) as T & { error?: string };
	if (!response.ok) throw new Error(data.error ?? 'Gmail request failed.');
	return data;
}

export async function getGmailStatus(): Promise<GmailConnectionStatus> {
	const response = await fetch('/api/gmail/status', { credentials: 'same-origin', cache: 'no-store' });
	return responseJson<GmailConnectionStatus>(response);
}

export async function listGmailMessages(limit = 10): Promise<SourceMessage[]> {
	const response = await fetch(`/api/gmail/messages?limit=${encodeURIComponent(String(limit))}`, {
		credentials: 'same-origin',
		cache: 'no-store'
	});
	return (await responseJson<{ messages: SourceMessage[] }>(response)).messages;
}

export async function createGmailDraft(input: { to: string; subject: string; body: string }): Promise<GmailDraftResult> {
	const response = await fetch('/api/gmail/drafts', {
		method: 'POST',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});
	return responseJson<GmailDraftResult>(response);
}

export async function disconnectGmail(): Promise<void> {
	const response = await fetch('/api/gmail/disconnect', {
		method: 'POST',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/json' }
	});
	await responseJson(response);
}
