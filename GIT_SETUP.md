# 📦 Git Repository Setup Guide

Step-by-step guide to push Course Builder project to GitHub.

## 🎯 Prerequisites

1. **Git installed** - Check: `git --version`
2. **GitHub account** - Create at [github.com](https://github.com)

---

## 📋 Step-by-Step Instructions

### Step 1: Initialize Git Repository (if not already done)

```bash
# Navigate to project root
cd C:\Users\HP\Desktop\MainDevelopment_tamplates

# Initialize git repository
git init

# Check status
git status
```

### Step 2: Create .gitignore (Already Created)

The `.gitignore` file is already configured to exclude:
- `node_modules/`
- `.env` files
- Build outputs
- IDE files
- Logs

### Step 3: Add All Files

```bash
# Add all files to staging
git add .

# Check what will be committed
git status
```

### Step 4: Create Initial Commit

```bash
# Create first commit
git commit -m "Initial commit: Course Builder - Full stack application with backend, frontend, and deployment configs"

# Or with more details:
git commit -m "Initial commit: Course Builder

- Backend: Node.js + Express + PostgreSQL
- Frontend: React + Vite + Tailwind
- Database: Supabase PostgreSQL schema
- Deployment: Railway + Vercel configs
- Documentation: Complete deployment guides"
```

### Step 5: Create GitHub Repository

**Option A: Using GitHub Website (Recommended)**

1. Go to [GitHub.com](https://github.com)
2. Click **"+"** → **"New repository"**
3. Fill in:
   - **Repository name**: `course-builder` (or your preferred name)
   - **Description**: "Course Builder microservice - AI-powered course creation and management platform"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

**Option B: Using GitHub CLI**

```bash
# Install GitHub CLI if not installed
# Windows: winget install GitHub.cli

# Login
gh auth login

# Create repository
gh repo create course-builder --public --source=. --remote=origin --push
```

### Step 6: Connect Local Repository to GitHub

```bash
# Add remote repository (replace with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/course-builder.git

# Verify remote
git remote -v
```

**If you already have a remote, update it:**
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/course-builder.git
```

### Step 7: Push to GitHub

```bash
# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**If you get authentication errors:**
- Use **Personal Access Token** instead of password
- Or use **SSH** instead of HTTPS

---

## 🔐 GitHub Authentication

### Option A: Personal Access Token (Recommended)

1. Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **"Generate new token (classic)"**
3. Name: `course-builder-deploy`
4. Select scopes: `repo` (full control)
5. Click **"Generate token"**
6. **Copy the token** (you won't see it again!)
7. Use token as password when pushing

### Option B: SSH Keys

```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add SSH key to GitHub
# Copy public key: cat ~/.ssh/id_ed25519.pub
# Add to GitHub → Settings → SSH and GPG keys

# Change remote to SSH
git remote set-url origin git@github.com:YOUR_USERNAME/course-builder.git
```

---

## ✅ Verify Push

1. Go to your GitHub repository page
2. Verify all files are there:
   - `backend/` folder
   - `frontend/` folder
   - `Main_Development_Plan/` folder
   - Configuration files
   - Documentation files

---

## 🔄 Future Updates

After making changes:

```bash
# Check what changed
git status

# Add changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push
```

---

## 📝 Quick Command Reference

```bash
# Initialize repository
git init

# Add all files
git add .

# Commit
git commit -m "Your commit message"

# Add remote
git remote add origin https://github.com/USERNAME/REPO.git

# Push
git push -u origin main

# Check status
git status

# View remote
git remote -v
```

---

## 🐛 Troubleshooting

### Error: "fatal: remote origin already exists"
```bash
# Remove existing remote
git remote remove origin

# Add new remote
git remote add origin https://github.com/YOUR_USERNAME/course-builder.git
```

### Error: "Authentication failed"
- Use Personal Access Token instead of password
- Or switch to SSH authentication

### Error: "Permission denied"
- Check your GitHub username
- Verify repository exists
- Check repository permissions

### Error: "Updates were rejected"
```bash
# Pull first (if repository has content)
git pull origin main --allow-unrelated-histories

# Then push
git push -u origin main
```

---

## 📚 Best Practices

1. **Commit often** - Small, logical commits
2. **Write clear commit messages** - Describe what and why
3. **Don't commit secrets** - `.env` files are in `.gitignore`
4. **Use branches** - Create feature branches for new work
5. **Push regularly** - Keep GitHub in sync

---

## 🎉 Success!

Your project is now on GitHub and ready for:
- ✅ Cloud deployment (Railway, Vercel)
- ✅ Collaboration
- ✅ CI/CD pipelines
- ✅ Version control

---

## 🔗 Next Steps

After pushing to GitHub:
1. **Deploy to cloud** - Follow `DEPLOYMENT_QUICK_START.md`
2. **Set up CI/CD** - GitHub Actions will auto-deploy
3. **Add collaborators** - Share repository with team
4. **Create branches** - Use feature branches for development

---

## 📞 Need Help?

- **Git basics**: [Git Documentation](https://git-scm.com/doc)
- **GitHub guides**: [GitHub Guides](https://guides.github.com)
- **Git commands**: `git help <command>`

