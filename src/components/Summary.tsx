import type { HsaEvent } from "../services/types";
import { formatCents } from "../services/types";

interface SummaryProps {
  events: HsaEvent[];
}

export function Summary({ events }: SummaryProps) {
  const totalExpenses = events
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amountCents, 0);

  const totalWithdrawals = events
    .filter((e) => e.type === "withdrawal")
    .reduce((sum, e) => sum + e.amountCents, 0);

  const totalDeposits = events
    .filter((e) => e.type === "deposit")
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
        <span className="summary-label">Total Deposits</span>
        <span className="summary-value">{formatCents(totalDeposits)}</span>
      </div>
      <div className="summary-item">
        <span className="summary-label">Unfilled Expenses</span>
        <span className={`summary-value ${unfilledExpenses > 0 ? "positive" : ""}`}>
          {formatCents(unfilledExpenses)}
        </span>
      </div>
    </div>
  );
}
