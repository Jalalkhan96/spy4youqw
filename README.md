# TrackVerse (SkillWatch)

Full-stack hackathon project that tracks wallet activity on Base/Ethereum, discovers relevant contacts from a wallet's history, and sends Telegram alerts — with tracking sessions registered on-chain.

## What it is

**SkillWatch / TrackVerse** is an npm-workspaces monorepo with three parts that work together:

- A **Next.js web app** — dashboard, wallet connect (RainbowKit + wagmi) and a live activity feed.
- A **Node.js/Express backend** — analyses a wallet's history to discover its top and recent contacts, watches specific addresses for incoming/outgoing transactions (via Alchemy), stores data in Supabase, and pushes alerts through a Telegram bot.
- A **Solidity contract** — `TrackingRegistry` on Base, which logs each tracking session on-chain by emitting a `TrackingStarted` event.

## Structure

```
apps/web/               Next.js 14 frontend (TypeScript, Tailwind CSS)
  src/                    components/, pages/, styles/
  package.json            next dev / build / start / lint
packages/backend/       Express + TypeScript API
  src/server.ts           Server entry point
  src/db.ts               Supabase client setup
  src/routes/             API routes
  src/services/           Discovery, watcher and Telegram alert services
contracts/              Hardhat project
  contracts/TrackingRegistry.sol
  scripts/deploy.ts       Deploy script (Base Sepolia / Base)
  test/TrackingRegistry.test.ts
  package.json            hardhat compile / test / deploy:base-sepolia / deploy:base
infra/
  supabase/migrations/    Initial schema migration (SQL)
  deploy.sh               Deploy helper script
DEPLOY_VERCEL.md        Vercel deployment notes
vercel.json             Vercel build config (builds apps/web)
.env.example            Required environment variables template
build_log.txt           Recorded build output
```

## Setup

```bash
npm install                 # installs all workspaces
cp .env.example .env        # fill in the required keys
npm run dev                 # runs web + backend together (concurrently)
npm run build               # builds all workspaces
npm test                    # tests across workspaces
```

Contracts, from `contracts/`:

```bash
npm run compile
npm test
npm run deploy:base-sepolia   # or deploy:base
```

Frontend deploys to Vercel using the root `vercel.json` (see `DEPLOY_VERCEL.md`).

## Features

- **Discovery** — analyses wallet history to find top and recent contacts
- **Tracking** — monitors specific addresses for real-time incoming/outgoing transactions
- **Alerts** — Telegram notifications for detected events
- **On-chain** — tracking sessions registered on Base via `TrackingRegistry`

## Tech

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, RainbowKit, wagmi, viem, ethers 6, TanStack Query, Framer Motion
- **Backend:** Node.js, Express 4, TypeScript, Supabase (`@supabase/supabase-js`), Alchemy SDK, ethers 6, node-telegram-bot-api, Jest
- **Contracts:** Solidity 0.8.20, Hardhat 2 + hardhat-toolbox
- **Infra:** Supabase (Postgres + migrations), Vercel

## License

MIT — see [LICENSE](LICENSE).
