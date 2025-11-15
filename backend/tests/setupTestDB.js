/**
 * Test Database Setup Script
 * This script runs before all tests to:
 * 1. Connect to the test database
 * 2. Drop all tables (clean slate)
 * 3. Run all migrations
 * 4. Optionally seed minimal test data
 */

import db from '../config/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Drop all tables in the test database (clean slate)
 */
async function dropAllTables() {
  try {
    console.log('🧹 Cleaning test database...');
    
    // Get all table names from public schema
    const tables = await db.any(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    if (tables.length === 0) {
      console.log('   ✓ No tables to drop');
      return;
    }

    // Drop all tables with CASCADE to handle foreign keys
    for (const table of tables) {
      try {
        await db.none(`DROP TABLE IF EXISTS ${table.tablename} CASCADE`);
      } catch (error) {
        // Ignore errors for tables that don't exist
        if (!error.message.includes('does not exist')) {
          console.warn(`   ⚠️  Error dropping table ${table.tablename}:`, error.message);
        }
      }
    }

    // Drop all sequences
    const sequences = await db.any(`
      SELECT sequencename 
      FROM pg_sequences 
      WHERE schemaname = 'public'
    `);

    for (const seq of sequences) {
      try {
        await db.none(`DROP SEQUENCE IF EXISTS ${seq.sequencename} CASCADE`);
      } catch (error) {
        // Ignore errors
      }
    }

    console.log(`   ✓ Dropped ${tables.length} table(s)`);
  } catch (error) {
    console.error('❌ Error dropping tables:', error.message);
    throw error;
  }
}

/**
 * Run all migrations from schema.sql
 * Uses the same SQL parsing logic as migrate.js
 */
async function runMigrations() {
  try {
    console.log('📄 Running migrations...');
    
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf8');

    // Clean and split SQL statements using same logic as migrate.js
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
    
    console.log(`   Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let skipCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await db.none(stmt);
        successCount++;
        if ((i + 1) % 10 === 0) {
          console.log(`   ✓ Executed ${i + 1}/${statements.length} statements...`);
        }
      } catch (error) {
        // Some statements might fail if they're CREATE IF NOT EXISTS or similar
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('duplicate')) {
          skipCount++;
          continue;
        }
        // Re-throw unexpected errors
        throw error;
      }
    }

    console.log(`   ✓ Executed ${successCount} statement(s), skipped ${skipCount}`);
  } catch (error) {
    console.error('❌ Error running migrations:', error.message);
    throw error;
  }
}

/**
 * Verify test database connection and name
 */
async function verifyTestDatabase() {
  try {
    const result = await db.one('SELECT current_database() as db_name');
    const dbName = result.db_name;

    if (!dbName.includes('test')) {
      console.warn(`⚠️  WARNING: Database name "${dbName}" does not contain "test".`);
      console.warn('   This might not be the test database. Proceed with caution.');
    } else {
      console.log(`✅ Connected to test database: ${dbName}`);
    }
  } catch (error) {
    console.error('❌ Error verifying test database:', error.message);
    throw error;
  }
}

/**
 * Main setup function
 */
export default async function setupTestDB() {
  try {
    console.log('\n🧪 Setting up test database...\n');

    // Verify we're connected to test database
    await verifyTestDatabase();

    // Clean slate: drop all tables
    await dropAllTables();

    // Run migrations
    await runMigrations();

    console.log('\n✅ Test database setup complete!\n');
  } catch (error) {
    console.error('\n❌ Test database setup failed:', error.message);
    console.error(error);
    throw error;
  }
}
