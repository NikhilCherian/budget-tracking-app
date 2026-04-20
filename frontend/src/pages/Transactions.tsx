import { useEffect, useState } from "react";
import { format, sub } from "date-fns";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { Category, Transaction } from "../types";
import api from "../lib/api";
import Layout from "../components/Layout";
import TransactionList from "../components/TransactionList";
import ExpenseForm from "../components/ExpenseForm";
import PdfUpload from "../components/PdfUpload";
import { PlusIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";

type Tab = "list" | "add" | "pdf";

export default function Transactions() {
  const { user } = useAuth();
  const { household } = useHousehold(user?.id);
  const [tab, setTab] = useState<Tab>("list");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [toast, setToast] = useState("");

  const loadData = async () => {
    const [txRes, catRes] = await Promise.all([
      api.get<Transaction[]>(`/transactions?month=${month}`),
      api.get<Category[]>("/categories"),
    ]);
    setTransactions(txRes.data);
    setCategories(catRes.data);
  };

  useEffect(() => { if (household) loadData(); }, [household, month]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const currency = household?.currency ?? "GBP";

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = sub(new Date(), { months: i });
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 bg-green-600 text-white rounded-lg px-4 py-2 text-sm shadow-lg z-50">
            {toast}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <select
            className="input w-auto text-sm"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("list")}
            className={tab === "list" ? "btn-primary text-sm" : "btn-secondary text-sm"}
          >
            All expenses
          </button>
          <button
            onClick={() => setTab("add")}
            className={tab === "add" ? "btn-primary text-sm gap-1" : "btn-secondary text-sm gap-1"}
          >
            <PlusIcon className="h-4 w-4" /> Add manually
          </button>
          <button
            onClick={() => setTab("pdf")}
            className={tab === "pdf" ? "btn-primary text-sm gap-1" : "btn-secondary text-sm gap-1"}
          >
            <ArrowUpTrayIcon className="h-4 w-4" /> Import PDF
          </button>
        </div>

        {tab === "add" && (
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Add expense</h2>
            <ExpenseForm
              categories={categories}
              currency={currency}
              onSuccess={() => { setTab("list"); loadData(); showToast("Expense added!"); }}
            />
          </div>
        )}

        {tab === "pdf" && (
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Import bank statement</h2>
            <p className="text-sm text-gray-500 mb-4">
              Upload a PDF bank statement. Works with text-based PDFs — not scanned images.
            </p>
            <PdfUpload
              onSuccess={(count) => {
                setTab("list");
                loadData();
                showToast(`${count} transaction${count !== 1 ? "s" : ""} imported!`);
              }}
            />
          </div>
        )}

        {tab === "list" && (
          <div className="card">
            <TransactionList transactions={transactions} currency={currency} onDelete={loadData} />
          </div>
        )}
      </div>
    </Layout>
  );
}
