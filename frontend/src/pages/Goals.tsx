import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { Goal } from "../types";
import api from "../lib/api";
import Layout from "../components/Layout";
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

const GOAL_ICONS = ["🎯","✈️","🏠","🚗","💍","🎓","🏋️","🌍","📱","🛋️","🏖️","💰"];
const GOAL_COLORS = ["#10b981","#6366f1","#f97316","#3b82f6","#ec4899","#eab308","#ef4444","#8b5cf6"];

interface GoalForm {
  name: string;
  target_amount: string;
  current_amount: string;
  deadline: string;
  icon: string;
  color: string;
}

const empty: GoalForm = { name: "", target_amount: "", current_amount: "0", deadline: "", icon: "🎯", color: "#10b981" };

export default function Goals() {
  const { user } = useAuth();
  const { household } = useHousehold(user?.id);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState<GoalForm>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<GoalForm>(empty);

  const load = async () => {
    const { data } = await api.get<Goal[]>("/goals");
    setGoals(data);
  };

  useEffect(() => { if (household) load(); }, [household]);

  const currency = household?.currency ?? "GBP";
  const sym = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";

  const createGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/goals", {
      name: newForm.name,
      target_amount: parseFloat(newForm.target_amount),
      current_amount: parseFloat(newForm.current_amount) || 0,
      deadline: newForm.deadline || null,
      icon: newForm.icon,
      color: newForm.color,
    });
    setShowNew(false);
    setNewForm(empty);
    load();
  };

  const saveGoal = async (id: string) => {
    await api.put(`/goals/${id}`, {
      name: editForm.name,
      target_amount: parseFloat(editForm.target_amount),
      current_amount: parseFloat(editForm.current_amount) || 0,
      deadline: editForm.deadline || null,
      icon: editForm.icon,
      color: editForm.color,
    });
    setEditing(null);
    load();
  };

  const deleteGoal = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    await api.delete(`/goals/${id}`);
    load();
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Savings Goals</h1>
          <button onClick={() => setShowNew((v) => !v)} className="btn-primary gap-1.5">
            <PlusIcon className="h-4 w-4" /> New goal
          </button>
        </div>

        {showNew && (
          <div className="card">
            <h3 className="text-base font-semibold mb-4">New goal</h3>
            <form onSubmit={createGoal} className="space-y-3">
              <GoalFields form={newForm} onChange={setNewForm} sym={sym} />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm">Create</button>
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {goals.length === 0 && !showNew && (
          <div className="card text-center py-12">
            <p className="text-3xl mb-2">🎯</p>
            <p className="text-gray-500 text-sm">No goals yet. Set one to start saving together.</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const pct = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
            const done = pct >= 100;
            return (
              <div key={goal.id} className="card">
                {editing === goal.id ? (
                  <form onSubmit={(e) => { e.preventDefault(); saveGoal(goal.id); }} className="space-y-3">
                    <GoalFields form={editForm} onChange={setEditForm} sym={sym} />
                    <div className="flex gap-2">
                      <button type="submit" className="btn-primary text-sm gap-1"><CheckIcon className="h-4 w-4" />Save</button>
                      <button type="button" onClick={() => setEditing(null)} className="btn-secondary text-sm gap-1"><XMarkIcon className="h-4 w-4" />Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{goal.icon}</span>
                        <div>
                          <p className="font-semibold text-gray-900">{goal.name}</p>
                          {goal.deadline && <p className="text-xs text-gray-400">By {goal.deadline}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(goal.id); setEditForm({ name: goal.name, target_amount: goal.target_amount.toString(), current_amount: goal.current_amount.toString(), deadline: goal.deadline ?? "", icon: goal.icon, color: goal.color }); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteGoal(goal.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">{sym}{goal.current_amount.toFixed(2)} saved</span>
                        <span className="font-semibold text-gray-900">{sym}{goal.target_amount.toFixed(2)}</span>
                      </div>
                      <div className="h-3 rounded-full bg-gray-100">
                        <div className={`h-3 rounded-full transition-all ${done ? "bg-green-500" : ""}`}
                          style={{ width: `${pct}%`, backgroundColor: done ? undefined : goal.color }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1 text-right">{Math.round(pct)}% {done && "🎉 Complete!"}</p>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function GoalFields({ form, onChange, sym }: { form: GoalForm; onChange: (f: GoalForm) => void; sym: string }) {
  return (
    <>
      <div>
        <label className="label">Goal name</label>
        <input className="input" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} required placeholder="e.g. Holiday fund" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Target ({sym})</label>
          <input type="number" min="1" step="0.01" className="input" value={form.target_amount}
            onChange={(e) => onChange({ ...form, target_amount: e.target.value })} required />
        </div>
        <div>
          <label className="label">Saved so far ({sym})</label>
          <input type="number" min="0" step="0.01" className="input" value={form.current_amount}
            onChange={(e) => onChange({ ...form, current_amount: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Deadline (optional)</label>
        <input type="date" className="input" value={form.deadline} onChange={(e) => onChange({ ...form, deadline: e.target.value })} />
      </div>
      <div>
        <label className="label">Icon</label>
        <div className="flex flex-wrap gap-2">
          {GOAL_ICONS.map((icon) => (
            <button key={icon} type="button" onClick={() => onChange({ ...form, icon })}
              className={`text-xl p-1.5 rounded-lg border-2 ${form.icon === icon ? "border-primary-500 bg-primary-50" : "border-transparent hover:bg-gray-100"}`}>
              {icon}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Colour</label>
        <div className="flex gap-2">
          {GOAL_COLORS.map((color) => (
            <button key={color} type="button" onClick={() => onChange({ ...form, color })}
              className={`h-7 w-7 rounded-full border-2 ${form.color === color ? "border-gray-800 scale-110" : "border-transparent"}`}
              style={{ backgroundColor: color }} />
          ))}
        </div>
      </div>
    </>
  );
}
