# TrackVerse Vercel Deployment Guide

## Quick Deploy Steps

### 1. Push to GitHub
```bash
cd d:\Web3\TrackVerse
git init
git add .
git commit -m "TrackVerse v1 - Ready for Vercel"
git remote add origin https://github.com/YOUR_USERNAME/trackverse.git
git push -u origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"New Project"**
3. Import your `trackverse` repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `.` (Leave empty / default)
   - **Build Command:** `npm run build --workspace=apps/web` (Or leave empty to use `vercel.json`)
   - **Output Directory:** `apps/web/.next` (Or leave empty to use `vercel.json`)

### 3. Add Environment Variables
In Vercel dashboard → Project Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `ALCHEMY_API_KEY` | Your Alchemy API key |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Your WalletConnect ID |
| `NEXT_PUBLIC_API_URL` | Leave empty (uses /api routes) |

### 4. Deploy!
Click **Deploy** - Vercel will build and deploy automatically.

---

## API Routes (Serverless)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/targets` | GET | Get all tracked wallets |
| `/api/targets` | POST | Create new target |
| `/api/targets?id=xxx&action=history` | GET | Get transaction history |
| `/api/targets?id=xxx&action=discover` | POST | Discover contacts |
| `/api/incognito` | POST | Analyze wallet (no storage) |
| `/api/wallets?q=xxx` | GET | Search wallets |

---

## Telegram Bot Note
The Telegram bot requires a persistent server. For production:
- Deploy backend to **Railway** or **Render** (free tier)
- Or use a **Vercel Cron Job** with Telegram webhooks

---

## After Deployment
Your app will be live at: `https://trackverse-xxx.vercel.app`

Update frontend URLs if needed for production use.
