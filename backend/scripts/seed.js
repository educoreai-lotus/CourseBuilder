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
 * Executes seed.sql to populate tables with test data
 */
async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // Read seed.sql file
    const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');

    // Execute seed SQL - split statements like in migrate.js
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
    
    console.log(`   Executing ${statements.length} seed statements...`);
    
    for (const stmt of statements) {
      try {
        await db.none(stmt);
      } catch (err) {
        // Ignore expected errors (duplicates, already exists, etc.)
        if (!err.message.includes('already exists') && 
            !err.message.includes('does not exist') &&
            !err.message.includes('duplicate key') &&
            !err.message.includes('violates unique constraint')) {
          console.error(`   ❌ Error: ${err.message}`);
          throw err;
        }
      }
    }

    // Verify data loaded
    const courseCount = await db.one('SELECT COUNT(*) as count FROM courses');
    const moduleCount = await db.one('SELECT COUNT(*) as count FROM modules');
    const topicCount = await db.one('SELECT COUNT(*) as count FROM topics');
    const lessonCount = await db.one('SELECT COUNT(*) as count FROM lessons');
    const registrationCount = await db.one('SELECT COUNT(*) as count FROM registrations');
    const feedbackCount = await db.one('SELECT COUNT(*) as count FROM feedback');
    const assessmentCount = await db.one('SELECT COUNT(*) as count FROM assessments');

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Seed data summary:');
    console.log(`   Courses: ${courseCount.count}`);
    console.log(`   Modules: ${moduleCount.count}`);
    console.log(`   Topics: ${topicCount.count}`);
    console.log(`   Lessons: ${lessonCount.count}`);
    console.log(`   Registrations: ${registrationCount.count}`);
    console.log(`   Feedback: ${feedbackCount.count}`);
    console.log(`   Assessments: ${assessmentCount.count}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    // Close database connection pool
    pgp.end();
  }
}

// Run seed if called directly
seed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

export default seed;

