/**
 * Push Data to Supabase
 * 
 * This script reads data from the current database (local) and pushes it to Supabase
 * 
 * Usage:
 *   Set SUPABASE_URL or SUPABASE_* environment variables for Supabase connection
 *   Set DATABASE_URL for local database (source)
 *   node scripts/push-data-to-supabase.js
 */

import pgPromise from 'pg-promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pgp = pgPromise({
  error(err, e) {
    if (e.cn) {
      console.error('❌ Connection error:', err.message);
    }
  }
});

// Local database connection (source)
const localDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'coursebuilder',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const localConnectionString = process.env.DATABASE_URL || 
  `postgresql://${localDbConfig.user}:${localDbConfig.password}@${localDbConfig.host}:${localDbConfig.port}/${localDbConfig.database}`;

// Supabase connection (target)
const supabaseConfig = {
  host: process.env.SUPABASE_HOST,
  port: parseInt(process.env.SUPABASE_PORT || '5432', 10),
  database: process.env.SUPABASE_DB || 'postgres',
  user: process.env.SUPABASE_USER || 'postgres',
  password: process.env.SUPABASE_PASSWORD,
  ssl: process.env.SUPABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false,
};

const supabaseConnectionString = process.env.SUPABASE_URL || 
  (supabaseConfig.host ? 
    `postgresql://${supabaseConfig.user}:${supabaseConfig.password}@${supabaseConfig.host}:${supabaseConfig.port}/${supabaseConfig.database}` :
    null);

if (!supabaseConnectionString) {
  console.error('❌ SUPABASE_URL or SUPABASE_* environment variables are required');
  console.error('\n💡 Set SUPABASE_URL with your Supabase connection string');
  console.error('   Or set SUPABASE_HOST, SUPABASE_PORT, SUPABASE_DB, SUPABASE_USER, SUPABASE_PASSWORD');
  process.exit(1);
}

const localDb = pgp(localConnectionString);
const supabaseDb = pgp(supabaseConnectionString);

async function pushDataToSupabase() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 PUSHING DATA TO SUPABASE');
  console.log('='.repeat(70) + '\n');
  
  try {
    // Verify connections
    console.log('🔌 Verifying connections...');
    await localDb.connect();
    console.log('✅ Connected to local database');
    await supabaseDb.connect();
    console.log('✅ Connected to Supabase\n');
    
    // Tables to copy (in order due to foreign key constraints)
    const tables = [
      'courses',
      'topics',
      'modules',
      'lessons',
      'assessments',
      'registrations',
      'feedback',
      'versions'
    ];
    
    // First, clear existing data in Supabase (optional - comment out if you want to append)
    console.log('🧹 Clearing existing data in Supabase...');
    for (const table of tables.reverse()) { // Reverse order for deletion
      try {
        await supabaseDb.none(`TRUNCATE TABLE ${table} CASCADE`);
        console.log(`   ✓ Cleared ${table}`);
      } catch (error) {
        console.warn(`   ⚠ Could not clear ${table}: ${error.message}`);
      }
    }
    console.log('');
    
    // Copy data from local to Supabase
    console.log('📦 Copying data to Supabase...\n');
    
    for (const table of tables.reverse()) { // Reverse back for insertion
      try {
        // Get all data from local database
        const data = await localDb.any(`SELECT * FROM ${table}`);
        
        if (data.length === 0) {
          console.log(`   ⏭  ${table}: No data to copy`);
          continue;
        }
        
        // Get column names
        const columns = Object.keys(data[0]);
        const columnList = columns.join(', ');
        
        // Build insert query
        const values = data.map((row, idx) => {
          const rowValues = columns.map((col, colIdx) => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'object') {
              // Handle JSONB and arrays
              return `$${idx * columns.length + colIdx + 1}::jsonb`;
            }
            return `$${idx * columns.length + colIdx + 1}`;
          });
          return `(${rowValues.join(', ')})`;
        }).join(', ');
        
        // Flatten values for pg-promise
        const flatValues = data.flatMap(row => 
          columns.map(col => {
            const value = row[col];
            if (typeof value === 'object' && value !== null) {
              return JSON.stringify(value);
            }
            return value;
          })
        );
        
        // Insert data
        const query = `INSERT INTO ${table} (${columnList}) VALUES ${values}`;
        await supabaseDb.none(query, flatValues);
        
        console.log(`   ✅ ${table}: Copied ${data.length} row(s)`);
      } catch (error) {
        console.error(`   ❌ ${table}: Error - ${error.message}`);
        // Continue with other tables
      }
    }
    
    // Verify data was copied
    console.log('\n' + '='.repeat(70));
    console.log('✅ VERIFICATION');
    console.log('='.repeat(70) + '\n');
    
    for (const table of tables) {
      try {
        const localCount = await localDb.one(`SELECT COUNT(*)::int as count FROM ${table}`);
        const supabaseCount = await supabaseDb.one(`SELECT COUNT(*)::int as count FROM ${table}`);
        const match = localCount.count === supabaseCount.count ? '✅' : '⚠️';
        console.log(`${match} ${table}: Local=${localCount.count}, Supabase=${supabaseCount.count}`);
      } catch (error) {
        console.error(`   ❌ ${table}: Could not verify - ${error.message}`);
      }
    }
    
    console.log('\n🎉 Data successfully pushed to Supabase!\n');
    
  } catch (error) {
    console.error('\n❌ Error pushing data to Supabase:');
    console.error(`   ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    pgp.end();
  }
}

// Run the script
pushDataToSupabase();


