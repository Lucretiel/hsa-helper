import { useState, useRef } from "react";
import type { EventType, NewEvent } from "../services/types";
import { uploadReceipt } from "../services/tauri";

interface EventFormProps {
  onSubmit: (event: NewEvent) => Promise<void>;
  onCancel: () => void;
}

export function EventForm({ onSubmit, onCancel }: EventFormProps) {
  const [type, setType] = useState<EventType>("expense");
  const [date, setDate] = useState(getTodayString());
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setError("Please select a PDF file");
        return;
      }
      setReceiptFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountCents = Math.round(Number.parseFloat(amount) * 100);
    if (Number.isNaN(amountCents) || amountCents <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      let receiptId: string | undefined;

      // Upload receipt if selected
      if (receiptFile) {
        receiptId = crypto.randomUUID();
        const arrayBuffer = await receiptFile.arrayBuffer();
        await uploadReceipt(receiptId, new Uint8Array(arrayBuffer));
      }

      const newEvent: NewEvent =
        type === "expense"
          ? { type, date, amountCents, description, receiptId }
          : { type, date, amountCents, receiptId };

      await onSubmit(newEvent);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <h2>Add New Event</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="event-type">Type</label>
          <select
            id="event-type"
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
          >
            <option value="expense">Expense</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="deposit">Deposit</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="event-date">Date</label>
          <input
            id="event-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="event-amount">Amount ($)</label>
        <input
          id="event-amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      {type === "expense" && (
        <div className="form-group">
          <label htmlFor="event-description">Description</label>
          <input
            id="event-description"
            type="text"
            placeholder="Brief description of the service"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      )}

      <div className="form-group">
        <label htmlFor="event-receipt">Receipt (PDF)</label>
        <div className="file-input-wrapper">
          <input
            ref={fileInputRef}
            id="event-receipt"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
          />
          {receiptFile && (
            <span className="file-name">{receiptFile.name}</span>
          )}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Event"}
        </button>
      </div>
    </form>
  );
}

function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0] ?? "";
}
