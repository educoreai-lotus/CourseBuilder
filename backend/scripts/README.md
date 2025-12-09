# Backend Scripts

This directory contains essential scripts for database management and maintenance.

## Essential Scripts

### Database Setup & Migration
- **`setup-database.js`** - Initial database setup (creates database if needed)
- **`migrate.js`** - Creates database schema (tables, enums, etc.)
- **`add-ai-assets-column.js`** - Migration to add `ai_assets` column to courses table

### Database Management
- **`clearDatabase.js`** - Clears all data from database (keeps schema)
- **`verify-db.js`** - Verifies database schema and structure
- **`diagnose-db.js`** - Diagnoses database connection and configuration issues
- **`test-connection.js`** - Tests database connection

### Data Seeding
- **`seed.js`** - Seeds the default database (uses DATABASE_URL from .env)
- **`seedToDatabase.js`** - Seeds any database by providing DATABASE_URL

### Utility Scripts
- **`generate-secrets.js`** - Generates JWT secrets and other cryptographic keys
- **`generate-service-keys.js`** - Generates service keys for microservice communication
- **`check-ai-structure.js`** - Checks AI-generated course structures

## Usage

### Setup Database (First Time)
```bash
npm run db:init
```
This runs: `db:setup` → `migrate`

### Run Migrations
```bash
npm run migrate
```

### Seed Default Database
```bash
npm run seed
```
Uses `DATABASE_URL` from your `.env` file.

### Seed Another Database

#### Option 1: Using Environment Variable
```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://user:pass@host:port/db"; npm run seed:custom

# Linux/Mac
DATABASE_URL="postgresql://user:pass@host:port/db" npm run seed:custom
```

#### Option 2: Using Command Line Argument
```bash
npm run seed:custom "postgresql://user:pass@host:port/db"
```

#### Option 3: Direct Node Command
```bash
node scripts/seedToDatabase.js "postgresql://user:pass@host:port/db"
```

### Clear Database (Keep Schema)
```bash
npm run db:clear
```

### Verify Database
```bash
npm run db:verify
```

### Diagnose Issues
```bash
npm run db:diagnose
```

### Test Connection
```bash
npm run db:test-connection
```

## Seeding Multiple Databases

To seed a second database (e.g., team database):

1. **Set the database URL:**
   ```bash
   # Windows PowerShell
   $env:DATABASE_URL="postgresql://user:pass@host:port/db"
   
   # Linux/Mac
   export DATABASE_URL="postgresql://user:pass@host:port/db"
   ```

2. **Run the seed script:**
   ```bash
   npm run seed:custom
   ```

   Or pass the URL directly:
   ```bash
   npm run seed:custom "postgresql://user:pass@host:port/db"
   ```

### Supabase Support

The `seedToDatabase.js` script automatically:
- Detects Supabase URLs
- Adds `sslmode=require` if not present
- Configures SSL with `rejectUnauthorized: false`

Example:
```bash
npm run seed:custom "postgresql://user:pass@aws-0-region.pooler.supabase.com:5432/db"
```

## Removed Scripts

The following scripts were removed as they were for data filling/editing:
- `seedMockData.js` - Seeded mock data
- `runData.js` - Checked data
- `runSeed.js` - Ran seed
- `checkData.js` - Checked mock data
- `full-setup.js` - Full setup with seeding
- `push-to-supabase.js` - Pushed to Supabase
- `push-data-to-supabase.js` - Pushed data to Supabase
- `push-schema-supabase.js` - Pushed schema to Supabase
- `create-test-db.js` - Created test database

These scripts are no longer needed as the database should remain empty and be populated through the API endpoints or using the seed scripts above.
