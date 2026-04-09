# PlateIQ

Full-stack workout tracker prioritizing Jim Wendler's 5/3/1 strength program. Log main lifts and accessories, track personal records and estimated 1RMs, and get AI-powered insights on your training trends.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), Tailwind CSS v4, shadcn/ui, TanStack Query v5, Zustand |
| Backend | ASP.NET Core 10, Clean Architecture (WebAPI / Core / Infrastructure) |
| Database | Supabase PostgreSQL (500 MB free, EF Core 10 + Npgsql) |
| Auth | Auth.js v5 (Google OAuth) + Token Exchange → ASP.NET Core JWT + refresh token rotation |
| AI | Google Gemini 2.0 Flash (1,500 req/day free) |
| Hosting | Vercel Free (frontend) + Fly.io free tier (backend, always-on) + Supabase PostgreSQL |
| CI/CD | GitHub Actions → ZIP deploy to Azure |

## Repository Structure

```
plateiq/
├── docs/
│   └── architecture.md    ← complete system architecture blueprint (start here)
├── src/
│   ├── backend/           ← PlateIQ.sln (.NET solution)
│   └── frontend/          ← Next.js application
├── .github/
│   └── workflows/
│       └── deploy.yml     ← CI/CD pipeline
└── data/                  ← seed data / reference files
```

## Getting Started

See [docs/architecture.md](docs/architecture.md) for the complete system design, data model, API contract, and deployment guide.

## Key Features

- **5/3/1 Program Generator** — auto-calculates warmup + main sets (% of Training Max) for all 4 weeks per Wendler's guidelines
- **AMRAP Tracking** — logs PR sets, calculates estimated 1RM (Epley + Brzycki), detects and records personal records automatically
- **Auto-Progression** — applies +5 lb (upper) / +10 lb (lower) TM increment on cycle completion
- **Accessory Logging** — supports BBB, FSL, Joker sets, and freeform accessories
- **AI Training Insights** — weekly/monthly analysis via Gemini: plateau detection, volume trends, program recommendations
- **PR Charts** — estimated 1RM progression over time per lift
- **Multi-template Support** — BBB, First Set Last, Original+, Beyond+

## Deployment Cost: $0

Frontend on Vercel (CDN edge, native Next.js), backend on Fly.io always-on VMs, database on Supabase PostgreSQL — all free. See the [scalability growth path](docs/architecture.md#11-scalability-growth-path) for upgrade options when needed.
