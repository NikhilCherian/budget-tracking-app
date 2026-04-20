# Twospend

> Spend together. Stress less.

Twospend is a free, open-source budget tracking web app built for couples. Log daily expenses manually or upload your bank statement PDF, set shared spending categories, and get a clear picture of whether you are on track for the month — together.

No subscriptions. No bank linking. No data sold. Just two people, one shared dashboard, and financial peace of mind.

---

## Features

### Core Tracking

- **Manual expense entry** — add any transaction in seconds with amount, category, date, and a note
- **Bank PDF import** — upload a statement PDF and let the app extract transactions automatically (no bank credentials required)
- **Spending categories** — Food, Rent, Transport, Health, Entertainment, Subscriptions, and custom categories you define
- **Budget overview** — live remaining balance per category and overall, updated as you log

### Predictive Insights

- **Month-end projection** — "If you keep spending at this rate, you will have £X left by the end of the month"
- **Safe-to-spend indicator** — a simple green / amber / red signal tells you at a glance whether your current pace is sustainable
- **Category alerts** — get an in-app warning when a category approaches its limit

### Built for Couples

- **Shared household** — one account per couple; both partners see the same real-time data
- **Who paid?** — tag each expense to one partner for transparency
- **Shared goals** — set savings targets (holiday, furniture, emergency fund) and track progress together
- **Email verification** — secure sign-up with email + password; no third-party OAuth dependency

---

## Tech Stack

All tiers used are permanently free for small-scale personal use.

| Layer | Technology | Free Tier |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind CSS | Static files — no server cost |
| Backend | Python 3.12 + FastAPI | Render.com (750 hrs/month) |
| Database | Supabase (PostgreSQL) | 500 MB + unlimited API calls |
| Auth | Supabase Auth | Email/password + email verification included |
| PDF Parsing | pdfplumber | Runs inside the backend — no API cost |
| Frontend Hosting | Vercel | Free CDN + automatic HTTPS |
| Backend Hosting | Render.com | Free web service (spins down when idle) |

### Why Supabase for Auth + DB?

Supabase's Row Level Security (RLS) lets us encode the couple relationship directly in Postgres policy. Each couple shares a `household_id`; Postgres enforces that no user can read or write another household's data — no application-level guard code required. This keeps the backend thin and the security model auditable.

---

## Architecture

```
Browser (Vercel)
      │
      │  HTTPS / REST + JSON
      ▼
FastAPI backend (Render.com)
      │                  │
      │                  │  PDF uploaded as multipart
      │                  ▼
      │           pdfplumber
      │           (extracts rows)
      │                  │
      └──────────────────┤
                         ▼
                  Supabase (Postgres)
                  ┌──────────────────┐
                  │  households      │
                  │  users           │
                  │  categories      │
                  │  transactions    │
                  │  budgets         │
                  │  goals           │
                  └──────────────────┘
                  Supabase Auth sits
                  in front of all table
                  access (JWT + RLS)
```

The frontend calls the FastAPI backend for all mutations and the predictive engine. Read-heavy display data (transaction list, category totals) can optionally be fetched from Supabase directly via the JS client to reduce backend load.

---

## Database Schema (planned)

```sql
-- One row per couple
households (id, name, created_at)

-- One row per person; linked to a household
users (id, household_id, email, display_name, created_at)

-- Built-in + user-defined categories per household
categories (id, household_id, name, icon, monthly_limit, color)

-- Every expense
transactions (
  id, household_id, user_id, category_id,
  amount, currency, description, date,
  source,   -- 'manual' | 'pdf_import'
  created_at
)

-- Monthly budget snapshots
budgets (id, household_id, month, total_limit)

-- Shared savings targets
goals (id, household_id, name, target_amount, current_amount, deadline)
```

---

## Getting Started

> Full setup instructions will be added once the initial codebase is committed. The steps below are the intended developer flow.

### Prerequisites

- Node.js 20+
- Python 3.12+
- A free [Supabase](https://supabase.com) project
- A free [Render.com](https://render.com) account (for deployment)
- A free [Vercel](https://vercel.com) account (for deployment)

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/nikhilcherian/budget-tracking-app.git
cd budget-tracking-app

# 2. Backend setup
cd backend
cp .env.example .env          # fill in SUPABASE_URL and SUPABASE_SERVICE_KEY
pip install -r requirements.txt
uvicorn main:app --reload

# 3. Frontend setup (new terminal)
cd frontend
cp .env.example .env          # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open `http://localhost:5173`. The backend runs on `http://localhost:8000`.

---

## Roadmap

### Phase 1 — MVP (in progress)

- [ ] Project scaffolding (frontend + backend + DB migrations)
- [ ] Supabase Auth: sign up, email verification, login, logout
- [ ] Household creation and partner invite flow
- [ ] Manual transaction entry with categories
- [ ] Budget overview dashboard (remaining per category + total)
- [ ] Basic month-end projection (linear spend rate)

### Phase 2 — PDF Import + Smarter Insights

- [ ] PDF upload endpoint (pdfplumber extraction)
- [ ] Automatic category suggestion from transaction description
- [ ] Safe-to-spend traffic-light indicator
- [ ] Category overspend alerts (in-app)
- [ ] Historical month-over-month comparison chart

### Phase 3 — Couple Experience + Polish

- [ ] Shared savings goals with progress bar
- [ ] "Who paid?" attribution and split summaries
- [ ] Email notifications (weekly digest, budget alerts)
- [ ] Progressive Web App (PWA) — installable on mobile
- [ ] Dark mode
- [ ] CSV export

---

## Contributing

Contributions are very welcome. This project is deliberately kept simple: **no paid services, no complex infrastructure, no vendor lock-in**. Before opening a PR, please check that your change does not introduce a dependency that requires a paid account.

### How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes with a clear message
4. Open a pull request describing what you changed and why

### Good First Issues

Look for issues labelled `good first issue` — these are self-contained tasks suitable for getting familiar with the codebase.

### Code Style

- **Python**: Black formatter, Ruff linter (`ruff check .`)
- **TypeScript/JSX**: ESLint + Prettier (config included in repo)
- Write tests for any new backend endpoint

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

*Built with care for couples who want clarity, not complexity.*
