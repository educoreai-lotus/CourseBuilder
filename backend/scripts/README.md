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

## Removed Scripts

The following scripts were removed as they were for data filling/editing:
- `seed.js` - Seeded database from seed.sql
- `seedMockData.js` - Seeded mock data
- `runData.js` - Checked data
- `runSeed.js` - Ran seed
- `checkData.js` - Checked mock data
- `full-setup.js` - Full setup with seeding
- `push-to-supabase.js` - Pushed to Supabase
- `push-data-to-supabase.js` - Pushed data to Supabase
- `push-schema-supabase.js` - Pushed schema to Supabase
- `create-test-db.js` - Created test database

These scripts are no longer needed as the database should remain empty and be populated through the API endpoints.

