import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { pgp } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

// Ensure DATABASE_URL is set (required for Supabase)
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is required!');
  console.error('   Please set DATABASE_URL in your .env file');
  console.error('   DATABASE_URL should point to your Supabase database');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run database migration
 * Executes schema.sql to create all tables and indexes
 */
async function migrate() {
  try {
    process.stdout.write('🔄 Starting database migration...\n');
    process.stdout.flush?.();

    // Read schema.sql file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    console.log(`📄 Reading schema from: ${schemaPath}`);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log(`📝 Schema file read (${schemaSQL.length} characters)`);

    // Execute schema - split and execute each statement individually
    console.log('📝 Executing schema.sql...');
    
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

    console.log('✅ Database migration completed successfully!');
    console.log('📊 Tables created: courses, modules, topics, lessons, registrations, feedback, assessments, versions');

    // Verify tables exist
    const tables = await db.any(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('\n📋 Created tables:');
    tables.forEach(table => {
      console.log(`   ✓ ${table.table_name}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    // Close database connection pool
    pgp.end();
  }
}

// Run migration if called directly
migrate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

export default migrate;

