/**
 * Database Diagnostic Script
 * Checks connection, tables, and data status
 */

import db, { pgp } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function diagnose() {
  console.log('🔍 Database Diagnostic Report\n');
  console.log('='.repeat(60) + '\n');
  
  try {
    // 1. Check connection
    console.log('1️⃣  Database Connection:');
    try {
      const result = await db.one('SELECT NOW() as now, current_database() as db, version() as version');
      console.log(`   ✅ Connected to: ${result.db}`);
      console.log(`   ✅ Server time: ${result.now}`);
      console.log(`   ✅ PostgreSQL version: ${result.version.split(',')[0]}\n`);
    } catch (error) {
      console.log(`   ❌ Connection failed: ${error.message}\n`);
      console.log('   💡 Check your .env file DATABASE_URL setting');
      await pgp.end();
      return;
    }
    
    // 2. Check tables
    console.log('2️⃣  Database Tables:');
    try {
      const tables = await db.any(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      if (tables.length === 0) {
        console.log('   ⚠️  No tables found!');
        console.log('   💡 Run: npm run migrate\n');
      } else {
        console.log(`   ✅ Found ${tables.length} tables:`);
        tables.forEach(t => console.log(`      - ${t.table_name}`));
        console.log('');
      }
    } catch (error) {
      console.log(`   ❌ Error checking tables: ${error.message}\n`);
    }
    
    // 3. Check data counts
    console.log('3️⃣  Data Counts:');
    try {
      const tables = ['courses', 'topics', 'modules', 'lessons', 'registrations', 'feedback'];
      
      for (const table of tables) {
        try {
          const count = await db.one(`SELECT COUNT(*)::int as count FROM ${table}`);
          const status = count.count > 0 ? '✅' : '⚪';
          console.log(`   ${status} ${table}: ${count.count} rows`);
        } catch (error) {
          console.log(`   ❌ ${table}: Error - ${error.message}`);
        }
      }
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error checking data: ${error.message}\n`);
    }
    
    // 4. Sample data
    console.log('4️⃣  Sample Courses:');
    try {
      const courses = await db.any(`
        SELECT id, course_name, course_type, status, created_at 
        FROM courses 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      if (courses.length === 0) {
        console.log('   ⚪ No courses found');
        console.log('   💡 Run: npm run seed:mock\n');
      } else {
        console.log(`   ✅ Found ${courses.length} courses:`);
        courses.forEach(c => {
          console.log(`      - ${c.course_name}`);
          console.log(`        Type: ${c.course_type}, Status: ${c.status}`);
          console.log(`        ID: ${c.id.substring(0, 8)}...`);
        });
        console.log('');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    // 5. Recommendations
    console.log('5️⃣  Recommendations:');
    
    try {
      const courseCount = await db.one('SELECT COUNT(*)::int as count FROM courses');
      const tableCount = await db.any(`
        SELECT COUNT(*)::int as count
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);
      
      if (tableCount[0].count === 0) {
        console.log('   🔧 Run migrations: npm run migrate');
      }
      
      if (courseCount.count === 0) {
        console.log('   🌱 Seed mock data: npm run seed:mock');
        console.log('   🔄 Or reset completely: npm run db:reset-mock');
      } else {
        console.log('   ✅ Database has data');
      }
    } catch (error) {
      console.log('   ⚠️  Could not generate recommendations');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Diagnostic complete!\n');
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pgp.end();
  }
}

diagnose().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
