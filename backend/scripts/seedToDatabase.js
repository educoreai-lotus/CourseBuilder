/**
 * Seed Database with Sample Data (Flexible Database URL)
 * Creates sample courses, topics, modules, and lessons for testing
 * Uses same seed data as seed.js (from seed-data.js)
 * 
 * Usage: 
 *   DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/seedToDatabase.js
 *   Or: npm run db:seed:team
 */

import pgPromise from 'pg-promise';
import { Course } from '../models/Course.js';
import { Topic } from '../models/Topic.js';
import { Module } from '../models/Module.js';
import { Lesson } from '../models/Lesson.js';
import { Feedback } from '../models/Feedback.js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { getSeedData, TRAINER_ID, LEARNER_ID, LEARNER_NAME, LEARNER_COMPANY } from './seed-data.js';

dotenv.config();

// Get database URL from environment variable or command line argument
// Priority: 1. Command line arg, 2. TEAM_DATABASE_URL, 3. DATABASE_URL
const databaseUrl = process.argv[2] || process.env.TEAM_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ ERROR: Database URL is required!');
  console.error('\nUsage:');
  console.error('  Option 1: Set TEAM_DATABASE_URL in .env file, then run: npm run db:seed:team');
  console.error('  Option 2: Pass URL as argument: node scripts/seedToDatabase.js "postgresql://user:pass@host:port/db"');
  console.error('  Option 3: Set DATABASE_URL env var: DATABASE_URL="..." node scripts/seedToDatabase.js');
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
if (connectionString.includes('supabase') || connectionString.includes('pooler.supabase')) {
  // Parse connection string to extract components
  const url = new URL(connectionString);
  dbConfig = {
    host: url.hostname,
    port: parseInt(url.port || '5432', 10),
    database: url.pathname.slice(1) || 'postgres',
    user: url.username,
    password: url.password,
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

// User IDs are imported from seed-data.js

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

    // Get seed data from shared module (same as seed.js)
    const seedData = getSeedData();

    // 1. Create all courses from seed data
    console.log('📚 Creating courses...\n');
    
    const createdCourses = [];
    for (const courseData of seedData.courses) {
      const course = await createCourse(courseData);
      createdCourses.push(course);
      
      // Create topics, modules, and lessons for this course
      for (const topicData of courseData.topics) {
        const topic = await createTopic({
          course_id: course.id,
          topic_name: topicData.name,
          topic_description: topicData.description
        });
        
        for (const moduleData of topicData.modules) {
          const module = await createModule({
            topic_id: topic.id,
            module_name: moduleData.name,
            module_description: moduleData.description
          });
          
          for (const lessonData of moduleData.lessons) {
            // Ensure arrays are properly formatted
            const skills = Array.isArray(lessonData.skills) ? lessonData.skills : [];
            const trainer_ids = Array.isArray(lessonData.trainer_ids) ? lessonData.trainer_ids : [TRAINER_ID];
            const content_data = Array.isArray(lessonData.content_data) ? lessonData.content_data : [];
            const devlab_exercises = Array.isArray(lessonData.devlab_exercises) ? lessonData.devlab_exercises : [];
            
            await createLesson({
              module_id: module.id,
              topic_id: topic.id,
              lesson_name: lessonData.name,
              lesson_description: lessonData.description || null,
              skills: skills,
              trainer_ids: trainer_ids,
              content_type: lessonData.content_type || 'text',
              content_data: content_data,
              devlab_exercises: devlab_exercises
            });
          }
        }
      }
    }

    console.log(`✅ Created ${createdCourses.length} courses with full structure\n`);

    // 2. Create Registrations
    console.log('📋 Creating registrations...\n');
    
    for (let i = 0; i < Math.min(seedData.registrations.length, createdCourses.length); i++) {
      await createRegistration({
        learner_id: seedData.registrations[i].learner_id,
        learner_name: seedData.registrations[i].learner_name,
        course_id: createdCourses[i].id,
        company_id: seedData.registrations[i].company_id,
        company_name: seedData.registrations[i].company_name,
        status: seedData.registrations[i].status
      });
    }

    console.log(`✅ Created ${Math.min(seedData.registrations.length, createdCourses.length)} registrations\n`);

    // 3. Create Feedback
    console.log('💬 Creating feedback...\n');
    
    for (let i = 0; i < Math.min(seedData.feedback.length, createdCourses.length); i++) {
      await createFeedback({
        learner_id: seedData.feedback[i].learner_id,
        course_id: createdCourses[i].id,
        rating: seedData.feedback[i].rating,
        comment: seedData.feedback[i].comment || null
      });
    }

    console.log(`✅ Created ${Math.min(seedData.feedback.length, createdCourses.length)} feedback entries\n`);

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

