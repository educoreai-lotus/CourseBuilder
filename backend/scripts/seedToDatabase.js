/**
 * Seed Database with Sample Data (Flexible Database URL)
 * Creates sample courses, topics, modules, and lessons for testing
 * 
 * Usage: 
 *   DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/seedToDatabase.js
 *   Or: npm run seed:team
 */

import pgPromise from 'pg-promise';
import { Course } from '../models/Course.js';
import { Topic } from '../models/Topic.js';
import { Module } from '../models/Module.js';
import { Lesson } from '../models/Lesson.js';
import { Feedback } from '../models/Feedback.js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Get database URL from environment variable or command line argument
const databaseUrl = process.env.DATABASE_URL || process.argv[2];

if (!databaseUrl) {
  console.error('❌ ERROR: DATABASE_URL is required!');
  console.error('\nUsage:');
  console.error('  DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/seedToDatabase.js');
  console.error('  Or: npm run seed:team (if TEAM_DATABASE_URL is set in .env)');
  process.exit(1);
}

// Parse Supabase URL and add SSL if needed
let connectionString = databaseUrl;
if (databaseUrl.includes('supabase') || databaseUrl.includes('pooler.supabase')) {
  // Add sslmode=require if not present
  if (!databaseUrl.includes('sslmode=')) {
    connectionString = databaseUrl.includes('?') 
      ? `${databaseUrl}&sslmode=require`
      : `${databaseUrl}?sslmode=require`;
  }
}

// Create database connection
const pgp = pgPromise({
  error(err, e) {
    if (e.cn) {
      console.error('Connection error:', err.message);
    }
  }
});

// Configure SSL for Supabase
let dbConfig = {};
if (connectionString.includes('supabase')) {
  dbConfig = {
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  };
} else {
  dbConfig = {
    connectionString: connectionString
  };
}

const db = pgp(dbConfig);

// Mock User IDs (matching frontend AppContext)
const TRAINER_ID = '20000000-0000-0000-0000-000000000001'; // Tristan Trainer
const LEARNER_ID = '10000000-0000-0000-0000-000000000001'; // Alice Learner
const LEARNER_NAME = 'Alice Learner';
const LEARNER_COMPANY = 'Emerald Learning';

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');
    console.log(`📡 Database: ${connectionString.replace(/:[^:@]+@/, ':****@')}\n`);

    // Test connection
    await db.one('SELECT NOW() as now');
    console.log('✅ Database connected successfully\n');

    // Check if data already exists
    const existingCourses = await db.any('SELECT COUNT(*)::int as count FROM courses');
    if (existingCourses[0].count > 0) {
      console.log('⚠️  Database already contains data. Skipping seed.');
      console.log('💡 Use "npm run db:clear" to clear the database first if you want to reseed.\n');
      await pgp.end();
      process.exit(0);
    }

    // Helper function to create course
    async function createCourse(courseData) {
      const courseId = courseData.id || uuidv4();
      const query = `
        INSERT INTO courses (
          id, course_name, course_description, course_type, status, level,
          duration_hours, start_date, created_by_user_id,
          learning_path_designation,
          studentsIDDictionary, feedbackDictionary, lesson_completion_dictionary, ai_assets
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING *
      `;
      const values = [
        courseId,
        courseData.course_name,
        courseData.course_description || null,
        courseData.course_type,
        courseData.status || 'draft',
        courseData.level || null,
        courseData.duration_hours || null,
        courseData.start_date || null,
        courseData.created_by_user_id || null,
        JSON.stringify(courseData.learning_path_designation || {}),
        JSON.stringify(courseData.studentsIDDictionary || {}),
        JSON.stringify(courseData.feedbackDictionary || {}),
        JSON.stringify(courseData.lesson_completion_dictionary || {}),
        JSON.stringify(courseData.ai_assets || {})
      ];
      const row = await db.one(query, values);
      return Course.fromRow(row);
    }

    // Helper function to create topic
    async function createTopic(topicData) {
      const topicId = uuidv4();
      const query = `
        INSERT INTO topics (id, course_id, topic_name, topic_description)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const values = [
        topicId,
        topicData.course_id,
        topicData.topic_name,
        topicData.topic_description || null
      ];
      const row = await db.one(query, values);
      return Topic.fromRow(row);
    }

    // Helper function to create module
    async function createModule(moduleData) {
      const moduleId = uuidv4();
      const query = `
        INSERT INTO modules (id, topic_id, module_name, module_description)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const values = [
        moduleId,
        moduleData.topic_id,
        moduleData.module_name,
        moduleData.module_description || null
      ];
      const row = await db.one(query, values);
      return Module.fromRow(row);
    }

    // Helper function to create lesson
    async function createLesson(lessonData) {
      const lessonId = uuidv4();
      const skills = Array.isArray(lessonData.skills) ? lessonData.skills : [];
      const trainer_ids = Array.isArray(lessonData.trainer_ids) ? lessonData.trainer_ids : [];
      const content_data = Array.isArray(lessonData.content_data) ? lessonData.content_data : [];
      const devlab_exercises = Array.isArray(lessonData.devlab_exercises) ? lessonData.devlab_exercises : [];
      
      const query = `
        INSERT INTO lessons (
          id, module_id, topic_id, lesson_name, lesson_description,
          skills, trainer_ids, content_type, content_data, devlab_exercises
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::uuid[], $8, $9, $10)
        RETURNING *
      `;
      const values = [
        lessonId,
        lessonData.module_id,
        lessonData.topic_id,
        lessonData.lesson_name,
        lessonData.lesson_description || null,
        JSON.stringify(skills),
        trainer_ids.length > 0 ? trainer_ids : [],
        lessonData.content_type || null,
        JSON.stringify(content_data),
        JSON.stringify(devlab_exercises)
      ];
      const row = await db.one(query, values);
      return Lesson.fromRow(row);
    }

    // Helper function to create registration
    async function createRegistration(registrationData) {
      const registrationId = uuidv4();
      const query = `
        INSERT INTO registrations (
          id, learner_id, learner_name, course_id, company_id, company_name, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const values = [
        registrationId,
        registrationData.learner_id,
        registrationData.learner_name,
        registrationData.course_id,
        registrationData.company_id || null,
        registrationData.company_name || null,
        registrationData.status || 'in_progress'
      ];
      return await db.one(query, values);
    }

    // Helper function to create feedback
    async function createFeedback(feedbackData) {
      const feedbackId = uuidv4();
      const query = `
        INSERT INTO feedback (id, learner_id, course_id, rating, comment)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const values = [
        feedbackId,
        feedbackData.learner_id,
        feedbackData.course_id,
        feedbackData.rating,
        feedbackData.comment || null
      ];
      const row = await db.one(query, values);
      return Feedback.fromRow(row);
    }

    // 1. Create Marketplace Courses (Trainer courses)
    console.log('📚 Creating marketplace courses...');
    
    const jsCourse = await createCourse({
      id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      course_name: 'JavaScript Fundamentals',
      course_description: 'Learn the fundamentals of JavaScript programming',
      course_type: 'trainer',
      status: 'active',
      level: 'beginner',
      duration_hours: 20,
      created_by_user_id: TRAINER_ID
    });

    const pythonCourse = await createCourse({
      id: 'd4e5f6a7-b8c9-0123-def0-234567890123',
      course_name: 'Python for Data Science',
      course_description: 'Master Python for data analysis and visualization',
      course_type: 'trainer',
      status: 'active',
      level: 'intermediate',
      duration_hours: 30,
      created_by_user_id: TRAINER_ID
    });

    const reactCourse = await createCourse({
      id: 'e5f6a7b8-c9d0-1234-efab-345678901234',
      course_name: 'React Advanced Patterns',
      course_description: 'Advanced React patterns and best practices',
      course_type: 'trainer',
      status: 'active',
      level: 'advanced',
      duration_hours: 25,
      created_by_user_id: TRAINER_ID
    });

    console.log('✅ Created 3 marketplace courses\n');

    // 2. Create Personalized Courses (Learner-specific)
    console.log('🎯 Creating personalized courses...');
    
    const personalizedCourse1 = await createCourse({
      id: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
      course_name: 'Personalized Web Development Path',
      course_description: 'Customized learning path for web development',
      course_type: 'learner_specific',
      status: 'active',
      level: 'beginner',
      duration_hours: 40,
      learning_path_designation: {
        is_designated: true,
        target_competency: {
          competency_id: 'web-dev-001',
          competency_name: 'Web Development',
          target_level: 'intermediate'
        }
      }
    });

    const personalizedCourse2 = await createCourse({
      id: 'a7b8c9d0-e1f2-3456-abcd-567890123456',
      course_name: 'Personalized Machine Learning Journey',
      course_description: 'Tailored ML course based on your learning style',
      course_type: 'learner_specific',
      status: 'active',
      level: 'intermediate',
      duration_hours: 50
    });

    console.log('✅ Created 2 personalized courses\n');

    // 3. Create Topics for JavaScript Course
    console.log('📖 Creating topics for JavaScript course...');
    
    const jsTopic1 = await createTopic({
      course_id: jsCourse.id,
      topic_name: 'Variables and Data Types',
      topic_description: 'Understanding JavaScript variables and data types'
    });

    const jsTopic2 = await createTopic({
      course_id: jsCourse.id,
      topic_name: 'Functions and Scope',
      topic_description: 'Working with functions and understanding scope'
    });

    const jsTopic3 = await createTopic({
      course_id: jsCourse.id,
      topic_name: 'Objects and Arrays',
      topic_description: 'Manipulating objects and arrays in JavaScript'
    });

    console.log('✅ Created 3 topics for JavaScript course\n');

    // 4. Create Modules for Topics
    console.log('📦 Creating modules...');
    
    const jsModule1 = await createModule({
      topic_id: jsTopic1.id,
      module_name: 'Introduction to Variables',
      module_description: 'Learn about var, let, and const'
    });

    const jsModule2 = await createModule({
      topic_id: jsTopic1.id,
      module_name: 'Data Types Overview',
      module_description: 'Understanding primitive and reference types'
    });

    const jsModule3 = await createModule({
      topic_id: jsTopic2.id,
      module_name: 'Function Declarations',
      module_description: 'Different ways to declare functions'
    });

    console.log('✅ Created 3 modules\n');

    // 5. Create Lessons
    console.log('📝 Creating lessons...');
    
    await createLesson({
      module_id: jsModule1.id,
      topic_id: jsTopic1.id,
      lesson_name: 'Understanding var, let, and const',
      lesson_description: 'Learn the differences between variable declarations',
      skills: ['javascript', 'variables', 'scope'],
      trainer_ids: [TRAINER_ID],
      content_type: 'text',
      content_data: [
        {
          type: 'paragraph',
          content: 'JavaScript has three ways to declare variables: var, let, and const.'
        },
        {
          type: 'paragraph',
          content: 'Each has different scoping rules and use cases.'
        }
      ],
      devlab_exercises: []
    });

    await createLesson({
      module_id: jsModule2.id,
      topic_id: jsTopic1.id,
      lesson_name: 'Primitive Types',
      lesson_description: 'Understanding JavaScript primitive data types',
      skills: ['javascript', 'data-types'],
      trainer_ids: [TRAINER_ID],
      content_type: 'text',
      content_data: [
        {
          type: 'paragraph',
          content: 'JavaScript has 7 primitive types: string, number, bigint, boolean, undefined, null, and symbol.'
        }
      ],
      devlab_exercises: []
    });

    await createLesson({
      module_id: jsModule3.id,
      topic_id: jsTopic2.id,
      lesson_name: 'Function Expressions vs Declarations',
      lesson_description: 'Understanding function declarations and expressions',
      skills: ['javascript', 'functions'],
      trainer_ids: [TRAINER_ID],
      content_type: 'text',
      content_data: [
        {
          type: 'paragraph',
          content: 'Functions can be declared using function declarations or function expressions.'
        }
      ],
      devlab_exercises: []
    });

    console.log('✅ Created 3 lessons\n');

    // 6. Create Registrations
    console.log('📋 Creating registrations...');
    
    await createRegistration({
      learner_id: LEARNER_ID,
      learner_name: LEARNER_NAME,
      course_id: jsCourse.id,
      company_id: uuidv4(),
      company_name: LEARNER_COMPANY,
      status: 'in_progress'
    });

    await createRegistration({
      learner_id: LEARNER_ID,
      learner_name: LEARNER_NAME,
      course_id: pythonCourse.id,
      company_id: uuidv4(),
      company_name: LEARNER_COMPANY,
      status: 'in_progress'
    });

    await createRegistration({
      learner_id: LEARNER_ID,
      learner_name: LEARNER_NAME,
      course_id: personalizedCourse1.id,
      company_id: uuidv4(),
      company_name: LEARNER_COMPANY,
      status: 'in_progress'
    });

    console.log('✅ Created 3 registrations\n');

    // 7. Create Feedback
    console.log('💬 Creating feedback...');
    
    await createFeedback({
      learner_id: LEARNER_ID,
      course_id: jsCourse.id,
      rating: 5,
      comment: 'Great course! Very well structured.'
    });

    await createFeedback({
      learner_id: LEARNER_ID,
      course_id: pythonCourse.id,
      rating: 4,
      comment: 'Good content, but could use more examples.'
    });

    console.log('✅ Created 2 feedback entries\n');

    // Summary
    const courseCount = await db.one('SELECT COUNT(*)::int as count FROM courses');
    const topicCount = await db.one('SELECT COUNT(*)::int as count FROM topics');
    const moduleCount = await db.one('SELECT COUNT(*)::int as count FROM modules');
    const lessonCount = await db.one('SELECT COUNT(*)::int as count FROM lessons');
    const registrationCount = await db.one('SELECT COUNT(*)::int as count FROM registrations');
    const feedbackCount = await db.one('SELECT COUNT(*)::int as count FROM feedback');

    console.log('📊 Seeding Summary:');
    console.log(`   ✅ Courses: ${courseCount.count}`);
    console.log(`   ✅ Topics: ${topicCount.count}`);
    console.log(`   ✅ Modules: ${moduleCount.count}`);
    console.log(`   ✅ Lessons: ${lessonCount.count}`);
    console.log(`   ✅ Registrations: ${registrationCount.count}`);
    console.log(`   ✅ Feedback: ${feedbackCount.count}\n`);

    console.log('🎉 Database seeding completed successfully!\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await pgp.end();
  }
}

// Run seed
seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed script failed:', error.message);
    process.exit(1);
  });

