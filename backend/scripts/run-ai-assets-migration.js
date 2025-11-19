/**
 * Quick migration script to add ai_assets column to courses table
 * Run with: node backend/scripts/run-ai-assets-migration.js
 */

import db from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function addAiAssetsColumn() {
  try {
    console.log('🚀 Starting migration: Adding ai_assets column to courses table...\n');

    // Check if column already exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'courses' 
      AND column_name = 'ai_assets';
    `;
    
    const existingColumn = await db.oneOrNone(checkQuery);
    
    if (existingColumn) {
      console.log('✅ Column ai_assets already exists. Migration not needed.');
      process.exit(0);
      return;
    }

    // Add the ai_assets column
    console.log('📝 Adding ai_assets column...');
    const alterQuery = `
      ALTER TABLE courses 
      ADD COLUMN ai_assets JSONB DEFAULT '{}'::jsonb;
    `;

    await db.none(alterQuery);
    console.log('✅ Successfully added ai_assets column to courses table.');

    // Add comment to document the column
    console.log('📝 Adding column documentation...');
    const commentQuery = `
      COMMENT ON COLUMN courses.ai_assets IS 
      'AI enrichment assets (course-level): { videos: [], repos: [], suggestedUrls: { youtube: [], github: [] }, enrichedItems: [], generated_at: timestamp }';
    `;

    await db.none(commentQuery);
    console.log('✅ Added documentation comment to ai_assets column.\n');

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Don't close the connection - let the process exit handle it
  }
}

// Run migration
addAiAssetsColumn();

