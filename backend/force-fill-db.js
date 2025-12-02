/**
 * Force Fill Database
 * Ensures database is populated with all data
 */

import db, { pgp } from './config/database.js';
import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config();

// Check if we should fill Supabase directly
const shouldFillSupabase = process.env.SUPABASE_URL || (process.env.SUPABASE_HOST && process.env.SUPABASE_PASSWORD);
let supabaseDb = null;
let supabasePgp = null;

if (shouldFillSupabase) {
  const supabasePgpInstance = pgPromise({
    error(err, e) {
      if (e.cn) {
        console.error('❌ Supabase connection error:', err.message);
      }
    }
  });

  const supabaseConfig = {
    host: process.env.SUPABASE_HOST,
    port: parseInt(process.env.SUPABASE_PORT || '5432', 10),
    database: process.env.SUPABASE_DB || 'postgres',
    user: process.env.SUPABASE_USER || 'postgres',
    password: process.env.SUPABASE_PASSWORD,
    ssl: process.env.SUPABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false,
  };

  const supabaseConnectionString = process.env.SUPABASE_URL || 
    `postgresql://${supabaseConfig.user}:${supabaseConfig.password}@${supabaseConfig.host}:${supabaseConfig.port}/${supabaseConfig.database}`;

  supabaseDb = supabasePgpInstance(supabaseConnectionString);
  supabasePgp = supabasePgpInstance;
  
  console.log('🔗 Supabase URL detected - will fill Supabase directly\n');
}

async function forceFillDatabase() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 FORCE FILLING DATABASE WITH ALL DATA');
  console.log('='.repeat(70) + '\n');
  
  try {
    // Import and run migrations
    console.log('📄 Step 1: Running migrations...\n');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout: migrateOut, stderr: migrateErr } = await execAsync('npm run migrate', {
        cwd: process.cwd(),
        env: process.env
      });
      if (migrateOut) console.log(migrateOut);
      if (migrateErr && !migrateErr.includes('warning')) console.error('Migration errors:', migrateErr);
      console.log('✅ Migrations completed\n');
    } catch (migrateError) {
      console.error('⚠️  Migration error (continuing anyway):', migrateError.message);
    }
    
    // Import and run seeding
    console.log('🌱 Step 2: Seeding mock data...\n');
    try {
      // If Supabase URL is set, temporarily override DATABASE_URL to fill Supabase
      const originalDatabaseUrl = process.env.DATABASE_URL;
      if (shouldFillSupabase && supabaseDb) {
        // Temporarily set DATABASE_URL to Supabase for seeding
        const supabaseConfig = {
          host: process.env.SUPABASE_HOST,
          port: parseInt(process.env.SUPABASE_PORT || '5432', 10),
          database: process.env.SUPABASE_DB || 'postgres',
          user: process.env.SUPABASE_USER || 'postgres',
          password: process.env.SUPABASE_PASSWORD,
        };
        const supabaseConnectionString = process.env.SUPABASE_URL || 
          `postgresql://${supabaseConfig.user}:${supabaseConfig.password}@${supabaseConfig.host}:${supabaseConfig.port}/${supabaseConfig.database}`;
        process.env.DATABASE_URL = supabaseConnectionString;
        console.log('   📍 Filling Supabase database...\n');
      }
      
      const seedModule = await import('./scripts/seedMockData.js');
      await seedModule.default();
      
      // Restore original DATABASE_URL
      if (shouldFillSupabase) {
        if (originalDatabaseUrl) {
          process.env.DATABASE_URL = originalDatabaseUrl;
        } else {
          delete process.env.DATABASE_URL;
        }
      }
      
      console.log('✅ Seeding completed\n');
    } catch (seedError) {
      console.error('❌ Seeding failed:', seedError.message);
      console.error(seedError.stack);
      throw seedError;
    }
    
    // Verify - use Supabase connection if available, otherwise use local
    const verifyDb = shouldFillSupabase && supabaseDb ? supabaseDb : db;
    const dbName = shouldFillSupabase ? 'Supabase' : 'local database';
    
    console.log('='.repeat(70));
    console.log(`✅ VERIFICATION (${dbName})`);
    console.log('='.repeat(70) + '\n');
    
    const courseCount = await verifyDb.one('SELECT COUNT(*)::int as count FROM courses');
    const topicCount = await verifyDb.one('SELECT COUNT(*)::int as count FROM topics');
    const moduleCount = await verifyDb.one('SELECT COUNT(*)::int as count FROM modules');
    const lessonCount = await verifyDb.one('SELECT COUNT(*)::int as count FROM lessons');
    const regCount = await verifyDb.one('SELECT COUNT(*)::int as count FROM registrations');
    
    console.log(`📚 Courses: ${courseCount.count}`);
    console.log(`📖 Topics: ${topicCount.count}`);
    console.log(`📦 Modules: ${moduleCount.count}`);
    console.log(`📝 Lessons: ${lessonCount.count}`);
    console.log(`👤 Registrations: ${regCount.count}\n`);
    
    if (courseCount.count > 0) {
      console.log(`🎉 ${dbName.toUpperCase()} SUCCESSFULLY FILLED!\n`);
    } else {
      console.log(`❌ ${dbName} is still empty. Please check for errors above.\n`);
    }
    
  } catch (error) {
    console.error('\n💥 Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pgp.end();
    if (supabasePgp) {
      await supabasePgp.end();
    }
  }
}

forceFillDatabase();
