/**
 * ⚠️ DISABLED: Local database setup is no longer supported
 * 
 * This script is disabled because we only use Supabase databases now.
 * 
 * For local development:
 * - Set DATABASE_URL in .env to point to your Supabase database
 * - Run: npm run db:migrate
 * - Run: npm run db:seed
 * 
 * For team database:
 * - Set TEAM_DATABASE_URL in .env
 * - Run: npm run db:migrate:team
 * - Run: npm run db:seed:team
 */

console.error('❌ ERROR: Local database setup is no longer supported!');
console.error('');
console.error('We only use Supabase databases now.');
console.error('');
console.error('For local development:');
console.error('  1. Set DATABASE_URL in .env to your Supabase database');
console.error('  2. Run: npm run db:migrate');
console.error('  3. Run: npm run db:seed');
console.error('');
console.error('For team database:');
console.error('  1. Set TEAM_DATABASE_URL in .env');
console.error('  2. Run: npm run db:migrate:team');
console.error('  3. Run: npm run db:seed:team');
console.error('');
process.exit(1);
