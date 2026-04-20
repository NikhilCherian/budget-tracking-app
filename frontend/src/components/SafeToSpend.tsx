import { Projection } from "../types";

const config = {
  green:   { bg: "bg-green-50",  border: "border-green-200", text: "text-green-700",  dot: "bg-green-500",  label: "On track",      msg: "You're spending at a sustainable pace." },
  amber:   { bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-700",  dot: "bg-amber-500",  label: "Watch out",     msg: "You're close to your monthly limit." },
  red:     { bg: "bg-red-50",    border: "border-red-200",   text: "text-red-700",    dot: "bg-red-500",    label: "Over budget",   msg: "At this rate you'll exceed your budget." },
  unknown: { bg: "bg-gray-50",   border: "border-gray-200",  text: "text-gray-600",   dot: "bg-gray-400",   label: "No budget set", msg: "Set a monthly budget to see your projection." },
};

interface Props {
  projection: Projection;
  currency: string;
}

export default function SafeToSpend({ projection, currency }: Props) {
  const c = config[projection.signal];
  const sym = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";

  return (
    <div className={`card border ${c.border} ${c.bg}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 inline-block h-3 w-3 rounded-full ${c.dot} flex-shrink-0`} />
        <div>
          <p className={`font-semibold ${c.text}`}>{c.label}</p>
          <p className="text-sm text-gray-600 mt-0.5">{c.msg}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
        <Stat label="Spent so far" value={`${sym}${projection.total_spent.toFixed(2)}`} />
        <Stat label="Daily rate" value={`${sym}${projection.daily_rate.toFixed(2)}/day`} />
        <Stat label="Projected total" value={`${sym}${projection.projected_total.toFixed(2)}`} />
        {projection.remaining_budget !== null && (
          <Stat
            label="Remaining"
            value={`${sym}${projection.remaining_budget.toFixed(2)}`}
            warn={projection.remaining_budget < 0}
          />
        )}
      </div>

      {projection.budget_limit && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Budget used</span>
            <span>{Math.min(100, Math.round((projection.total_spent / projection.budget_limit) * 100))}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200">
            <div
              className={`h-2 rounded-full transition-all ${
                projection.signal === "green" ? "bg-green-500" :
                projection.signal === "amber" ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${Math.min(100, (projection.total_spent / projection.budget_limit) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className={`font-semibold ${warn ? "text-red-600" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
