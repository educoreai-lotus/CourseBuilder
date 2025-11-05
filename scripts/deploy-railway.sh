#!/bin/bash
# Railway Deployment Helper Script
# Usage: ./scripts/deploy-railway.sh

set -e

echo "🚂 Deploying Course Builder Backend to Railway..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Navigate to backend directory
cd backend

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway..."
    railway login
fi

# Link or create project
if [ ! -f .railway/project.json ]; then
    echo "🔗 Linking to Railway project..."
    railway link
fi

# Set environment variables (if not already set)
echo "📝 Setting environment variables..."
echo "⚠️  Make sure to set these in Railway dashboard:"
echo "   - DATABASE_URL (from Supabase)"
echo "   - JWT_SECRET (generate with: node ../scripts/generate-secrets.js)"
echo "   - CORS_ORIGIN (your Vercel frontend URL)"
echo ""

# Run database migrations
echo "🗄️  Running database migrations..."
railway run npm run migrate

# Seed database (optional)
read -p "Do you want to seed the database? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    railway run npm run seed
fi

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment complete!"
echo "📊 Check your Railway dashboard for the deployment URL"

