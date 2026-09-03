export function localDateKey(date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function addDays(dateKey: string, days: number): string {
	const date = new Date(`${dateKey}T12:00:00`);
	date.setDate(date.getDate() + days);
	return localDateKey(date);
}

export function atTime(dateKey: string, time: string): string {
	return new Date(`${dateKey}T${time}:00`).toISOString();
}

export function dateKeyFromIso(iso: string): string {
	return localDateKey(new Date(iso));
}

export function formatTime(iso: string, timeZone?: string): string {
	return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone }).format(
		new Date(iso)
	);
}

export function formatDay(dateKey: string, style: 'short' | 'long' = 'long'): string {
	return new Intl.DateTimeFormat('en-GB', {
		weekday: style === 'long' ? 'long' : 'short',
		day: 'numeric',
		month: style === 'long' ? 'long' : 'short'
	}).format(new Date(`${dateKey}T12:00:00`));
}

export function minutesBetween(start: string, end: string): number {
	return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
}

export function addMinutes(iso: string, minutes: number): string {
	return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function sameDay(iso: string, dateKey: string): boolean {
	return dateKeyFromIso(iso) === dateKey;
}
