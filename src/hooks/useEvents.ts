import { useCallback, useEffect, useState } from "react";
import * as tauri from "../services/tauri";
import type { HsaEvent, NewEvent } from "../services/types";

export function useEvents(isAuthenticated: boolean) {
	const [events, setEvents] = useState<HsaEvent[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const loadEvents = useCallback(async () => {
		try {
			setIsLoading(true);
			const loadedEvents = await tauri.getEvents();
			setEvents(loadedEvents);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)));
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (isAuthenticated) {
			loadEvents();
		} else {
			setEvents([]);
		}
	}, [isAuthenticated, loadEvents]);

	const addEvent = useCallback(async (event: NewEvent) => {
		const newEvent = await tauri.addEvent(event);
		setEvents((prev) => [...prev, newEvent]);
		return newEvent;
	}, []);

	const deleteEvent = useCallback(async (id: string) => {
		await tauri.deleteEvent(id);
		setEvents((prev) => prev.filter((e) => e.id !== id));
	}, []);

	return {
		events,
		isLoading,
		error,
		addEvent,
		deleteEvent,
		refresh: loadEvents,
	};
}
