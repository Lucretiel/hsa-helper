import { useState, useEffect, useCallback } from "react";
import type { HsaEvent, NewEvent } from "../services/types";
import * as tauri from "../services/tauri";

export function useEvents() {
  const [events, setEvents] = useState<HsaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    loadEvents();
  }, [loadEvents]);

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
