import type { HsaEvent } from "../services/types";
import { EventCard } from "./EventCard";

interface EventListProps {
  events: HsaEvent[];
  onViewReceipt?: (receiptId: string) => void;
}

export function EventList({ events, onViewReceipt }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="empty-state">
        <p>No events recorded yet.</p>
        <p>Click "Add Event" to record an expense, withdrawal, or deposit.</p>
      </div>
    );
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="event-list">
      {sortedEvents.map((event) => (
        <EventCard key={event.id} event={event} onViewReceipt={onViewReceipt} />
      ))}
    </div>
  );
}
