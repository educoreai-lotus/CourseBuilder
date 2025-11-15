/**
 * Global Test Teardown
 * This runs once after all test suites to clean up database connections
 */
export default async () => {
  try {
    const { default: db, pgp } = await import('./config/database.js');
    
    // Close database pool
    if (db?.$pool?.end) {
      await db.$pool.end();
      console.log('✅ Database pool closed');
    }

    // Close pg-promise instance
    if (pgp?.end) {
      pgp.end();
      console.log('✅ pg-promise instance closed');
    }
  } catch (error) {
    console.error('⚠️  Error closing database connections:', error.message);
    // Don't throw - we want to continue cleanup even if there's an error
  }
  
  console.log('🧹 Test cleanup complete');
};
