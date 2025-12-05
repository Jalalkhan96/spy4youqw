# TrackVerse

**SkillWatch / TrackVerse** is a full-stack hackathon project that tracks wallet activity on Base/Ethereum, discovers relevant contacts, and sends Telegram alerts.

## Structure

- `apps/web`: Next.js frontend (Dashboard, Wallet Connect, Live Feed).
- `packages/backend`: Node.js/Express backend (Discovery, Watcher, Telegram Bot).
- `contracts`: Solidity Smart Contracts (TrackingRegistry on Base).
- `infra`: Infrastructure configurations (Supabase, Scripts).

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env` and fill in the required keys.

3. **Run Locally**
   ```bash
   npm run dev
   ```

## Features
- **Discovery**: Analyzes wallet history to find top and recent contacts.
- **Tracking**: Monitors specific addresses for real-time incoming/outgoing transactions.
- **Alerts**: Sends Telegram notifications for detected events.
- **On-Chain**: Registers tracking sessions on Base.
