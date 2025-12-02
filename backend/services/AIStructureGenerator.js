/**
 * AI Structure Generator Service
 * Analyzes lesson content from Content Studio and generates topic/module structure
 */

import OpenAI from 'openai';

/**
 * Generate topic and module structure based on lesson content
 * @param {Object} params - Parameters for structure generation
 * @param {Array} params.learningPath - Original learning path from Learner AI
 * @param {Array} params.skills - Skills array
 * @param {Array} params.allLessons - All lessons fetched from Content Studio
 * @returns {Promise<Object>} Structure with topics, modules, and lesson assignments
 */
export async function generateAIStructure({ learningPath = [], skills = [], allLessons = [] }) {
  try {
    console.log('[AI Structure Generator] Generating structure from lesson content...');
    console.log(`[AI Structure Generator] Total lessons: ${allLessons.length}`);

    if (!allLessons || allLessons.length === 0) {
      console.warn('[AI Structure Generator] No lessons provided, using fallback structure');
      return generateFallbackStructure(learningPath, allLessons);
    }

    // Prepare lesson content summary for AI
    const lessonContentSummary = allLessons.map((lesson, index) => {
      const lessonId = lesson.lessonId || lesson.id || `lesson_${index}`;
      const lessonName = lesson.lessonName || lesson.title || lesson.name || `Lesson ${index + 1}`;
      const description = lesson.description || 
                         lesson.lessonDescription || 
                         lesson.summary || 
                         lesson.content_data?.summary ||
                         (typeof lesson.content_data === 'string' ? lesson.content_data : '') ||
                         '';
      
      // Extract content from content_data array if available
      let contentText = '';
      if (Array.isArray(lesson.content_data)) {
        contentText = lesson.content_data
          .map(item => {
            if (typeof item === 'string') return item;
            if (item?.content) return item.content;
            if (item?.text) return item.text;
            return '';
          })
          .filter(Boolean)
          .join(' ');
      } else if (typeof lesson.content_data === 'string') {
        contentText = lesson.content_data;
      }

      return {
        lesson_id: lessonId,
        lesson_name: lessonName,
        description: description,
        content_preview: contentText.substring(0, 500), // Limit content preview
        skills: Array.isArray(lesson.skills) ? lesson.skills : (lesson.skills ? [lesson.skills] : [])
      };
    });

    // Build AI prompt
    const learningPathSummary = learningPath.map(t => t.topicName || t.name || '').filter(Boolean).join(', ');
    const skillsList = Array.isArray(skills) ? skills.join(', ') : 'None';

    const prompt = `You are an expert learning experience designer. You will receive a list of lesson contents created by Content Studio.

Use ONLY this lesson content to decide the Topic names and Module names.

Learning Path: ${learningPathSummary || 'Not specified'}
Skills: ${skillsList}

Lesson Contents:
${JSON.stringify(lessonContentSummary, null, 2)}

Your tasks:
1. Group the lessons into 3-6 Topics based on their themes and concepts.
2. Inside each Topic, group lessons into 2-5 Modules based on shared themes.
3. The Topic names MUST reflect the main concepts of the lessons under them.
4. The Module names MUST summarize the shared theme of the lessons inside each module.
5. Keep the names academic, short, and professional (2-5 words max).
6. Ensure every lesson is assigned to exactly one module.

Return JSON ONLY in this exact format:
{
  "topics": [
    {
      "topic_name": "string",
      "topic_description": "string (optional, brief description)",
      "modules": [
        {
          "module_name": "string",
          "module_description": "string (optional)",
          "lesson_ids": ["lesson_id_1", "lesson_id_2", ...]
        }
      ]
    }
  ]
}

IMPORTANT:
- Every lesson_id from the input must appear exactly once in the lesson_ids arrays
- Topic names should be conceptual/thematic (e.g., "Introduction to React", "State Management")
- Module names should be specific sub-topics (e.g., "React Fundamentals", "Hooks and Effects")
- Return valid JSON only, no markdown, no explanations.`;

    // Call OpenAI with JSON mode support
    console.log('[AI Structure Generator] Calling OpenAI to generate structure...');
    
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[AI Structure Generator] OPENAI_API_KEY not configured, using fallback');
      return generateFallbackStructure(learningPath, allLessons);
    }

    let aiResponse;
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const response = await client.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: 'You are an expert learning experience designer. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' } // Force JSON output
      });

      aiResponse = response.choices[0].message.content;
    } catch (error) {
      console.error('[AI Structure Generator] OpenAI API error:', error.message);
      return generateFallbackStructure(learningPath, allLessons);
    }

    // Parse AI response
    let parsedStructure;
    try {
      // Clean markdown fences if present
      let cleanedResponse = aiResponse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      // Extract JSON from response
      const firstBrace = cleanedResponse.indexOf('{');
      const lastBrace = cleanedResponse.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error('No JSON found in AI response');
      }

      const jsonString = cleanedResponse.slice(firstBrace, lastBrace + 1);
      parsedStructure = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('[AI Structure Generator] Failed to parse AI response:', parseError.message);
      console.error('[AI Structure Generator] Raw response:', aiResponse.substring(0, 500));
      return generateFallbackStructure(learningPath, allLessons);
    }

    // Validate structure
    const validationResult = validateAIStructure(parsedStructure, allLessons);
    
    if (!validationResult.isValid) {
      console.warn('[AI Structure Generator] AI structure validation failed:', validationResult.errors);
      console.warn('[AI Structure Generator] Using fallback structure');
      return generateFallbackStructure(learningPath, allLessons);
    }

    console.log('[AI Structure Generator] ✅ Successfully generated structure');
    console.log(`[AI Structure Generator] Topics: ${parsedStructure.topics?.length || 0}`);
    
    return {
      structure: parsedStructure,
      isValid: true,
      source: 'ai-generated'
    };

  } catch (error) {
    console.error('[AI Structure Generator] Error generating structure:', error.message);
    console.error('[AI Structure Generator] Using fallback structure');
    return generateFallbackStructure(learningPath, allLessons);
  }
}

/**
 * Validate AI-generated structure
 * @param {Object} structure - AI-generated structure
 * @param {Array} allLessons - All lessons that should be assigned
 * @returns {Object} Validation result with isValid flag and errors array
 */
function validateAIStructure(structure, allLessons) {
  const errors = [];

  if (!structure || typeof structure !== 'object') {
    errors.push('Structure is not an object');
    return { isValid: false, errors };
  }

  if (!Array.isArray(structure.topics)) {
    errors.push('Topics is not an array');
    return { isValid: false, errors };
  }

  if (structure.topics.length === 0) {
    errors.push('No topics in structure');
    return { isValid: false, errors };
  }

  // Adjust validation based on lesson count
  // For small inputs (1-6 lessons), allow 1-6 topics (flexible)
  // For medium inputs (7-12 lessons), require 2-6 topics
  // For larger inputs (13+ lessons), require 3-6 topics (strict)
  const lessonCount = allLessons.length;
  let minTopics = 1;
  let maxTopics = 6;
  
  if (lessonCount > 12) {
    minTopics = 3;
  } else if (lessonCount > 6) {
    minTopics = 2;
  }

  if (structure.topics.length < minTopics || structure.topics.length > maxTopics) {
    errors.push(`Invalid topic count: ${structure.topics.length} (expected ${minTopics}-${maxTopics} for ${lessonCount} lessons)`);
  }

  // Collect all lesson IDs from structure
  const assignedLessonIds = new Set();
  const expectedLessonIds = new Set(
    allLessons.map((lesson, index) => lesson.lessonId || lesson.id || `lesson_${index}`)
  );

  // Calculate module constraints based on lesson count
  const minModulesPerTopic = lessonCount <= 6 ? 1 : 2;
  const maxModulesPerTopic = 5;

  for (const topic of structure.topics) {
    if (!topic.topic_name || typeof topic.topic_name !== 'string') {
      errors.push('Topic missing topic_name');
      continue;
    }

    if (!Array.isArray(topic.modules)) {
      errors.push(`Topic "${topic.topic_name}" has no modules array`);
      continue;
    }

    // Allow fewer modules per topic for small lesson counts
    if (topic.modules.length < minModulesPerTopic || topic.modules.length > maxModulesPerTopic) {
      errors.push(`Topic "${topic.topic_name}" has invalid module count: ${topic.modules.length} (expected ${minModulesPerTopic}-${maxModulesPerTopic})`);
    }

    for (const module of topic.modules) {
      if (!module.module_name || typeof module.module_name !== 'string') {
        errors.push(`Module missing module_name in topic "${topic.topic_name}"`);
        continue;
      }

      if (!Array.isArray(module.lesson_ids)) {
        errors.push(`Module "${module.module_name}" has no lesson_ids array`);
        continue;
      }

      // Check for duplicate assignments
      for (const lessonId of module.lesson_ids) {
        if (assignedLessonIds.has(lessonId)) {
          errors.push(`Lesson "${lessonId}" assigned to multiple modules`);
        }
        assignedLessonIds.add(lessonId);
      }
    }
  }

  // Check if all lessons are assigned
  for (const expectedId of expectedLessonIds) {
    if (!assignedLessonIds.has(expectedId)) {
      errors.push(`Lesson "${expectedId}" not assigned to any module`);
    }
  }

  // Check for extra lesson IDs not in input
  for (const assignedId of assignedLessonIds) {
    if (!expectedLessonIds.has(assignedId)) {
      errors.push(`Lesson "${assignedId}" assigned but not in input lessons`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate fallback structure when AI fails
 * @param {Array} learningPath - Original learning path
 * @param {Array} allLessons - All lessons
 * @returns {Object} Fallback structure
 */
function generateFallbackStructure(learningPath = [], allLessons = []) {
  console.log('[AI Structure Generator] Generating fallback structure...');

  const fallbackTopics = [];
  let lessonIndex = 0;

  // Use learning path topics if available, otherwise create generic topics
  const topicNames = learningPath.length > 0
    ? learningPath.map((t, i) => t.topicName || `Topic ${i + 1}`)
    : ['Topic 1', 'Topic 2', 'Topic 3'];

  // Distribute lessons evenly across topics
  const lessonsPerTopic = Math.ceil(allLessons.length / topicNames.length);

  for (let topicIdx = 0; topicIdx < topicNames.length; topicIdx++) {
    const topicName = topicNames[topicIdx];
    const topicLessons = allLessons.slice(lessonIndex, lessonIndex + lessonsPerTopic);
    
    if (topicLessons.length === 0) continue;

    // Create 2-3 modules per topic
    const lessonsPerModule = Math.ceil(topicLessons.length / 2);
    const modules = [];

    for (let moduleIdx = 0; moduleIdx < topicLessons.length; moduleIdx += lessonsPerModule) {
      const moduleLessons = topicLessons.slice(moduleIdx, moduleIdx + lessonsPerModule);
      const moduleNum = Math.floor(moduleIdx / lessonsPerModule) + 1;

      modules.push({
        module_name: `${topicName} - Module ${moduleNum}`,
        module_description: '',
        lesson_ids: moduleLessons.map((lesson, idx) => {
          // Ensure we use the same ID format as in the lesson map
          return lesson.lessonId || lesson.id || `lesson_${lessonIndex + moduleIdx + idx}`;
        }).filter(Boolean)
      });
    }

    fallbackTopics.push({
      topic_name: topicName,
      topic_description: '',
      modules: modules
    });

    lessonIndex += topicLessons.length;
  }

  return {
    structure: {
      topics: fallbackTopics
    },
    isValid: true,
    source: 'fallback'
  };
}

export default {
  generateAIStructure
};

