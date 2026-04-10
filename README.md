# PlateIQ

PWA workout tracker for Jim Wendler's 5/3/1 strength program. Log main lifts and accessories, track personal records and estimated 1RMs, and get AI-powered insights on your training trends. Install on your iPhone home screen — works offline at the gym.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend + PWA | Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui, TanStack Query v5, Zustand |
| Auth | Supabase Auth (Google OAuth, 50K MAU free) |
| Database + API | Supabase PostgreSQL + PostgREST + RLS (500 MB free) |
| Business Logic | Next.js API routes + PostgreSQL functions (RPC) |
| AI | Google Gemini 2.0 Flash (1,500 req/day free) |
| Offline | TanStack Query mutation persistence + service worker (IndexedDB) |
| Hosting | Vercel Free (frontend + API routes) + Supabase Free (DB + Auth) |
| CI/CD | GitHub Actions + Vercel auto-deploy |

## Repository Structure

```
plateiq/
├── docs/
│   ├── architecture.md         ← complete system architecture blueprint (start here)
│   └── implementation-plan.md  ← 12-stage implementation plan
├── src/
│   └── frontend/               ← Next.js application (the only codebase)
├── supabase/                   ← Supabase migrations + config (created by supabase init)
├── .github/
│   └── workflows/
│       └── deploy.yml          ← CI/CD pipeline
└── data/                       ← seed data / reference files
```

## Getting Started

See [docs/architecture.md](docs/architecture.md) for the complete system design, data model, API surface, and deployment guide.

## Key Features

- **5/3/1 Program Generator** — auto-calculates warmup + main sets (% of Training Max) for all 4 weeks per Wendler's guidelines
- **AMRAP Tracking** — logs PR sets, calculates estimated 1RM (Epley + Brzycki), detects personal records automatically
- **Auto-Progression** — applies +5 lb (upper) / +10 lb (lower) TM increment on cycle completion
- **Accessory Logging** — supports BBB, FSL, Joker sets, and freeform accessories
- **AI Training Insights** — weekly/monthly analysis via Gemini: plateau detection, volume trends, program recommendations
- **PR Charts** — estimated 1RM progression over time per lift
- **Multi-template Support** — BBB, First Set Last, Original+, Beyond+
- **Offline Gym Mode** — log sets with no WiFi; syncs automatically when connection returns
- **PWA** — install on iPhone home screen, full-screen, no browser chrome

## Deployment Cost: $0

Two vendors, one language, no credit card required, hard spending caps on everything. See the [scalability growth path](docs/architecture.md#10-scalability-growth-path) for upgrade options when needed.

| Service | Free Tier | Credit Card | Hard Cap |
|---------|-----------|-------------|----------|
| Vercel | 100 GB bandwidth, 100 GB-hrs compute | No | Yes |
| Supabase | 500 MB DB, 50K MAU, 500K Edge invocations | No | Yes |
| Google Gemini | 1,500 req/day | No | Yes |
| GitHub Actions | 2,000 min/month | No | Yes |
