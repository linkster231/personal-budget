# Personal Budget

A private, local-first budget app designed for **variable income** — hourly work that fluctuates plus side-project payments. Built to run great on both iPhone (PWA) and Mac.

## Why this exists

Standard budget apps assume steady paychecks. Mine doesn't. This app supports three variable-income strategies you can switch between:

- **Budget last month's income** — you only spend money you actually received last month. Most conservative.
- **Minimum baseline** — budget against a floor you always earn; surplus spills into savings.
- **Priority allocation** — rank categories, fund top-down until the pool is empty.

## Privacy

All data lives in your browser's `localStorage`. Nothing is ever sent to a server. There is no account, no cloud, no telemetry. The tradeoff: data lives on one device. Use **Settings → Export JSON** regularly to back it up.

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript + Tailwind + Radix UI primitives
- Zustand (with `persist` middleware) for state + localStorage
- Recharts for visualizations
- PWA manifest for iPhone "Add to Home Screen"

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Sign in at [vercel.com](https://vercel.com) and **Import Project** from your repo.
3. Accept all defaults — Vercel auto-detects Next.js. No environment variables are needed (local-only app).
4. Click **Deploy**. You'll get a `https://your-project.vercel.app` URL in ~30 seconds.
5. On iPhone, open the URL in Safari → tap **Share → Add to Home Screen** to install the PWA.

## Project structure

```
app/              Next.js pages (dashboard, income, expenses, budget, settings)
components/       UI primitives, nav, forms, dashboard widgets
lib/              Types, store, selectors, budget-engine, helpers
public/           Manifest + icons
```

## The budget engine

`lib/budget-engine.ts` holds the allocation logic. All three strategies share a single `allocate()` entry point, with an `AllocationResult` (allocations map + unallocated amount + human note).

**The `last-month` strategy is intentionally left as a TODO** — see the comment in that file for the design choice about how to route leftover income into savings. (Implementing it is the simplest way to understand the engine.)

## License

Personal use.
