# 🚀 Cloud Deployment Guide - Course Builder

Complete guide to deploy Course Builder backend, frontend, and database to the cloud.

## 📋 Prerequisites

1. **Accounts Required:**
   - [Railway](https://railway.app) account (for backend)
   - [Vercel](https://vercel.com) account (for frontend)
   - [Supabase](https://supabase.com) account (for PostgreSQL database)
   - [GitHub](https://github.com) account (for code repository)

2. **Tools Installed:**
   - Git
   - Node.js (v18+)
   - Railway CLI (optional): `npm i -g @railway/cli`
   - Vercel CLI (optional): `npm i -g vercel`

---

## 🗄️ Step 1: Deploy Database to Supabase

### 1.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Project Name**: `course-builder-db`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for MVP

4. Wait for project creation (~2 minutes)

### 1.2 Get Database Connection String

1. Go to **Settings** → **Database**
2. Find **Connection string** → **URI**
3. Copy the connection string (format: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`)

### 1.3 Run Database Migrations

**Option A: Using Supabase SQL Editor**
1. Go to **SQL Editor** in Supabase dashboard
2. Copy contents of `backend/database/schema.sql`
3. Paste and run in SQL Editor
4. Copy contents of `backend/database/seed.sql`
5. Paste and run in SQL Editor (optional, for test data)

**Option B: Using Local Script**
```bash
cd backend

# Set environment variable
export DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Run migrations
npm run migrate
npm run seed
```

### 1.4 Verify Database

1. Go to **Table Editor** in Supabase
2. Verify tables exist: `courses`, `modules`, `lessons`, `versions`, `registrations`, `feedback`, `assessments`

---

## ⚙️ Step 2: Deploy Backend to Railway

### 2.1 Prepare Backend for Deployment

1. **Push code to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit: Course Builder backend"
git branch -M main
git remote add origin https://github.com/yourusername/course-builder.git
git push -u origin main
```

### 2.2 Deploy on Railway

**Option A: Using Railway Dashboard (Recommended)**

1. Go to [Railway Dashboard](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Railway will auto-detect it's a Node.js project
5. Click **"Add Service"** → **"GitHub Repo"**
6. Select your backend folder or set root directory to `/backend`

**Option B: Using Railway CLI**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Link to existing project or create new
railway link

# Set environment variables (see Step 2.3)
railway variables

# Deploy
railway up
```

### 2.3 Configure Environment Variables in Railway

1. Go to your Railway project → **Variables** tab
2. Add these environment variables:

```env
# Server
PORT=3000
NODE_ENV=production

# Database (from Supabase)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
DB_HOST=aws-0-[region].pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.[ref]
DB_PASSWORD=your-supabase-password

# API URLs
API_BASE_URL=https://your-backend-url.railway.app
FRONTEND_URL=https://your-frontend-url.vercel.app

# Security (Generate secure keys!)
JWT_SECRET=generate-a-random-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=generate-another-random-secret-key
REFRESH_TOKEN_EXPIRES_IN=24h

# Service Authentication
SERVICE_CLIENT_ID=your-service-client-id
SERVICE_CLIENT_SECRET=your-service-client-secret

# External Services (Mock URLs for MVP)
CONTENT_STUDIO_URL=http://localhost:3001
ASSESSMENT_SERVICE_URL=http://localhost:3002
LEARNING_ANALYTICS_URL=http://localhost:3003
MANAGEMENT_REPORTING_URL=http://localhost:3004
DIRECTORY_SERVICE_URL=http://localhost:3005
CREDLY_API_URL=https://api.credly.com
RAG_SERVICE_URL=http://localhost:3006

# Optional: External APIs
YOUTUBE_API_KEY=optional
GITHUB_TOKEN=optional

# Encryption
ENCRYPTION_KEY=generate-32-character-aes-key

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# CORS
CORS_ORIGIN=https://your-frontend-url.vercel.app
```

### 2.4 Get Railway Backend URL

1. After deployment, Railway provides a URL like: `https://your-app.railway.app`
2. Copy this URL (you'll need it for frontend)

### 2.5 Run Database Migrations on Railway

**Option A: Using Railway Shell**
1. Go to Railway project → **Deployments** → Click on latest deployment
2. Click **"Shell"** tab
3. Run:
```bash
npm run migrate
npm run seed
```

**Option B: Using Railway CLI**
```bash
railway run npm run migrate
railway run npm run seed
```

---

## 🎨 Step 3: Deploy Frontend to Vercel

### 3.1 Prepare Frontend for Deployment

1. **Update API URL in frontend:**
   - Create `frontend/.env.production`:
   ```env
   VITE_API_URL=https://your-backend-url.railway.app/api/v1
   ```

### 3.2 Deploy on Vercel

**Option A: Using Vercel Dashboard (Recommended)**

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Click **"Deploy"**

**Option B: Using Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? course-builder-frontend
# - Directory? ./
# - Override settings? No
```

### 3.3 Configure Environment Variables in Vercel

1. Go to Vercel project → **Settings** → **Environment Variables**
2. Add:

```env
VITE_API_URL=https://your-backend-url.railway.app/api/v1
VITE_ENV=production
VITE_ENABLE_CHATBOT=true
VITE_ENABLE_ANALYTICS=true
```

3. **Redeploy** after adding environment variables:
   - Go to **Deployments** → Click **"..."** → **"Redeploy"**

### 3.4 Get Vercel Frontend URL

1. After deployment, Vercel provides a URL like: `https://your-app.vercel.app`
2. Copy this URL

---

## 🔗 Step 4: Connect Everything

### 4.1 Update Backend CORS

1. Go back to Railway → **Variables**
2. Update `CORS_ORIGIN`:
   ```env
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   ```
3. Railway will auto-redeploy

### 4.2 Update Frontend API URL

1. Go to Vercel → **Environment Variables**
2. Update `VITE_API_URL`:
   ```env
   VITE_API_URL=https://your-backend-url.railway.app/api/v1
   ```
3. Redeploy frontend

### 4.3 Verify Deployment

1. **Test Backend:**
   ```bash
   curl https://your-backend-url.railway.app/api/v1/health
   # Should return: {"status":"ok"}
   ```

2. **Test Frontend:**
   - Open: `https://your-frontend-url.vercel.app`
   - Should load the Course Builder homepage

3. **Test API Connection:**
   - Open browser console on frontend
   - Try browsing courses
   - Check Network tab for API calls

---

## 🔐 Step 5: Generate Secure Keys

### Generate JWT Secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Generate Encryption Key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Generate Refresh Token Secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**⚠️ Important:** Never commit these keys to Git! Only add them to cloud platform environment variables.

---

## 📊 Step 6: Database Connection (Railway → Supabase)

Railway backend should connect to Supabase using the `DATABASE_URL` environment variable.

### Verify Connection:
1. Go to Railway → **Deployments** → **Shell**
2. Run:
   ```bash
   node scripts/verify-db.js
   ```
3. Should show: "✅ Database connection successful"

---

## 🔄 Step 7: Continuous Deployment (CI/CD)

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          npm i -g @railway/cli
          railway up --service backend

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
```

---

## ✅ Deployment Checklist

- [ ] Supabase project created
- [ ] Database schema migrated
- [ ] Railway backend deployed
- [ ] Backend environment variables configured
- [ ] Backend database migrations run
- [ ] Vercel frontend deployed
- [ ] Frontend environment variables configured
- [ ] CORS configured in backend
- [ ] Frontend API URL updated
- [ ] Secure keys generated and set
- [ ] Health check endpoint working
- [ ] Frontend loads successfully
- [ ] API calls working from frontend

---

## 🐛 Troubleshooting

### Backend Issues

**Problem: Database connection fails**
- Check `DATABASE_URL` in Railway variables
- Verify Supabase project is active
- Check firewall/network settings

**Problem: Port not exposed**
- Railway auto-exposes PORT environment variable
- Check Railway service logs

### Frontend Issues

**Problem: API calls fail (CORS)**
- Verify `CORS_ORIGIN` in Railway includes your Vercel URL
- Check `VITE_API_URL` in Vercel environment variables

**Problem: Build fails**
- Check Vercel build logs
- Verify all dependencies in `package.json`
- Check for TypeScript/ESLint errors

### Database Issues

**Problem: Migration fails**
- Check connection string format
- Verify Supabase project is active
- Check database user permissions

---

## 📝 Environment Variables Summary

### Railway (Backend)
- `DATABASE_URL` - Supabase connection string
- `PORT` - Server port (3000)
- `JWT_SECRET` - JWT signing secret
- `CORS_ORIGIN` - Frontend URL
- `API_BASE_URL` - Backend URL
- `FRONTEND_URL` - Frontend URL

### Vercel (Frontend)
- `VITE_API_URL` - Backend API URL
- `VITE_ENV` - Environment (production)

### Supabase
- Connection string from dashboard
- Database password from project creation

---

## 🎉 Success!

Your Course Builder is now deployed to the cloud:
- **Backend**: `https://your-backend.railway.app`
- **Frontend**: `https://your-frontend.vercel.app`
- **Database**: Supabase (managed)

All environment variables are stored securely in cloud platforms!

