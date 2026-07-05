import { useState } from "react";
import type { HsaEvent } from "../services/types";
import { formatCents, isExpense } from "../services/types";

interface EventCardProps {
	event: HsaEvent;
	onViewReceipt?: () => void;
	onDeleteEvent: () => void;
}

export function EventCard({
	event,
	onViewReceipt,
	onDeleteEvent,
}: EventCardProps) {
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
				{event.receiptId && (
					<button
						type="button"
						className="btn btn-icon"
						onClick={onViewReceipt}
						title="View receipt"
					>
						PDF
					</button>
				)}
				<TimedDeleteButton active={true} onClick={onDeleteEvent} />
			</div>
		</div>
	);
}

const TimedDeleteButton = ({
	active,
	onClick,
}: {
	active: boolean;
	onClick: () => void;
}) => {
	const [state, setState] = useState<"idle" | "timing" | "confirming">("idle");
	const [_, setTimer] = useState<number | null>(null);

	const changeState = (state: "idle" | "timing" | "confirming") => {
		setState(state);
		setTimer((id) => {
			if (id != null) clearTimeout(id);
			return null;
		});
	};

	const installTimer = (duration: number, handler: () => void) => {
		setTimer((id) => {
			if (id != null) clearTimeout(id);
			return setTimeout(() => {
				setTimer(null);
				handler();
			}, duration);
		});
	};

	const localClick = () => {
		if (!active) return;

		switch (state) {
			case "idle":
				setState("timing");
				installTimer(2000, () => {
					setState("confirming");
					installTimer(5000, () => changeState("idle"));
				});
				break;
			case "timing":
				break;
			case "confirming":
				onClick();
				changeState("idle");
				break;
		}
	};

	const message = state === "idle" ? "Delete" : "CONFIRM";
	const enabled = (active && state === "idle") || state === "confirming";

	return (
		<button
			className="btn btn-icon"
			onClick={localClick}
			type="button"
			disabled={!enabled}
		>
			{message}
		</button>
	);
};

function formatDate(dateStr: string): string {
	const date = new Date(`${dateStr}T00:00:00`);
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}
