import { useState, useCallback } from "react";
import { Layout } from "./components/Layout";
import { EventList } from "./components/EventList";
import { EventForm } from "./components/EventForm";
import { FilterBar, type FilterState } from "./components/FilterBar";
import { DropboxAuth } from "./components/DropboxAuth";
import { PdfViewer } from "./components/PdfViewer";
import { useEvents } from "./hooks/useEvents";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { events, addEvent, isLoading, refresh } = useEvents();
  const [showForm, setShowForm] = useState(false);
  const [viewingReceiptId, setViewingReceiptId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    eventTypes: [],
    startDate: null,
    endDate: null,
  });

  const handleAuthenticated = useCallback(() => {
    setIsAuthenticated(true);
    refresh();
  }, [refresh]);

  const filteredEvents = events.filter((event) => {
    if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.type)) {
      return false;
    }
    if (filters.startDate && event.date < filters.startDate) {
      return false;
    }
    if (filters.endDate && event.date > filters.endDate) {
      return false;
    }
    return true;
  });

  if (!isAuthenticated) {
    return (
      <Layout events={[]}>
        <DropboxAuth onAuthenticated={handleAuthenticated} />
      </Layout>
    );
  }

  const addEventButton = (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => setShowForm(!showForm)}
    >
      {showForm ? "Cancel" : "Add Event"}
    </button>
  );

  return (
    <Layout events={events} headerAction={addEventButton}>
      <div className="app-content">
        {showForm && (
          <EventForm
            onSubmit={async (event) => {
              await addEvent(event);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {events.length > 0 && (
          <FilterBar filters={filters} onFiltersChange={setFilters} />
        )}

        {isLoading ? (
          <div className="loading">Loading events...</div>
        ) : (
          <EventList
            events={filteredEvents}
            filters={filters}
            hasAnyEvents={events.length > 0}
            onViewReceipt={setViewingReceiptId}
          />
        )}
      </div>

      {viewingReceiptId && (
        <PdfViewer
          receiptId={viewingReceiptId}
          onClose={() => setViewingReceiptId(null)}
        />
      )}
    </Layout>
  );
}

export default App;
