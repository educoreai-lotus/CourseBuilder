/**
 * Seed Database with Realistic Sample Data
 * Creates comprehensive courses, topics, modules, and lessons
 * Uses DATABASE_URL only (Supabase)
 * 
 * Usage: npm run db:seed
 */

import db, { pgp } from '../config/database.js';
import { CourseRepository } from '../repositories/CourseRepository.js';
import { TopicRepository } from '../repositories/TopicRepository.js';
import { ModuleRepository } from '../repositories/ModuleRepository.js';
import { LessonRepository } from '../repositories/LessonRepository.js';
import { RegistrationRepository } from '../repositories/RegistrationRepository.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import dotenv from 'dotenv';
import { getSeedData, TRAINER_ID, LEARNER_ID, LEARNER_NAME, LEARNER_COMPANY } from './seed-data.js';

dotenv.config();

// Ensure DATABASE_URL is set (required for Supabase)
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is required!');
  console.error('   Please set DATABASE_URL in your .env file');
  console.error('   DATABASE_URL should point to your Supabase database');
  process.exit(1);
}

const courseRepo = new CourseRepository();
const topicRepo = new TopicRepository();
const moduleRepo = new ModuleRepository();
const lessonRepo = new LessonRepository();
const registrationRepo = new RegistrationRepository();
const feedbackRepo = new FeedbackRepository();

// Helper function to create full course structure
async function createFullCourse(courseData, topicsData) {
  const course = await courseRepo.create(courseData);
  const createdTopics = [];
  
  for (const topicData of topicsData) {
    const topic = await topicRepo.create({
      course_id: course.id,
      topic_name: topicData.name,
      topic_description: topicData.description
    });
    
    const createdModules = [];
    for (const moduleData of topicData.modules) {
      const module = await moduleRepo.create({
        topic_id: topic.id,
        module_name: moduleData.name,
        module_description: moduleData.description
      });
      
      for (const lessonData of moduleData.lessons) {
        await lessonRepo.create({
          module_id: module.id,
          topic_id: topic.id,
          lesson_name: lessonData.name,
          lesson_description: lessonData.description,
          skills: lessonData.skills || [],
          trainer_ids: lessonData.trainer_ids || [TRAINER_ID],
          content_type: lessonData.content_type || 'text',
          content_data: lessonData.content_data || [
            {
              type: 'paragraph',
              content: lessonData.description || `Learn about ${lessonData.name}`
            }
          ],
          devlab_exercises: lessonData.devlab_exercises || []
        });
      }
      
      createdModules.push(module);
    }
    
    createdTopics.push({ topic, modules: createdModules });
  }
  
  return { course, topics: createdTopics };
}

async function seed() {
  try {
    console.log('🌱 Starting comprehensive database seeding...\n');
    console.log(`📡 Database: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'DATABASE_URL not set'}\n`);

    // Check if data already exists
    const existingCourses = await db.any('SELECT COUNT(*)::int as count FROM courses');
    if (existingCourses[0].count > 0) {
      console.log('⚠️  Database already contains data. Skipping seed.');
      console.log('💡 Use "npm run db:clear" to clear the database first if you want to reseed.\n');
      await pgp.end();
      process.exit(0);
    }

    // Get seed data from shared module
    const seedData = getSeedData();

    // ============================================
    // 1. CREATE 4 TRAINER COURSES + 4 LEARNER-SPECIFIC COURSES
    // ============================================
    console.log('📚 Creating courses...\n');

    // Create all courses from seed data
    const createdCourses = [];
    for (const courseData of seedData.courses) {
      const course = await createFullCourse(
        courseData,
        courseData.topics
      );
      createdCourses.push(course);
    }

    console.log(`✅ Created ${createdCourses.length} courses\n`);

    // ============================================
    // 2. CREATE REGISTRATIONS
    // ============================================
    console.log('📋 Creating registrations...\n');

    const courses = createdCourses.map(c => c.course);
    
    for (let i = 0; i < Math.min(seedData.registrations.length, courses.length); i++) {
      await registrationRepo.create({
        learner_id: seedData.registrations[i].learner_id,
        learner_name: seedData.registrations[i].learner_name,
        course_id: courses[i].id,
        company_id: seedData.registrations[i].company_id,
        company_name: seedData.registrations[i].company_name,
        status: seedData.registrations[i].status
      });
    }

    console.log(`✅ Created ${Math.min(seedData.registrations.length, courses.length)} registrations\n`);

    // ============================================
    // 3. CREATE FEEDBACK
    // ============================================
    console.log('💬 Creating feedback...\n');

    for (let i = 0; i < Math.min(seedData.feedback.length, courses.length); i++) {
      await feedbackRepo.create({
        learner_id: seedData.feedback[i].learner_id,
        course_id: courses[i].id,
        rating: seedData.feedback[i].rating,
        comment: seedData.feedback[i].comment
      });
    }

    console.log(`✅ Created ${Math.min(seedData.feedback.length, courses.length)} feedback entries\n`);

    // ============================================
    // SUMMARY
    // ============================================
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
