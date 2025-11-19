import express from 'express';
import { enrichAssets } from '../services/enrichment/AssetEnrichmentService.js';
import courseRepository from '../repositories/CourseRepository.js';

const router = express.Router();

router.post('/assets', async (req, res) => {
  const { topic, skills = [], maxItems = 6, course_id } = req.body || {};

  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ 
      error: 'topic is required',
      message: 'The request body must include a "topic" field (string)'
    });
  }

  try {
    console.log('[enrichmentAssetsRoutes] Request received:', { 
      topic, 
      skillsCount: Array.isArray(skills) ? skills.length : 0,
      maxItems,
      course_id: course_id || 'none'
    });

    const result = await enrichAssets({
      topic,
      skills: Array.isArray(skills) ? skills : [],
      maxItems: Number.isInteger(maxItems) && maxItems > 0 ? maxItems : 6
    });

    // Add generated_at timestamp
    const enrichedResult = {
      ...result,
      generated_at: new Date().toISOString()
    };

    // If course_id is provided, save assets to course
    if (course_id) {
      try {
        const course = await courseRepository.findById(course_id);
        if (course) {
          await courseRepository.update(course_id, { ai_assets: enrichedResult });
          console.log('[enrichmentAssetsRoutes] Assets saved to course:', course_id);
          // Add saved flag to response so frontend knows it was saved
          enrichedResult._savedToCourse = true;
        } else {
          console.warn('[enrichmentAssetsRoutes] Course not found:', course_id);
          enrichedResult._saveError = 'Course not found';
        }
      } catch (saveError) {
        console.error('[enrichmentAssetsRoutes] Failed to save assets to course:', saveError.message);
        console.error('[enrichmentAssetsRoutes] Save error stack:', saveError.stack);
        enrichedResult._saveError = saveError.message;
        // Still return the enriched result, but with error flag
      }
    } else {
      console.log('[enrichmentAssetsRoutes] No course_id provided, skipping save to course');
    }

    console.log('[enrichmentAssetsRoutes] Success:', {
      tagsCount: result?.tags?.length || 0,
      videosCount: result?.videos?.length || 0,
      reposCount: result?.repos?.length || 0,
      savedToCourse: !!course_id
    });

    return res.json(enrichedResult);
  } catch (error) {
    console.error('[enrichmentAssetsRoutes] Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return res.status(500).json({ 
      error: 'Failed to enrich assets',
      message: error.message || 'An unexpected error occurred while enriching assets'
    });
  }
});

export default router;

