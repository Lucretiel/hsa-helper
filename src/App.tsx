import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import { DropboxAuth } from "./components/DropboxAuth";
import { EventForm } from "./components/EventForm";
import { EventList } from "./components/EventList";
import { FilterBar, type FilterState } from "./components/FilterBar";
import { Layout } from "./components/Layout";
import { PdfViewer } from "./components/PdfViewer";
import { useEvents } from "./hooks/useEvents";

type AuthState = "loading" | "authenticated" | "unauthenticated";

function App() {
	const [authState, setAuthState] = useState<AuthState>("loading");
	const isAuthenticated = authState === "authenticated";
	const { events, addEvent, isLoading, deleteEvent } =
		useEvents(isAuthenticated);
	const [showForm, setShowForm] = useState(false);
	const [viewingReceiptId, setViewingReceiptId] = useState<string | null>(null);
	const [filters, setFilters] = useState<FilterState>({
		eventTypes: [],
		startDate: null,
		endDate: null,
	});

	useEffect(() => {
		const unlisten = listen<boolean>("auth-state-changed", (event) => {
			setAuthState(event.payload ? "authenticated" : "unauthenticated");
		});
		return () => {
			unlisten.then((fn) => fn());
		};
	}, []);

	const handleLogout = useCallback(async () => {
		try {
			await invoke("logout");
		} catch (err) {
			console.error("Logout failed:", err);
		}
	}, []);

	const filteredEvents = events.filter((event) => {
		if (
			filters.eventTypes.length > 0 &&
			!filters.eventTypes.includes(event.type)
		) {
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

	if (authState === "loading") {
		return (
			<Layout events={[]}>
				<div className="loading">Connecting...</div>
			</Layout>
		);
	}

	if (authState === "unauthenticated") {
		return (
			<Layout events={[]}>
				<DropboxAuth />
			</Layout>
		);
	}

	const headerActions = (
		<>
			<button
				type="button"
				className="btn btn-primary"
				onClick={() => setShowForm(!showForm)}
			>
				{showForm ? "Cancel" : "Add Event"}
			</button>
			<button
				type="button"
				className="btn btn-secondary"
				onClick={handleLogout}
			>
				Sign Out
			</button>
		</>
	);

	return (
		<Layout events={events} headerAction={headerActions}>
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
						onDeleteEvent={deleteEvent}
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
