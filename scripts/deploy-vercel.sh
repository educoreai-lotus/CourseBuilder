#!/bin/bash
# Vercel Deployment Helper Script
# Usage: ./scripts/deploy-vercel.sh

set -e

echo "▲ Deploying Course Builder Frontend to Vercel..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Navigate to frontend directory
cd frontend

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel..."
    vercel login
fi

# Deploy
echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo "📊 Check your Vercel dashboard for the deployment URL"

