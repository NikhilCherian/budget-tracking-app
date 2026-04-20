import { Transaction } from "../types";
import { TrashIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import api from "../lib/api";

interface Props {
  transactions: Transaction[];
  currency: string;
  onDelete: () => void;
}

export default function TransactionList({ transactions, currency, onDelete }: Props) {
  const sym = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await api.delete(`/transactions/${id}`);
    onDelete();
  };

  if (transactions.length === 0) {
    return <p className="text-sm text-gray-500 py-8 text-center">No expenses yet — add one above or import a PDF.</p>;
  }

  let lastDate = "";

  return (
    <ul className="space-y-1">
      {transactions.map((tx) => {
        const dateLabel = format(new Date(tx.date), "EEEE, d MMMM yyyy");
        const showDate = dateLabel !== lastDate;
        lastDate = dateLabel;

        return (
          <li key={tx.id}>
            {showDate && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-4 pb-1 px-1">
                {dateLabel}
              </p>
            )}
            <div className="flex items-center gap-3 rounded-lg hover:bg-gray-50 px-2 py-2 group transition-colors">
              <span className="text-xl w-8 text-center">{tx.categories?.icon ?? "💰"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                <p className="text-xs text-gray-400">
                  {tx.categories?.name ?? "Uncategorised"}
                  {tx.profiles && <> · {tx.profiles.display_name}</>}
                  {tx.source === "pdf_import" && <span className="ml-1 text-indigo-400">· PDF import</span>}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">
                {sym}{Number(tx.amount).toFixed(2)}
              </span>
              <button
                onClick={() => handleDelete(tx.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                title="Delete"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
