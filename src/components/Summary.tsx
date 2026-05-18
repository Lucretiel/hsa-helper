import { useMemo, useState } from "react";
import type { HsaEvent } from "../services/types";
import { formatCents } from "../services/types";

interface SummaryProps {
	events: HsaEvent[];
}

export function Summary({ events }: SummaryProps) {
	const currentYear = String(new Date().getFullYear());
	const [depositYear, setDepositYear] = useState<string>(currentYear);

	const depositYears = useMemo(() => {
		const years = new Set(
			events
				.filter((e) => e.type === "deposit")
				.map((e) => e.date.slice(0, 4)),
		);
		years.add(currentYear);
		return [...years].sort().reverse();
	}, [events, currentYear]);

	const totalExpenses = events
		.filter((e) => e.type === "expense")
		.reduce((sum, e) => sum + e.amountCents, 0);

	const totalWithdrawals = events
		.filter((e) => e.type === "withdrawal")
		.reduce((sum, e) => sum + e.amountCents, 0);

	const totalDeposits = events
		.filter((e) => e.type === "deposit" && e.date.startsWith(depositYear))
		.reduce((sum, e) => sum + e.amountCents, 0);

	const unfilledExpenses = totalExpenses - totalWithdrawals;

	return (
		<div className="summary">
			<div className="summary-item">
				<span className="summary-label">Total Expenses</span>
				<span className="summary-value">{formatCents(totalExpenses)}</span>
			</div>
			<div className="summary-item">
				<span className="summary-label">Total Withdrawals</span>
				<span className="summary-value">{formatCents(totalWithdrawals)}</span>
			</div>
			<div className="summary-item">
				<span className="summary-label">
					Deposits{" "}
					<select
						className="year-select"
						value={depositYear}
						onChange={(e) => setDepositYear(e.target.value)}
					>
						{depositYears.map((y) => (
							<option key={y} value={y}>
								{y}
							</option>
						))}
					</select>
				</span>
				<span className="summary-value">{formatCents(totalDeposits)}</span>
			</div>
			<div className="summary-item">
				<span className="summary-label">Unfilled Expenses</span>
				<span
					className={`summary-value ${unfilledExpenses > 0 ? "positive" : ""}`}
				>
					{formatCents(unfilledExpenses)}
				</span>
			</div>
		</div>
	);
}
