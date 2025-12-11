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
    // Use same schema path as migrate.js
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

    if (!fs.existsSync(schemaPath)) {
      console.error(`❌ Schema file not found: ${schemaPath}`);
      process.exit(1);
    }

    console.log('📄 Reading schema file...');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log(`📝 Schema file read (${schemaSQL.length} characters)`);

    console.log('🚀 Executing migrations...\n');
    
    // Execute schema - split and execute each statement individually (same logic as migrate.js)
    // Clean and split SQL statements
    // Handle dollar-quoted strings (functions) properly
    let cleanedSQL = schemaSQL.replace(/--.*$/gm, ''); // Remove comments
    
    // Split by semicolon, but preserve dollar-quoted blocks
    const statements = [];
    let currentStatement = '';
    let inDollarQuote = false;
    let dollarTag = '';
    
    for (let i = 0; i < cleanedSQL.length; i++) {
      const char = cleanedSQL[i];
      const nextChar = cleanedSQL[i + 1];
      
      if (!inDollarQuote && char === '$' && nextChar === '$') {
        // Find dollar tag
        let tagEnd = cleanedSQL.indexOf('$$', i + 2);
        if (tagEnd === -1) tagEnd = cleanedSQL.length;
        dollarTag = cleanedSQL.substring(i, tagEnd + 2);
        inDollarQuote = true;
        currentStatement += dollarTag;
        i = tagEnd + 1;
        continue;
      }
      
      if (inDollarQuote && cleanedSQL.substring(i).startsWith(dollarTag)) {
        inDollarQuote = false;
        currentStatement += dollarTag;
        i += dollarTag.length - 1;
        dollarTag = '';
        continue;
      }
      
      currentStatement += char;
      
      if (!inDollarQuote && char === ';') {
        const trimmed = currentStatement.trim();
        if (trimmed.length > 10) {
          statements.push(trimmed);
        }
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim().length > 10) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`   Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await db.none(stmt);
        successCount++;
        if ((i + 1) % 10 === 0) {
          console.log(`   ✓ Executed ${i + 1}/${statements.length} statements...`);
        }
      } catch (err) {
        // Ignore expected errors for DROP/CREATE IF EXISTS
        if (err.message.includes('already exists') || 
            err.message.includes('does not exist')) {
          skipCount++;
          // Silently skip
        } else {
          console.error(`\n   ❌ Error at statement ${i + 1}:`);
          console.error(`   ${err.message}`);
          console.error(`   Statement preview: ${stmt.substring(0, 150)}...\n`);
          throw err;
        }
      }
    }
    
    console.log(`\n   ✅ Successfully executed: ${successCount} statements`);
    if (skipCount > 0) {
      console.log(`   ⏭️  Skipped (expected): ${skipCount} statements`);
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('📊 Tables created: courses, modules, topics, lessons, registrations, feedback, assessments, versions\n');

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

