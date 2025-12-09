/**
 * Migrate Database Schema (Flexible Database URL)
 * Creates database schema (tables, enums, etc.) for any database
 * 
 * Usage: 
 *   DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/migrateToDatabase.js
 *   Or: npm run migrate:team
 */

import pgPromise from 'pg-promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Get database URL from environment variable or command line argument
// Priority: 1. Command line arg, 2. TEAM_DATABASE_URL, 3. DATABASE_URL
const databaseUrl = process.argv[2] || process.env.TEAM_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ ERROR: Database URL is required!');
  console.error('\nUsage:');
  console.error('  Option 1: Set TEAM_DATABASE_URL in .env file, then run: npm run migrate:team');
  console.error('  Option 2: Pass URL as argument: npm run migrate:custom "postgresql://user:pass@host:port/db"');
  console.error('  Option 3: Set DATABASE_URL env var: DATABASE_URL="..." npm run migrate:custom');
  process.exit(1);
}

// Parse Supabase URL and add SSL if needed
let connectionString = databaseUrl;
if (databaseUrl.includes('supabase') || databaseUrl.includes('pooler.supabase')) {
  // Add sslmode=require if not present
  if (!databaseUrl.includes('sslmode=')) {
    connectionString = databaseUrl.includes('?') 
      ? `${databaseUrl}&sslmode=require`
      : `${databaseUrl}?sslmode=require`;
  }
}

// Create database connection
const pgp = pgPromise({
  error(err, e) {
    if (e.cn) {
      console.error('Connection error:', err.message);
    }
  }
});

// Configure SSL for Supabase
let dbConfig = {};
if (connectionString.includes('supabase') || connectionString.includes('pooler.supabase')) {
  // Parse connection string to extract components
  const url = new URL(connectionString);
  dbConfig = {
    host: url.hostname,
    port: parseInt(url.port || '5432', 10),
    database: url.pathname.slice(1) || 'postgres',
    user: url.username,
    password: url.password,
    ssl: {
      rejectUnauthorized: false
    }
  };
} else {
  dbConfig = {
    connectionString: connectionString
  };
}

const db = pgp(dbConfig);

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    console.log(`📡 Database: ${connectionString.replace(/:[^:@]+@/, ':****@')}\n`);

    // Test connection
    await db.one('SELECT NOW() as now');
    console.log('✅ Database connected successfully\n');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

    if (!fs.existsSync(schemaPath)) {
      console.error(`❌ Schema file not found: ${schemaPath}`);
      process.exit(1);
    }

    console.log('📄 Reading schema file...');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Executing migrations...\n');
    
    // Execute schema
    await db.none(schemaSQL);
    
    console.log('✅ Migration completed successfully!\n');

    // List created tables
    const tables = await db.any(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`📊 Created ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`   ✓ ${table.table_name}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    throw error;
  } finally {
    await pgp.end();
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✅ Migration script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error.message);
    process.exit(1);
  });

