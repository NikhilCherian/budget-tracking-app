import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { Category } from "../types";
import api from "../lib/api";
import Layout from "../components/Layout";
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

const COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#10b981","#3b82f6","#6366f1","#8b5cf6","#ec4899","#6b7280"];
const ICONS  = ["🏠","🛒","🍽️","🚌","💊","🎬","📱","🛍️","💡","✈️","🎓","🏋️","💰","🎮","🌿"];

interface EditState {
  name: string;
  icon: string;
  color: string;
  monthly_limit: string;
}

export default function Categories() {
  const { user } = useAuth();
  const { household } = useHousehold(user?.id);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", icon: "💰", color: "#6366f1", monthly_limit: "" });
  const [showNew, setShowNew] = useState(false);
  const [newState, setNewState] = useState<EditState>({ name: "", icon: "💰", color: "#6366f1", monthly_limit: "" });

  const load = async () => {
    const { data } = await api.get<Category[]>("/categories");
    setCategories(data);
  };

  useEffect(() => { if (household) load(); }, [household]);

  const startEdit = (cat: Category) => {
    setEditing(cat.id);
    setEditState({ name: cat.name, icon: cat.icon, color: cat.color, monthly_limit: cat.monthly_limit?.toString() ?? "" });
  };

  const saveEdit = async (id: string) => {
    await api.put(`/categories/${id}`, {
      name: editState.name,
      icon: editState.icon,
      color: editState.color,
      monthly_limit: editState.monthly_limit ? parseFloat(editState.monthly_limit) : null,
    });
    setEditing(null);
    load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Transactions using it will become uncategorised.")) return;
    await api.delete(`/categories/${id}`);
    load();
  };

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/categories", {
      name: newState.name,
      icon: newState.icon,
      color: newState.color,
      monthly_limit: newState.monthly_limit ? parseFloat(newState.monthly_limit) : null,
    });
    setShowNew(false);
    setNewState({ name: "", icon: "💰", color: "#6366f1", monthly_limit: "" });
    load();
  };

  const currency = household?.currency ?? "GBP";
  const sym = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <button onClick={() => setShowNew((v) => !v)} className="btn-primary gap-1.5">
            <PlusIcon className="h-4 w-4" /> New category
          </button>
        </div>

        {showNew && (
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900 mb-4">New category</h3>
            <form onSubmit={createCategory} className="space-y-3">
              <CategoryFields state={newState} onChange={setNewState} sym={sym} />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm">Create</button>
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card divide-y divide-gray-100">
          {categories.map((cat) => (
            <div key={cat.id} className="py-3 first:pt-0 last:pb-0">
              {editing === cat.id ? (
                <div className="space-y-3">
                  <CategoryFields state={editState} onChange={setEditState} sym={sym} />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(cat.id)} className="btn-primary text-sm gap-1">
                      <CheckIcon className="h-4 w-4" /> Save
                    </button>
                    <button onClick={() => setEditing(null)} className="btn-secondary text-sm gap-1">
                      <XMarkIcon className="h-4 w-4" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cat.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{cat.name}</span>
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.is_default && <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">Default</span>}
                    </div>
                    {cat.monthly_limit && (
                      <p className="text-xs text-gray-400">Limit: {sym}{cat.monthly_limit.toFixed(2)}/month</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(cat)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    {!cat.is_default && (
                      <button onClick={() => deleteCategory(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

function CategoryFields({ state, onChange, sym }: {
  state: EditState;
  onChange: (s: EditState) => void;
  sym: string;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Name</label>
          <input className="input" value={state.name} onChange={(e) => onChange({ ...state, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Monthly limit ({sym})</label>
          <input type="number" min="0" step="0.01" className="input" placeholder="No limit"
            value={state.monthly_limit} onChange={(e) => onChange({ ...state, monthly_limit: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Icon</label>
        <div className="flex flex-wrap gap-2">
          {ICONS.map((icon) => (
            <button key={icon} type="button" onClick={() => onChange({ ...state, icon })}
              className={`text-xl p-1.5 rounded-lg border-2 transition-colors ${state.icon === icon ? "border-primary-500 bg-primary-50" : "border-transparent hover:bg-gray-100"}`}>
              {icon}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Colour</label>
        <div className="flex gap-2">
          {COLORS.map((color) => (
            <button key={color} type="button" onClick={() => onChange({ ...state, color })}
              className={`h-7 w-7 rounded-full border-2 transition-transform ${state.color === color ? "border-gray-800 scale-110" : "border-transparent"}`}
              style={{ backgroundColor: color }} />
          ))}
        </div>
      </div>
    </>
  );
}
