import type { EventType, HsaEvent } from "../services/types";
import { EventCard } from "./EventCard";
import type { FilterState } from "./FilterBar";

interface EventListProps {
	events: HsaEvent[];
	filters?: FilterState;
	hasAnyEvents: boolean;
	onViewReceipt: (receiptId: string) => void;
	onDeleteEvent: (id: string) => void;
}

function formatTypeList(types: EventType[]): string {
	if (types.length === 1) {
		return `${types[0]}s`;
	}
	if (types.length === 2) {
		return `${types[0]}s or ${types[1]}s`;
	}
	return `${types.slice(0, -1).join("s, ")}s, or ${types[types.length - 1]}s`;
}

function formatDate(dateStr: string): string {
	const date = new Date(`${dateStr}T00:00:00`);
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function getEmptyMessage(
	filters: FilterState | undefined,
	hasAnyEvents: boolean,
): { title: string; subtitle: string } {
	if (!hasAnyEvents) {
		return {
			title: "No events recorded yet.",
			subtitle:
				'Click "Add Event" to record an expense, withdrawal, or deposit.',
		};
	}

	// Has events but filters are hiding them
	const typeLabel =
		filters?.eventTypes && filters.eventTypes.length > 0
			? formatTypeList(filters.eventTypes)
			: "events";

	let dateClause = "";
	if (filters?.startDate && filters?.endDate) {
		dateClause = ` between ${formatDate(filters.startDate)} and ${formatDate(filters.endDate)}`;
	} else if (filters?.startDate) {
		dateClause = ` after ${formatDate(filters.startDate)}`;
	} else if (filters?.endDate) {
		dateClause = ` before ${formatDate(filters.endDate)}`;
	}

	return {
		title: `No ${typeLabel} found${dateClause}.`,
		subtitle: "Try adjusting your filters.",
	};
}

export function EventList({
	events,
	filters,
	hasAnyEvents,
	onDeleteEvent,
	onViewReceipt,
}: EventListProps) {
	if (events.length === 0) {
		const { title, subtitle } = getEmptyMessage(filters, hasAnyEvents);
		return (
			<div className="empty-state">
				<p>{title}</p>
				<p>{subtitle}</p>
			</div>
		);
	}

	const sortedEvents = [...events].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);

	return (
		<div className="event-list">
			{sortedEvents.map((event) => {
				const id = event.id;
				const receiptId = event.receiptId;
				const viewReceipt = receiptId
					? () => onViewReceipt(receiptId)
					: undefined;
				const deleteEvent = () => onDeleteEvent(id);

				return (
					<EventCard
						key={id}
						event={event}
						onViewReceipt={viewReceipt}
						onDeleteEvent={deleteEvent}
					/>
				);
			})}
		</div>
	);
}
