-- Migration: Add ai_assets column to courses table
-- Date: 2025-01-XX
-- Description: Adds course-level AI enrichment assets storage

-- Check if column already exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'courses' 
        AND column_name = 'ai_assets'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN ai_assets JSONB DEFAULT '{}'::jsonb;
        
        COMMENT ON COLUMN courses.ai_assets IS 
        'AI enrichment assets (course-level): { videos: [], repos: [], suggestedUrls: { youtube: [], github: [] }, enrichedItems: [], generated_at: timestamp }';
        
        RAISE NOTICE 'Column ai_assets added successfully to courses table';
    ELSE
        RAISE NOTICE 'Column ai_assets already exists, skipping migration';
    END IF;
END $$;

