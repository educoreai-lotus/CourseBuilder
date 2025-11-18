/**
 * Migration script to add ai_assets column to courses table
 * Run this script to update existing database schema
 */

import db, { pgp } from '../config/database.js';

async function addAiAssetsColumn() {
  try {
    console.log('Starting migration: Adding ai_assets column to courses table...');

    // Check if column already exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'courses' 
      AND column_name = 'ai_assets';
    `;
    
    const existingColumn = await db.oneOrNone(checkQuery);
    
    if (existingColumn) {
      console.log('✓ Column ai_assets already exists. Skipping migration.');
      return;
    }

    // Add the ai_assets column
    const alterQuery = `
      ALTER TABLE courses 
      ADD COLUMN ai_assets JSONB DEFAULT '{}'::jsonb;
    `;

    await db.none(alterQuery);
    console.log('✓ Successfully added ai_assets column to courses table.');

    // Add comment to document the column
    const commentQuery = `
      COMMENT ON COLUMN courses.ai_assets IS 
      'AI enrichment assets (course-level): { videos: [], repos: [], suggestedUrls: { youtube: [], github: [] }, enrichedItems: [], generated_at: timestamp }';
    `;

    await db.none(commentQuery);
    console.log('✓ Added documentation comment to ai_assets column.');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pgp.end();
  }
}

// Run migration
addAiAssetsColumn()
  .then(() => {
    console.log('Migration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

