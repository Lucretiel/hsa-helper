export type EventType = "expense" | "withdrawal" | "deposit";

interface BaseEvent {
	id: string;
	date: string; // YYYY-MM-DD
	amountCents: number;
	receiptId: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ExpenseEvent extends BaseEvent {
	type: "expense";
	description: string;
}

export interface WithdrawalEvent extends BaseEvent {
	type: "withdrawal";
}

export interface DepositEvent extends BaseEvent {
	type: "deposit";
}

export type HsaEvent = ExpenseEvent | WithdrawalEvent | DepositEvent;

export interface HsaMetadata {
	version: number;
	lastModified: string;
	syncToken: string | null;
	events: HsaEvent[];
}

export type NewExpense = {
	type: "expense";
	date: string;
	amountCents: number;
	description: string;
	receiptId?: string;
};

export type NewWithdrawal = {
	type: "withdrawal";
	date: string;
	amountCents: number;
	receiptId?: string;
};

export type NewDeposit = {
	type: "deposit";
	date: string;
	amountCents: number;
	receiptId?: string;
};

export type NewEvent = NewExpense | NewWithdrawal | NewDeposit;

export function isExpense(event: HsaEvent): event is ExpenseEvent {
	return event.type === "expense";
}

export function isWithdrawal(event: HsaEvent): event is WithdrawalEvent {
	return event.type === "withdrawal";
}

export function isDeposit(event: HsaEvent): event is DepositEvent {
	return event.type === "deposit";
}

export function formatCents(cents: number): string {
	const dollars = cents / 100;
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(dollars);
}
