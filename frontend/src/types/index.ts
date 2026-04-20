export interface Profile {
  id: string;
  household_id: string | null;
  display_name: string;
  email: string;
  avatar_color: string;
}

export interface Household {
  id: string;
  name: string;
  currency: string;
  monthly_budget: number | null;
  members: Profile[];
}

export interface Category {
  id: string;
  household_id: string;
  name: string;
  icon: string;
  color: string;
  monthly_limit: number | null;
  is_default: boolean;
}

export interface Transaction {
  id: string;
  household_id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  currency: string;
  description: string;
  date: string;
  source: "manual" | "pdf_import";
  notes: string | null;
  created_at: string;
  categories?: Pick<Category, "name" | "icon" | "color"> | null;
  profiles?: Pick<Profile, "display_name" | "avatar_color"> | null;
}

export interface Budget {
  id: string;
  household_id: string;
  month: string;
  total_limit: number;
}

export interface Goal {
  id: string;
  household_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
  color: string;
}

export interface Projection {
  month: string;
  days_elapsed: number;
  days_total: number;
  total_spent: number;
  daily_rate: number;
  projected_total: number;
  budget_limit: number | null;
  remaining_budget: number | null;
  projected_remaining: number | null;
  signal: "green" | "amber" | "red" | "unknown";
  categories: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    monthly_limit: number | null;
    total: number;
  }>;
}
