import type { HsaEvent } from "../services/types";
import { formatCents, isExpense } from "../services/types";

interface EventCardProps {
	event: HsaEvent;
	onViewReceipt?: (receiptId: string) => void;
}

export function EventCard({ event, onViewReceipt }: EventCardProps) {
	const typeLabels = {
		expense: "Expense",
		withdrawal: "Withdrawal",
		deposit: "Deposit",
	};

	return (
		<div className={`event-card ${event.type}`}>
			<div className="event-info">
				<span className="event-type">{typeLabels[event.type]}</span>
				{isExpense(event) && (
					<span className="event-description">{event.description}</span>
				)}
				<span className="event-date">{formatDate(event.date)}</span>
			</div>
			<div className="event-right">
				<div className={`event-amount ${event.type}`}>
					{formatCents(event.amountCents)}
				</div>
				{event.receiptId && onViewReceipt && (
					<button
						type="button"
						className="btn btn-icon"
						onClick={() => onViewReceipt(event.receiptId as string)}
						title="View receipt"
					>
						PDF
					</button>
				)}
			</div>
		</div>
	);
}

function formatDate(dateStr: string): string {
	const date = new Date(`${dateStr}T00:00:00`);
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}
