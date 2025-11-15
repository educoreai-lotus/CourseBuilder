/**
 * Test Database Seed Script
 * This script runs ONLY when NODE_ENV=test
 * Inserts minimal test data required for tests
 */

import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// ⚠️ Only run in test environment
if (process.env.NODE_ENV !== 'test') {
  console.error('❌ testSeed.js can only run when NODE_ENV=test');
  process.exit(1);
}

/**
 * Seed minimal test data
 */
export default async function seedTestData() {
  try {
    console.log('🌱 Seeding test database...');

    // Use fixed UUIDs for predictable test results
    const courseId = '11111111-1111-1111-1111-111111111111';
    const topicId = '22222222-2222-2222-2222-222222222222';
    const moduleId = '33333333-3333-3333-3333-333333333333';
    const lessonId = '44444444-4444-4444-4444-444444444444';

    // 1. Insert Course
    await db.none(`
      INSERT INTO courses (
        id, course_name, course_description, course_type, status, level,
        duration_hours, created_by_user_id,
        learning_path_designation,
        studentsIDDictionary, feedbackDictionary, lesson_completion_dictionary
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )
      ON CONFLICT (id) DO NOTHING
    `, [
      courseId,
      'Test Course',
      'A test course for automated testing',
      'trainer',
      'active',
      'beginner',
      10,
      '00000000-0000-0000-0000-000000000001', // Test user ID
      JSON.stringify({}),
      JSON.stringify({}),
      JSON.stringify({}),
      JSON.stringify({})
    ]);

    // 2. Insert Topic
    await db.none(`
      INSERT INTO topics (
        id, course_id, topic_name, topic_description
      ) VALUES (
        $1, $2, $3, $4
      )
      ON CONFLICT (id) DO NOTHING
    `, [
      topicId,
      courseId,
      'Test Topic',
      'A test topic for automated testing'
    ]);

    // 3. Insert Module
    await db.none(`
      INSERT INTO modules (
        id, topic_id, module_name, module_description
      ) VALUES (
        $1, $2, $3, $4
      )
      ON CONFLICT (id) DO NOTHING
    `, [
      moduleId,
      topicId,
      'Test Module',
      'A test module for automated testing'
    ]);

    // 4. Insert Lesson
    await db.none(`
      INSERT INTO lessons (
        id, module_id, topic_id, lesson_name, lesson_description,
        skills, trainer_ids, content_type, content_data, devlab_exercises
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
      ON CONFLICT (id) DO NOTHING
    `, [
      lessonId,
      moduleId,
      topicId,
      'Test Lesson',
      'A test lesson for automated testing',
      JSON.stringify(['JavaScript', 'React']), // Skills array
      [], // Trainer IDs array
      'text',
      JSON.stringify([{ // content_data array (Content Studio contents[])
        type: 'text_audio',
        text: 'This is test lesson content',
        audio: null
      }]),
      JSON.stringify([]) // devlab_exercises array
    ]);

    console.log('✅ Test seed data inserted successfully');
    console.log(`   Course ID: ${courseId}`);
    console.log(`   Topic ID: ${topicId}`);
    console.log(`   Module ID: ${moduleId}`);
    console.log(`   Lesson ID: ${lessonId}`);
  } catch (error) {
    console.error('❌ Error seeding test data:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestData()
    .then(() => {
      console.log('✨ Test seed complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

