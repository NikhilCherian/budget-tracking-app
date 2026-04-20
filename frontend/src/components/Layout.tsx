import { NavLink, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  CreditCardIcon,
  TagIcon,
  TrophyIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";

const nav = [
  { to: "/dashboard",    label: "Dashboard",    icon: HomeIcon },
  { to: "/transactions", label: "Transactions", icon: CreditCardIcon },
  { to: "/categories",   label: "Categories",   icon: TagIcon },
  { to: "/goals",        label: "Goals",        icon: TrophyIcon },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-56 flex-col bg-white border-r border-gray-200 px-4 py-6">
        <div className="mb-8 px-2">
          <span className="text-xl font-bold text-primary-600">Twospend</span>
          <p className="text-xs text-gray-400 mt-0.5">Spend together. Stress less.</p>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors mt-4"
        >
          <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
          Sign out
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 px-4 py-6 md:px-8 max-w-5xl w-full mx-auto">
          {children}
        </main>

        {/* Bottom nav (mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                  isActive ? "text-primary-600" : "text-gray-500"
                }`
              }
            >
              <Icon className="h-5 w-5 mb-0.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
