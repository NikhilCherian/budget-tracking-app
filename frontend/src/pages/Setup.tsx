import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function Setup() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [budget, setBudget] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/households", {
        name,
        currency,
        monthly_budget: budget ? parseFloat(budget) : null,
      });
      navigate("/dashboard");
    } catch {
      setError("Failed to create household. Please try again.");
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post(`/households/join/${token.trim()}`);
      navigate("/dashboard");
    } catch {
      setError("Invalid or expired invite token.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">Twospend</h1>
          <p className="text-gray-500 mt-1">Let's get you set up</p>
        </div>

        <div className="card">
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${tab === "create" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
              onClick={() => setTab("create")}
            >
              Create household
            </button>
            <button
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${tab === "join" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
              onClick={() => setTab("join")}
            >
              Join household
            </button>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

          {tab === "create" ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Household name</label>
                <input type="text" className="input" placeholder="e.g. Alex & Sam's budget"
                  value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Currency</label>
                <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
              <div>
                <label className="label">Monthly budget (optional)</label>
                <input type="number" min="1" step="0.01" className="input" placeholder="e.g. 2500"
                  value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Creating…" : "Create & get started"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <p className="text-sm text-gray-500">Ask your partner for their invite token.</p>
              <div>
                <label className="label">Invite token</label>
                <input type="text" className="input font-mono" placeholder="Paste token here"
                  value={token} onChange={(e) => setToken(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Joining…" : "Join household"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
