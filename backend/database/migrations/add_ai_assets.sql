-- Quick SQL migration to add ai_assets column
-- Run this directly in your database or via psql

-- Check if column exists and add if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'courses' 
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

