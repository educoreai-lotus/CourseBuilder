/**
 * Full Database Setup Script
 * Checks connection, runs migrations, and seeds mock data
 */

import db, { pgp } from '../config/database.js';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

dotenv.config();

async function checkConnection() {
  try {
    console.log('🔍 Step 1: Checking database connection...\n');
    const result = await db.one('SELECT NOW() as now, current_database() as db');
    console.log(`✅ Connected to database: ${result.db}`);
    console.log(`✅ Server time: ${result.now}\n`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('\n💡 Please check:');
    console.error('   - Is PostgreSQL running?');
    console.error('   - Is DATABASE_URL correct in .env?');
    console.error('   - Are the credentials correct?');
    return false;
  }
}

async function checkTables() {
  try {
    console.log('📊 Step 2: Checking database tables...\n');
    const tables = await db.any(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`   - ${t.table_name}`));
    
    const requiredTables = ['courses', 'topics', 'modules', 'lessons', 'registrations'];
    const existingTableNames = tables.map(t => t.table_name);
    const missingTables = requiredTables.filter(t => !existingTableNames.includes(t));
    
    if (missingTables.length > 0) {
      console.log(`\n⚠️  Missing tables: ${missingTables.join(', ')}`);
      console.log('💡 Running migrations...\n');
      return false;
    }
    
    console.log('✅ All required tables exist\n');
    return true;
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    return false;
  }
}

async function checkData() {
  try {
    console.log('📋 Step 3: Checking existing data...\n');
    const courseCount = await db.one('SELECT COUNT(*)::int as count FROM courses');
    console.log(`📚 Courses: ${courseCount.count}`);
    
    if (courseCount.count === 0) {
      console.log('⚠️  Database is empty - will seed mock data\n');
      return false;
    }
    
    console.log('✅ Data exists in database\n');
    return true;
  } catch (error) {
    console.error('❌ Error checking data:', error.message);
    return false;
  }
}

async function runMigrations() {
  try {
    console.log('🔧 Step 4: Running migrations...\n');
    const { stdout, stderr } = await execAsync('npm run migrate', { cwd: process.cwd() });
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warning')) console.error(stderr);
    console.log('✅ Migrations complete\n');
    return true;
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    return false;
  }
}

async function seedData() {
  try {
    console.log('🌱 Step 5: Seeding mock data...\n');
    const { stdout, stderr } = await execAsync('npm run seed:mock', { cwd: process.cwd() });
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warning')) console.error(stderr);
    console.log('✅ Seeding complete\n');
    return true;
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    if (error.stdout) console.log('Output:', error.stdout);
    if (error.stderr) console.error('Errors:', error.stderr);
    return false;
  }
}

async function verifyData() {
  try {
    console.log('✅ Step 6: Verifying data...\n');
    const courseCount = await db.one('SELECT COUNT(*)::int as count FROM courses');
    const topicCount = await db.one('SELECT COUNT(*)::int as count FROM topics');
    const lessonCount = await db.one('SELECT COUNT(*)::int as count FROM lessons');
    const regCount = await db.one('SELECT COUNT(*)::int as count FROM registrations');
    
    console.log(`📚 Courses: ${courseCount.count}`);
    console.log(`📖 Topics: ${topicCount.count}`);
    console.log(`📝 Lessons: ${lessonCount.count}`);
    console.log(`👤 Registrations: ${regCount.count}`);
    
    if (courseCount.count > 0) {
      const courses = await db.any('SELECT course_name, course_type, status FROM courses LIMIT 5');
      console.log('\n📋 Sample courses:');
      courses.forEach(c => {
        console.log(`   - ${c.course_name} (${c.course_type}) - ${c.status}`);
      });
      console.log('\n🎉 Database setup complete!');
      return true;
    } else {
      console.log('\n❌ Database is still empty');
      return false;
    }
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Full Database Setup\n');
  console.log('='.repeat(50) + '\n');
  
  // Step 1: Check connection
  const connected = await checkConnection();
  if (!connected) {
    await pgp.end();
    process.exit(1);
  }
  
  // Step 2: Check tables
  const tablesExist = await checkTables();
  
  // Step 3: Check if data exists
  const hasData = await checkData();
  
  // Step 4: Run migrations if needed
  if (!tablesExist) {
    const migrated = await runMigrations();
    if (!migrated) {
      await pgp.end();
      process.exit(1);
    }
  }
  
  // Step 5: Seed data if empty
  if (!hasData) {
    const seeded = await seedData();
    if (!seeded) {
      await pgp.end();
      process.exit(1);
    }
  }
  
  // Step 6: Verify final state
  await verifyData();
  
  await pgp.end();
  console.log('\n' + '='.repeat(50));
  console.log('✨ All done!');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
