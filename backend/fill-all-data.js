/**
 * Fill All Database Data
 * Comprehensive script to migrate and seed all data
 */

import db, { pgp } from './config/database.js';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

async function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 Running: ${scriptPath}\n`);
    
    const child = spawn('node', [scriptPath], {
      cwd: __dirname,
      env: process.env,
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${scriptPath} completed successfully\n`);
        resolve();
      } else {
        console.error(`\n❌ ${scriptPath} failed with code ${code}\n`);
        reject(new Error(`Script failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`\n❌ Error running ${scriptPath}:`, error.message);
      reject(error);
    });
  });
}

async function verifyDatabase() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 VERIFYING DATABASE STATE');
    console.log('='.repeat(60) + '\n');
    
    // Check connection
    const dbInfo = await db.one('SELECT current_database() as db, NOW() as time');
    console.log(`✅ Connected to database: ${dbInfo.db}`);
    console.log(`✅ Server time: ${dbInfo.time}\n`);
    
    // Check tables
    const tables = await db.any(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`📊 Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`   - ${t.table_name}`));
    
    // Check data counts
    const courseCount = await db.oneOrNone('SELECT COUNT(*)::int as count FROM courses').catch(() => ({ count: 0 }));
    const topicCount = await db.oneOrNone('SELECT COUNT(*)::int as count FROM topics').catch(() => ({ count: 0 }));
    const lessonCount = await db.oneOrNone('SELECT COUNT(*)::int as count FROM lessons').catch(() => ({ count: 0 }));
    
    console.log(`\n📚 Current data counts:`);
    console.log(`   Courses: ${courseCount?.count || 0}`);
    console.log(`   Topics: ${topicCount?.count || 0}`);
    console.log(`   Lessons: ${lessonCount?.count || 0}\n`);
    
    return {
      hasTables: tables.length > 0,
      hasData: (courseCount?.count || 0) > 0
    };
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    return { hasTables: false, hasData: false };
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 FILLING DATABASE WITH ALL DATA');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Verify current state
    const state = await verifyDatabase();
    
    // Step 2: Run migrations if needed
    if (!state.hasTables) {
      console.log('\n📄 Tables missing - running migrations...\n');
      await runScript(join(__dirname, 'scripts', 'migrate.js'));
    } else {
      console.log('\n✅ Tables exist, skipping migrations\n');
    }
    
    // Step 3: Seed data if empty
    if (!state.hasData) {
      console.log('\n🌱 Database is empty - seeding mock data...\n');
      await runScript(join(__dirname, 'scripts', 'seedMockData.js'));
    } else {
      console.log('\n⚠️  Database already has data. Skipping seeding.\n');
      console.log('💡 To reset and reseed, run: npm run db:reset-mock\n');
    }
    
    // Step 4: Final verification
    console.log('\n' + '='.repeat(60));
    console.log('✅ FINAL VERIFICATION');
    console.log('='.repeat(60) + '\n');
    
    const finalState = await verifyDatabase();
    
    if (finalState.hasData) {
      console.log('🎉 DATABASE SUCCESSFULLY FILLED WITH DATA!\n');
    } else {
      console.log('⚠️  Database is still empty. Please check for errors above.\n');
    }
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pgp.end();
  }
  
  console.log('='.repeat(60));
  console.log('✨ Complete!\n');
}

main().catch(err => {
  console.error('\n💥 Unhandled error:', err);
  process.exit(1);
});
