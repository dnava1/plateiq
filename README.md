# PlateIQ

PWA strength training tracker supporting 15+ popular programs — from Starting Strength and StrongLifts for beginners, through 5/3/1 and nSuns for intermediates, to Conjugate and Sheiko for advanced lifters — plus fully custom user-defined programs. Track personal records, visualize progress with interactive charts, and get AI-powered coaching insights. Install on your iPhone home screen — works offline at the gym.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend + PWA | Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui, TanStack Query v5, Zustand |
| Auth | Supabase Auth (Google OAuth, 50K MAU free) |
| Database + API | Supabase PostgreSQL + PostgREST + RLS (500 MB free) |
| Business Logic | Next.js API routes + PostgreSQL functions (RPC) |
| Charts | Recharts (line, bar, radar, scatter, heatmap) |
| AI | Google Gemini 2.0 Flash (1,500 req/day free) |
| Offline | TanStack Query mutation persistence + service worker (IndexedDB) |
| Hosting | Vercel Free (frontend + API routes) + Supabase Free (DB + Auth) |
| CI/CD | GitHub Actions + Vercel auto-deploy |

## Repository Structure

```
plateiq/
├── apps/
│   └── web/                    ← Next.js application
├── docs/
│   ├── architecture.md         ← complete system architecture blueprint (start here)
│   └── implementation-plan.md  ← staged delivery plan
├── supabase/
│   └── migrations/             ← versioned database changes
├── .github/
│   └── workflows/
│       └── deploy.yml          ← CI/CD pipeline
└── data/                       ← seed data / reference files
```

## Getting Started

See [docs/architecture.md](docs/architecture.md) for the complete system design, data model, API surface, and deployment guide.

## Key Features

- **15 Built-in Programs** — Starting Strength, StrongLifts 5×5, GZCLP, Greyskull LP, Phrak's GSLP, Wendler's 5/3/1, Texas Method, Madcow 5×5, nSuns LP, PHUL, Conjugate, Juggernaut, Sheiko, Building the Monolith, Smolov Jr
- **Custom Programs** — create your own with full control over sets, reps, intensity, and progression
- **Universal Template Engine** — all programs share the same workout logging, offline sync, analytics, and AI insights
- **Configurable Variations** — BBB, FSL, Joker sets for 5/3/1; backoff sets for Texas Method; template-specific options per program
- **AMRAP Tracking** — logs PR sets, calculates a consistent estimated 1RM, detects personal records automatically
- **Auto-Progression** — template-driven TM increments on cycle completion (+5 upper / +10 lower, or program-specific rules)
- **Analytics Dashboard** — interactive charts: 1RM trends, volume tracking, PR timeline, muscle balance radar, consistency heatmap, TM progression
- **AI Training Insights** — Gemini-powered coaching fed by analytics data: plateau detection, volume trends, consistency analysis, personalized recommendations
- **PR Charts** — estimated 1RM progression over time per lift with filterable date ranges
- **Offline Gym Mode** — log sets with no WiFi; syncs automatically when connection returns
- **PWA** — install on iPhone home screen, full-screen, no browser chrome
