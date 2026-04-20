import { Projection } from "../types";

interface Props {
  projection: Projection;
  currency: string;
}

export default function BudgetOverview({ projection, currency }: Props) {
  const sym = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";

  return (
    <div className="card">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Spending by category</h2>
      {projection.categories.length === 0 ? (
        <p className="text-sm text-gray-500">No transactions this month.</p>
      ) : (
        <ul className="space-y-3">
          {projection.categories
            .sort((a, b) => b.total - a.total)
            .map((cat) => {
              const pct = cat.monthly_limit ? Math.min(100, (cat.total / cat.monthly_limit) * 100) : null;
              const over = cat.monthly_limit ? cat.total > cat.monthly_limit : false;
              return (
                <li key={cat.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span className="font-medium text-gray-800">{cat.name}</span>
                    </span>
                    <span className={over ? "text-red-600 font-semibold" : "text-gray-700"}>
                      {sym}{cat.total.toFixed(2)}
                      {cat.monthly_limit && (
                        <span className="text-gray-400 font-normal"> / {sym}{cat.monthly_limit.toFixed(2)}</span>
                      )}
                    </span>
                  </div>
                  {pct !== null && (
                    <div className="h-1.5 rounded-full bg-gray-100">
                      <div
                        className={`h-1.5 rounded-full transition-all ${over ? "bg-red-500" : ""}`}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: over ? undefined : cat.color,
                        }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
