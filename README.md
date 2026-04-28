# PlateIQ

PlateIQ is a strength training web app for lifters who want structured programming, fast workout logging, and a clearer picture of progress over time. It combines a broad template library, a custom program builder, analytics, AI-generated coaching notes, and an installable PWA experience built for repeat use between sessions.

## Highlights

- Built-in training templates spanning beginner linear progression, classic intermediate programming, and advanced periodization
- Custom program builder for lifters who want to define their own training days, exercise blocks, set schemes, and progression rules
- Workout execution flow with active session tracking, AMRAP support, training max support, and resumable workouts
- Analytics dashboard for estimated 1RM trends, volume, PR history, consistency, movement balance, bodyweight work, and strength profile context
- AI insights generated from the current analytics snapshot to surface progress patterns, stalls, and next-step recommendations
- Guest mode and Google sign-in, with upgrade flows for users who start anonymously and later attach a full account
- Installable PWA behavior with an offline-friendly app shell and workout continuation when connectivity is unreliable

## Core Areas

- Dashboard with active-program progress, training max visibility, recent PRs, and recent workout activity
- Programs area for built-in templates, saved programs, training max configuration, and custom program editing
- Workout flow for launching sessions, logging sets and reps, running AMRAP work, and resuming active workouts
- Analytics area for strength trends, volume, consistency, movement balance, bodyweight work, and AI-generated summaries
- Settings area for account management, unit preferences, theme preferences, strength profile details, and user feedback

## Program Library

Beginner and hybrid:
Starting Strength, StrongLifts 5x5, GZCLP, Greyskull LP, Phrak's GSLP, Strong Curves, Reddit PPL

Intermediate:
Wendler's 5/3/1, Texas Method, Madcow 5x5, nSuns LP, PHUL, Candito 6 Week Strength, GZCL The Rippler

Advanced:
Conjugate, Juggernaut, Sheiko, Building the Monolith, Smolov Jr

## Repository Structure

```text
plateiq/
|- apps/
|  `- web/                  Next.js product application
|     |- app/               routes, layouts, and server handlers
|     |- components/        product UI for auth, programs, workouts, analytics, and PWA flows
|     |- hooks/             TanStack Query hooks and client data access
|     |- lib/               domain logic, analytics, auth helpers, template engine, and validation
|     |- public/            manifest, icons, service worker, and offline assets
|     |- store/             persisted Zustand state
|     `- types/             domain, analytics, insights, and database types
|- supabase/
|  `- migrations/           schema, RLS, and PostgreSQL RPC changes
`- .github/
   `- workflows/            automation and deployment workflows
```

## Stack

| Layer | Technology |
| --- | --- |
| Product app | Next.js 16, React 19, TypeScript |
| UI system | Tailwind CSS v4, shadcn/ui, Base UI, Lucide |
| Data fetching | TanStack Query v5 |
| Client state | Zustand |
| Forms and validation | React Hook Form, Zod |
| Server-side logic | Next.js route handlers, Supabase SSR helpers, PostgreSQL RPCs |
| Auth and database | Supabase Auth, PostgreSQL, PostgREST, Row Level Security, PostgreSQL RPCs |
| Analytics and visualization | Recharts |
| AI | Google Gemini via `@google/genai` |
| Offline and PWA | Service worker, web app manifest, IndexedDB-backed query persistence |
| Platform | Vercel |
