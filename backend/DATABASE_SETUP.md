# PostgreSQL Database Setup Guide

This guide will help you connect PostgreSQL to the Course Builder application.

## Prerequisites

1. **PostgreSQL must be installed** on your system
   - Download from: https://www.postgresql.org/download/
   - Or use: Docker, Homebrew (Mac), or apt-get (Linux)

2. **PostgreSQL service must be running**
   - Windows: Check Services (services.msc) for "PostgreSQL"
   - Linux: `sudo service postgresql start` or `sudo systemctl start postgresql`
   - Mac: `brew services start postgresql` (if installed via Homebrew)

## Quick Setup (Automated)

### Step 1: Configure Database Credentials

Edit `backend/.env` file (create it if it doesn't exist):

```env
PORT=3000
NODE_ENV=development

# PostgreSQL Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coursebuilder
DB_USER=postgres
DB_PASSWORD=postgres

# Alternative: Use DATABASE_URL (for Supabase/Railway)
# DATABASE_URL=postgresql://user:password@host:port/database
```

**Important:** Update `DB_PASSWORD` if your PostgreSQL password is different!

### Step 2: Run Setup Script

This will:
1. Check PostgreSQL connection
2. Create the database if it doesn't exist
3. Run migrations (create tables)
4. Seed test data

```bash
cd backend
npm run db:init
```

Or run step by step:

```bash
# Step 1: Create database
npm run db:setup

# Step 2: Create tables (migrations)
npm run migrate

# Step 3: Add test data
npm run seed
```

## Manual Setup (Alternative)

If the automated script doesn't work, you can set up manually:

### Step 1: Connect to PostgreSQL

Open PostgreSQL command line (psql) or pgAdmin:

```bash
psql -U postgres
```

### Step 2: Create Database

```sql
CREATE DATABASE coursebuilder;
\q
```

### Step 3: Run Migrations

```bash
cd backend
npm run migrate
```

### Step 4: Seed Test Data

```bash
npm run seed
```

## Verify Connection

Test the database connection:

```bash
cd backend
npm run dev
```

You should see:
```
✅ Database connected successfully
🚀 Course Builder API server running on port 3000
```

## Troubleshooting

### Error: "Connection refused" or "ECONNREFUSED"

**Problem:** PostgreSQL service is not running.

**Solution:**
- Windows: Open Services (Win+R → `services.msc`) → Find "PostgreSQL" → Start
- Linux: `sudo systemctl start postgresql`
- Mac: `brew services start postgresql`

### Error: "password authentication failed"

**Problem:** Wrong password in `.env` file.

**Solution:**
1. Check your PostgreSQL password
2. Update `DB_PASSWORD` in `backend/.env`
3. Or reset PostgreSQL password:
   ```sql
   ALTER USER postgres WITH PASSWORD 'newpassword';
   ```

### Error: "database does not exist"

**Problem:** Database hasn't been created yet.

**Solution:**
```bash
cd backend
npm run db:setup
```

### Error: "relation already exists"

**Problem:** Tables already exist from a previous migration.

**Solution:** The schema.sql includes `DROP TABLE IF EXISTS`, so you can safely run:
```bash
npm run migrate
```

Or manually drop and recreate:
```sql
DROP DATABASE coursebuilder;
CREATE DATABASE coursebuilder;
```

Then run migrations again.

## Using Cloud PostgreSQL (Supabase/Railway)

If you're using a cloud database (Supabase, Railway, etc.):

1. Get your connection string from your provider
2. Update `backend/.env`:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   ```
3. Run migrations:
   ```bash
   npm run migrate
   npm run seed
   ```

## Database Reset

To completely reset the database (drop all data and recreate):

```bash
cd backend
npm run db:reset
```

**Warning:** This will delete all existing data!

