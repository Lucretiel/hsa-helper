import type { EventType } from "../services/types";

export interface FilterState {
  eventTypes: EventType[];
  startDate: string | null;
  endDate: string | null;
}

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const toggleEventType = (type: EventType) => {
    const types = filters.eventTypes.includes(type)
      ? filters.eventTypes.filter((t) => t !== type)
      : [...filters.eventTypes, type];
    onFiltersChange({ ...filters, eventTypes: types });
  };

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>Type</label>
        <div className="checkbox-group">
          {(["expense", "withdrawal", "deposit"] as const).map((type) => (
            <label key={type} className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.eventTypes.includes(type)}
                onChange={() => toggleEventType(type)}
              />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </label>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label htmlFor="filter-start">From</label>
        <input
          id="filter-start"
          type="date"
          value={filters.startDate ?? ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              startDate: e.target.value || null,
            })
          }
        />
      </div>

      <div className="filter-group">
        <label htmlFor="filter-end">To</label>
        <input
          id="filter-end"
          type="date"
          value={filters.endDate ?? ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              endDate: e.target.value || null,
            })
          }
        />
      </div>
    </div>
  );
}
