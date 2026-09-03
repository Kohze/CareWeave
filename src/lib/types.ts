export type CommitmentKind =
	| 'health'
	| 'care'
	| 'food'
	| 'shopping'
	| 'travel'
	| 'household'
	| 'social'
	| 'administrative';

export type CommitmentStatus =
	| 'tentative'
	| 'confirmed'
	| 'needs_confirmation'
	| 'change_requested'
	| 'cancellation_requested'
	| 'awaiting_reply'
	| 'completed'
	| 'cancelled';

export interface Place {
	id: string;
	name: string;
	address: string;
	shortAddress: string;
	latitude: number;
	longitude: number;
}

export interface Person {
	id: string;
	name: string;
	role: string;
	email?: string;
	phone?: string;
}

export interface ChecklistItem {
	id: string;
	label: string;
	done: boolean;
}

export interface Commitment {
	id: string;
	kind: CommitmentKind;
	title: string;
	startAt: string;
	endAt: string;
	status: CommitmentStatus;
	importance: 'normal' | 'important' | 'critical';
	protected: boolean;
	locationId?: string;
	participantIds: string[];
	sourceIds: string[];
	prep: ChecklistItem[];
	travelMinutes?: number;
	notes?: string;
	timeZone?: string;
	seriesId?: string;
	recurrence?: {
		frequency: 'daily' | 'weekly';
		interval: number;
		until?: string;
	};
	sourceEventId?: string;
	sourceVersion?: string;
	sourceSyncedAt?: string;
	updatedAt: string;
}

export type AttentionCategory =
	| 'new_commitment'
	| 'schedule_change'
	| 'confirmation'
	| 'reply_required'
	| 'food_need'
	| 'delivery'
	| 'support_offer'
	| 'information';

export interface AttentionItem {
	id: string;
	category: AttentionCategory;
	title: string;
	summary: string;
	requestedAction: string;
	confidence: 'high' | 'medium' | 'low';
	status: 'new' | 'reviewed' | 'resolved' | 'dismissed';
	sourceId?: string;
	relatedCommitmentId?: string;
	supportOfferId?: string;
	createdAt: string;
}

export type SupportPermission =
	| 'view_schedule'
	| 'view_care_status'
	| 'view_food_status'
	| 'view_attention_count'
	| 'suggest_help'
	| 'respond_to_help';

export interface SupportMember {
	personId: string;
	relationship: string;
	status: 'active' | 'invited' | 'revoked';
	permissions: SupportPermission[];
	accessStartsAt?: string;
	accessExpiresAt?: string;
	lastSeenAt?: string;
}

export type SupportOfferCategory = 'appointment' | 'shopping' | 'transport' | 'check_in';

export interface SupportOffer {
	id: string;
	createdById: string;
	category: SupportOfferCategory;
	message: string;
	status: 'suggested' | 'accepted' | 'declined' | 'withdrawn';
	fulfillmentStatus?: 'accepted' | 'acknowledged' | 'completed';
	relatedCommitmentId?: string;
	createdAt: string;
	respondedAt?: string;
}

export type ReminderStatus = 'pending' | 'snoozed' | 'done' | 'help_requested' | 'help_acknowledged';

export interface Reminder {
	id: string;
	commitmentId: string;
	label: string;
	dueAt: string;
	status: ReminderStatus;
	snoozedUntil?: string;
	updatedAt: string;
	helpRequestedAt?: string;
	helpAcknowledgedById?: string;
}

export type DataFeedStatus = 'current' | 'delayed' | 'offline';

export interface DataFeed {
	id: 'calendar' | 'care' | 'messages';
	label: string;
	status: DataFeedStatus;
	lastSuccessfulSyncAt: string;
	staleAfterMinutes: number;
	detail?: string;
}

export interface CareVisitUpdate {
	commitmentId: string;
	status: 'scheduled' | 'checked_in' | 'completed' | 'late' | 'missed';
	updatedAt: string;
	note?: string;
}

export interface SourceMessage {
	id: string;
	provider: 'demo_mailbox' | 'gmail' | 'outlook' | 'manual';
	from: string;
	to: string;
	subject: string;
	receivedAt: string;
	summary: string;
	untrusted: true;
}

export interface GroceryItem {
	id: string;
	name: string;
	quantity: string;
	category: string;
	checked: boolean;
	neededBy: string;
}

export interface FoodStatus {
	daysCovered: number;
	nextShoppingBy: string;
	groceryItems: GroceryItem[];
	notes: string[];
}

export interface RouteStep {
	instruction: string;
	minutes: number;
}

export interface RoutePlan {
	commitmentId: string;
	mode: 'walk' | 'car' | 'transit' | 'taxi';
	leaveAt: string;
	durationMinutes: number;
	destination: string;
	destinationAddress: string;
	timeZone?: string;
	origin: { latitude: number; longitude: number };
	destinationPoint: { latitude: number; longitude: number };
	path: Array<{ latitude: number; longitude: number }>;
	steps: RouteStep[];
}

export interface PlanStep {
	id: string;
	type: 'send_email' | 'update_commitment' | 'resolve_attention' | 'create_commitment';
	label: string;
	payload: Record<string, unknown>;
}

export interface ActionPlan {
	id: string;
	title: string;
	status: 'draft' | 'approved' | 'discarded' | 'expired';
	baseStateRevision: number;
	createdAt: string;
	expiresAt: string;
	steps: PlanStep[];
	warnings: string[];
	deliveryMode?: 'demo' | 'gmail_draft';
}

export interface OutboxMessage {
	id: string;
	to: string;
	subject: string;
	body: string;
	status: 'saved_demo' | 'draft';
	createdAt: string;
	providerId?: string;
}

export interface ActivityEvent {
	id: string;
	type: string;
	label: string;
	detail: string;
	createdAt: string;
}

export interface Preferences {
	ownerName: string;
	homePlaceId: string;
	dayStartHour: number;
	dayEndHour: number;
	defaultBufferMinutes: number;
	contrast: 'standard' | 'high';
	textSize: 'standard' | 'large';
	guidedMode: boolean;
	language: 'en' | 'de' | 'pl';
	readAloud: boolean;
}

export interface AppData {
	version: 1;
	revision: number;
	commitments: Commitment[];
	attentionItems: AttentionItem[];
	sources: SourceMessage[];
	people: Person[];
	places: Place[];
	food: FoodStatus;
	plans: ActionPlan[];
	outbox: OutboxMessage[];
	activity: ActivityEvent[];
	supportCircle: SupportMember[];
	supportOffers: SupportOffer[];
	careVisitUpdates: CareVisitUpdate[];
	reminders: Reminder[];
	dataFeeds: DataFeed[];
	preferences: Preferences;
}

export interface PlanningOption {
	startAt: string;
	endAt: string;
	fit: 'comfortable' | 'possible' | 'rushed';
	reasons: string[];
}

export interface ToolResult<T = unknown> {
	success: boolean;
	summary: string;
	stateRevision: number;
	data?: T;
	affectedIds?: string[];
	warnings?: string[];
	needsUserConfirmation?: boolean;
	nextSuggestedAction?: string;
}

export type AppView = 'today' | 'week' | 'attention' | 'food' | 'support' | 'history';

export interface UiState {
	view: AppView;
	selectedDate: string;
	selectedCommitmentId?: string;
	selectedAttentionId?: string;
	activePlanId?: string;
	highlightedCommitmentIds: string[];
	showRouteForId?: string;
	announcement: string;
}
