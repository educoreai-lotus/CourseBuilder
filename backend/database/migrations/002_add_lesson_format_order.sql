-- Migration: Add format_order column to lessons table
-- Date: 2025-12-16
-- Description: Adds jsonb format_order column for content format ordering per lesson

DO $$
BEGIN
    -- Add column if it does not exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'lessons'
          AND column_name = 'format_order'
    ) THEN
        ALTER TABLE lessons
        ADD COLUMN format_order jsonb NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    -- Add CHECK constraint if it does not exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'lessons'
          AND tc.constraint_name = 'lessons_format_order_is_array_chk'
    ) THEN
        ALTER TABLE lessons
        ADD CONSTRAINT lessons_format_order_is_array_chk
        CHECK (jsonb_typeof(format_order) = 'array');
    END IF;
END $$;


