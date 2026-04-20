import { useState } from "react";
import { Category } from "../types";
import api from "../lib/api";

interface Props {
  categories: Category[];
  currency: string;
  onSuccess: () => void;
}

export default function ExpenseForm({ categories, currency, onSuccess }: Props) {
  const sym = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    amount: "",
    description: "",
    date: today,
    category_id: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.amount || !form.description) {
      setError("Amount and description are required.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/transactions", {
        amount: parseFloat(form.amount),
        description: form.description,
        date: form.date,
        category_id: form.category_id || null,
        notes: form.notes || null,
      });
      setForm({ amount: "", description: "", date: today, category_id: "", notes: "" });
      onSuccess();
    } catch {
      setError("Failed to save expense. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Amount ({sym})</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className="input"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <label className="label">Description</label>
        <input
          type="text"
          className="input"
          placeholder="e.g. Weekly shop, Electricity bill"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          required
        />
      </div>

      <div>
        <label className="label">Category</label>
        <select
          className="input"
          value={form.category_id}
          onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
        >
          <option value="">— Uncategorised —</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <input
          type="text"
          className="input"
          placeholder="Any extra detail"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Saving…" : "Add expense"}
      </button>
    </form>
  );
}
