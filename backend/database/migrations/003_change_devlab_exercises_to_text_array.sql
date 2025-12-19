-- Migration: Change devlab_exercises from JSONB to TEXT[]
-- DevLab exercises are stored as array of HTML strings, not JSONB objects

-- Step 1: Extract HTML from existing JSONB objects and convert to TEXT[]
-- Handle both formats: [{html: "..."}] and ["..."]
UPDATE lessons
SET devlab_exercises = (
  SELECT array_agg(html_value)
  FROM (
    SELECT 
      CASE 
        WHEN jsonb_typeof(elem) = 'object' AND elem ? 'html' THEN elem->>'html'
        WHEN jsonb_typeof(elem) = 'string' THEN elem::text
        ELSE NULL
      END AS html_value
    FROM jsonb_array_elements(COALESCE(devlab_exercises, '[]'::jsonb)) AS elem
    WHERE CASE 
      WHEN jsonb_typeof(elem) = 'object' AND elem ? 'html' THEN elem->>'html' IS NOT NULL
      WHEN jsonb_typeof(elem) = 'string' THEN elem::text IS NOT NULL
      ELSE false
    END
  ) AS extracted
)
WHERE devlab_exercises IS NOT NULL 
  AND jsonb_typeof(devlab_exercises) = 'array'
  AND jsonb_array_length(devlab_exercises) > 0;

-- Step 2: Drop the old column
ALTER TABLE lessons DROP COLUMN IF EXISTS devlab_exercises;

-- Step 3: Add new column as TEXT[]
ALTER TABLE lessons ADD COLUMN devlab_exercises TEXT[] DEFAULT NULL;

-- Step 4: Remove the old JSONB constraint
-- (The constraint will be automatically dropped with the column)

-- Step 5: Add comment
COMMENT ON COLUMN lessons.devlab_exercises IS 'DevLab exercises as array of HTML strings. Each element is a complete HTML document from Content Studio. Stored as TEXT[], not JSONB.';

