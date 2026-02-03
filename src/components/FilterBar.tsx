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

	const handleStartDateChange = (value: string) => {
		const newStart = value || null;
		// If new start date is after end date, clear end date
		if (newStart && filters.endDate && newStart > filters.endDate) {
			onFiltersChange({ ...filters, startDate: newStart, endDate: null });
		} else {
			onFiltersChange({ ...filters, startDate: newStart });
		}
	};

	const handleEndDateChange = (value: string) => {
		const newEnd = value || null;
		// If new end date is before start date, clear start date
		if (newEnd && filters.startDate && newEnd < filters.startDate) {
			onFiltersChange({ ...filters, startDate: null, endDate: newEnd });
		} else {
			onFiltersChange({ ...filters, endDate: newEnd });
		}
	};

	return (
		<div className="filter-bar">
			<div className="filter-group">
				<span className="filter-label">Type</span>
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
				<div className="date-filter-input">
					<input
						id="filter-start"
						type="date"
						value={filters.startDate ?? ""}
						max={filters.endDate ?? undefined}
						onChange={(e) => handleStartDateChange(e.target.value)}
					/>
					{filters.startDate && (
						<button
							type="button"
							className="btn-clear"
							onClick={() => onFiltersChange({ ...filters, startDate: null })}
							title="Clear start date"
						>
							×
						</button>
					)}
				</div>
			</div>

			<div className="filter-group">
				<label htmlFor="filter-end">To</label>
				<div className="date-filter-input">
					<input
						id="filter-end"
						type="date"
						value={filters.endDate ?? ""}
						min={filters.startDate ?? undefined}
						onChange={(e) => handleEndDateChange(e.target.value)}
					/>
					{filters.endDate && (
						<button
							type="button"
							className="btn-clear"
							onClick={() => onFiltersChange({ ...filters, endDate: null })}
							title="Clear end date"
						>
							×
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
