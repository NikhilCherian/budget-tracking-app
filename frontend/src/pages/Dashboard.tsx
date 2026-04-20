import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { Category, Projection, Transaction } from "../types";
import api from "../lib/api";
import Layout from "../components/Layout";
import SafeToSpend from "../components/SafeToSpend";
import BudgetOverview from "../components/BudgetOverview";
import TransactionList from "../components/TransactionList";
import ExpenseForm from "../components/ExpenseForm";
import { PlusIcon, ShareIcon } from "@heroicons/react/24/outline";

export default function Dashboard() {
  const { user } = useAuth();
  const { household, loading: hhLoading } = useHousehold(user?.id);
  const navigate = useNavigate();

  const [projection, setProjection] = useState<Projection | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [inviteToken, setInviteToken] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const currentMonth = format(new Date(), "yyyy-MM");

  const loadData = async () => {
    const [projRes, txRes, catRes] = await Promise.all([
      api.get<Projection>("/insights/projection"),
      api.get<Transaction[]>(`/transactions?month=${currentMonth}`),
      api.get<Category[]>("/categories"),
    ]);
    setProjection(projRes.data);
    setTransactions(txRes.data.slice(0, 10));
    setCategories(catRes.data);
  };

  useEffect(() => {
    if (!hhLoading && !household) navigate("/setup");
  }, [hhLoading, household]);

  useEffect(() => {
    if (household) loadData();
  }, [household]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await api.post<{ token: string }>(`/households/invite?email=${encodeURIComponent(inviteEmail)}`);
    setInviteToken(data.token);
  };

  const currency = household?.currency ?? "GBP";

  if (hhLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {format(new Date(), "MMMM yyyy")}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{household?.name}</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary gap-1.5"
          >
            <PlusIcon className="h-4 w-4" />
            Add expense
          </button>
        </div>

        {/* Quick add form */}
        {showForm && (
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900 mb-4">New expense</h3>
            <ExpenseForm
              categories={categories}
              currency={currency}
              onSuccess={() => { setShowForm(false); loadData(); }}
            />
          </div>
        )}

        {/* Safe-to-spend */}
        {projection && <SafeToSpend projection={projection} currency={currency} />}

        {/* Category breakdown */}
        {projection && <BudgetOverview projection={projection} currency={currency} />}

        {/* Recent transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-gray-900">Recent expenses</h2>
            <button onClick={() => navigate("/transactions")} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all
            </button>
          </div>
          <TransactionList transactions={transactions} currency={currency} onDelete={loadData} />
        </div>

        {/* Invite partner */}
        {household && household.members.length < 2 && (
          <div className="card border border-primary-100 bg-primary-50">
            <div className="flex items-center gap-2 mb-3">
              <ShareIcon className="h-5 w-5 text-primary-600" />
              <h3 className="text-sm font-semibold text-primary-700">Invite your partner</h3>
            </div>
            {inviteToken ? (
              <div>
                <p className="text-xs text-gray-600 mb-1">Share this token with your partner:</p>
                <code className="block bg-white rounded-lg px-3 py-2 text-sm font-mono break-all border border-gray-200">
                  {inviteToken}
                </code>
                <p className="text-xs text-gray-400 mt-1">They'll need to sign up then enter this on the Setup page.</p>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="flex gap-2">
                <input
                  type="email"
                  className="input flex-1 text-sm"
                  placeholder="partner@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
                <button type="submit" className="btn-primary text-sm">Invite</button>
              </form>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
