# ⚡ Quick Start Deployment Guide

Fast deployment guide for Course Builder to cloud platforms.

## 🎯 Prerequisites

1. **Create accounts:**
   - [Railway](https://railway.app) → Sign up
   - [Vercel](https://vercel.com) → Sign up  
   - [Supabase](https://supabase.com) → Sign up
   - [GitHub](https://github.com) → Sign up (if not already)

2. **Push code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Course Builder"
   git remote add origin https://github.com/yourusername/course-builder.git
   git push -u origin main
   ```

---

## 🗄️ Step 1: Supabase Database (5 minutes)

1. **Create project:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Click **"New Project"**
   - Name: `course-builder-db`
   - Save the database password!

2. **Get connection string:**
   - Settings → Database → Connection string → URI
   - Copy the full connection string

3. **Run migrations:**
   - Go to SQL Editor
   - Copy/paste `backend/database/schema.sql` → Run
   - Copy/paste `backend/database/seed.sql` → Run (optional)

✅ **Done!** Save the connection string for Step 2.

---

## ⚙️ Step 2: Railway Backend (10 minutes)

### Option A: Dashboard (Easiest)

1. **Create project:**
   - Go to [Railway Dashboard](https://railway.app)
   - Click **"New Project"** → **"Deploy from GitHub repo"**
   - Select your repository
   - Set root directory to `/backend` (or create service for backend folder)

2. **Set environment variables:**
   - Go to your service → **Variables** tab
   - Add these variables:

   ```env
   PORT=3000
   NODE_ENV=production
   DATABASE_URL=<paste-supabase-connection-string>
   CORS_ORIGIN=https://your-frontend.vercel.app
   JWT_SECRET=<generate-with-script-below>
   REFRESH_TOKEN_SECRET=<generate-with-script-below>
   ENCRYPTION_KEY=<generate-with-script-below>
   ```

3. **Generate secrets:**
   ```bash
   node scripts/generate-secrets.js
   ```
   Copy the output to Railway variables.

4. **Run migrations:**
   - Go to service → **Deployments** → Click latest → **Shell**
   - Run: `npm run migrate && npm run seed`

5. **Get backend URL:**
   - Railway provides a URL like: `https://your-app.railway.app`
   - Copy this URL!

### Option B: CLI

```bash
cd backend
npm install -g @railway/cli
railway login
railway init
railway link
railway variables set DATABASE_URL="<supabase-connection-string>"
railway variables set CORS_ORIGIN="https://your-frontend.vercel.app"
railway up
```

✅ **Done!** Backend is deployed at `https://your-app.railway.app`

---

## 🎨 Step 3: Vercel Frontend (5 minutes)

### Option A: Dashboard (Easiest)

1. **Create project:**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Click **"Add New Project"**
   - Import your GitHub repository
   - Configure:
     - **Framework Preset**: Vite
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`

2. **Set environment variables:**
   - Go to project → **Settings** → **Environment Variables**
   - Add:
     ```env
     VITE_API_URL=https://your-backend.railway.app/api/v1
     ```

3. **Deploy:**
   - Click **"Deploy"**
   - Wait for build to complete

4. **Get frontend URL:**
   - Vercel provides a URL like: `https://your-app.vercel.app`
   - Copy this URL!

### Option B: CLI

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

✅ **Done!** Frontend is deployed at `https://your-app.vercel.app`

---

## 🔗 Step 4: Connect Everything (2 minutes)

1. **Update Railway CORS:**
   - Railway → Your service → Variables
   - Update `CORS_ORIGIN` to your Vercel URL
   - Railway auto-redeploys

2. **Update Vercel API URL:**
   - Vercel → Your project → Environment Variables
   - Update `VITE_API_URL` to your Railway backend URL
   - Redeploy (or wait for auto-redeploy)

3. **Test:**
   - Open frontend URL
   - Check browser console for API calls
   - Test browsing courses

✅ **Done!** Everything is connected!

---

## ✅ Verification Checklist

- [ ] Supabase database has tables: `courses`, `modules`, `lessons`, etc.
- [ ] Railway backend responds: `curl https://your-backend.railway.app/health`
- [ ] Vercel frontend loads: Open `https://your-frontend.vercel.app`
- [ ] Frontend can call backend: Check browser Network tab
- [ ] CORS is working: No CORS errors in console

---

## 🐛 Quick Troubleshooting

**Backend not connecting to database:**
- Check `DATABASE_URL` in Railway variables
- Verify Supabase project is active
- Check connection string format

**Frontend API calls failing:**
- Verify `VITE_API_URL` in Vercel
- Check `CORS_ORIGIN` in Railway matches Vercel URL
- Check Railway logs for errors

**Build fails:**
- Check build logs in Railway/Vercel
- Verify all dependencies in `package.json`
- Check for syntax errors

---

## 📝 Environment Variables Summary

### Railway (Backend)
```env
DATABASE_URL=<supabase-connection-string>
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.vercel.app
JWT_SECRET=<32-char-hex-string>
REFRESH_TOKEN_SECRET=<32-char-hex-string>
ENCRYPTION_KEY=<32-char-hex-string>
```

### Vercel (Frontend)
```env
VITE_API_URL=https://your-backend.railway.app/api/v1
```

---

## 🎉 Success!

Your Course Builder is now live:
- **Backend**: `https://your-backend.railway.app`
- **Frontend**: `https://your-frontend.vercel.app`
- **Database**: Supabase (managed)

All environment variables are stored securely in cloud platforms!

---

## 📚 Next Steps

1. **Set up custom domains** (optional)
2. **Configure CI/CD** (see `.github/workflows/deploy.yml`)
3. **Set up monitoring** (Railway/Vercel dashboards)
4. **Add SSL certificates** (automatic on Railway/Vercel)

---

## 🔐 Security Notes

- ✅ Never commit `.env` files to Git
- ✅ Use strong, randomly generated secrets
- ✅ Rotate secrets periodically
- ✅ Enable 2FA on all cloud accounts
- ✅ Review Railway/Vercel access logs

---

**Need help?** Check `DEPLOYMENT_GUIDE.md` for detailed instructions.

