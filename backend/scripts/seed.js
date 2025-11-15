import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { pgp } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Seed database with test data
 * 
 * NOTE: The old seed.sql file has been removed as it was incompatible
 * with the new database schema. To seed the database, create a new seed.sql
 * file that matches the new schema structure:
 * 
 * - Use 'id' instead of 'course_id'
 * - Use 'course_type' ('learner_specific' | 'trainer') instead of 'visibility'
 * - Match the new table structures (courses, topics, modules, lessons, etc.)
 * 
 * Or manually insert test data using the repositories/services.
 */
async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');
    
    if (!fs.existsSync(seedPath)) {
      console.log('⚠️  No seed.sql file found.');
      console.log('   The old seed.sql was removed as it was incompatible with the new schema.');
      console.log('   To seed the database:');
      console.log('   1. Create a new seed.sql file matching the new schema');
      console.log('   2. Or use the API/repositories to insert test data');
      console.log('\n✅ Seeding skipped (no seed file)');
      return;
    }

    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    console.log('📝 Executing seed.sql...');
    
    // Handle dollar-quoted strings properly
    let cleanedSQL = seedSQL.replace(/--.*$/gm, '');
    const statements = [];
    let currentStatement = '';
    let inDollarQuote = false;
    let dollarTag = '';
    
    for (let i = 0; i < cleanedSQL.length; i++) {
      const char = cleanedSQL[i];
      const nextChar = cleanedSQL[i + 1];
      
      if (!inDollarQuote && char === '$' && nextChar === '$') {
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
    
    if (currentStatement.trim().length > 10) {
      statements.push(currentStatement.trim());
    }
    
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
        if (err.message.includes('already exists') || 
            err.message.includes('does not exist')) {
          skipCount++;
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

    console.log('✅ Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    pgp.end();
  }
}

// Run seed if called directly
seed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

export default seed;
