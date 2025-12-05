#!/bin/bash

echo "Deploying TrackVerse..."

# 1. Deploy Contracts
echo "Deploying Smart Contracts..."
cd contracts
npm install
npx hardhat run scripts/deploy.ts --network baseSepolia
cd ..

# 2. Deploy Backend (Supabase Edge Functions or Vercel)
# For this hackathon scaffold, we assume local or Vercel for backend too.
echo "Backend deployment instructions in README."

# 3. Deploy Frontend
echo "Deploying Frontend..."
cd apps/web
npm install
npm run build
# npx vercel --prod
cd ..

echo "Deployment Complete!"
