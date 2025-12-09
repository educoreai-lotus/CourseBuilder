/**
 * Seed Database with Sample Data
 * Creates sample courses, topics, modules, and lessons for testing
 * 
 * Usage: npm run seed
 */

import db, { pgp } from '../config/database.js';
import { CourseRepository } from '../repositories/CourseRepository.js';
import { TopicRepository } from '../repositories/TopicRepository.js';
import { ModuleRepository } from '../repositories/ModuleRepository.js';
import { LessonRepository } from '../repositories/LessonRepository.js';
import { RegistrationRepository } from '../repositories/RegistrationRepository.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Mock User IDs (matching frontend AppContext)
const TRAINER_ID = '20000000-0000-0000-0000-000000000001'; // Tristan Trainer
const LEARNER_ID = '10000000-0000-0000-0000-000000000001'; // Alice Learner
const LEARNER_NAME = 'Alice Learner';
const LEARNER_COMPANY = 'Emerald Learning';

const courseRepo = new CourseRepository();
const topicRepo = new TopicRepository();
const moduleRepo = new ModuleRepository();
const lessonRepo = new LessonRepository();
const registrationRepo = new RegistrationRepository();
const feedbackRepo = new FeedbackRepository();

async function seed() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Check if data already exists
    const existingCourses = await db.any('SELECT COUNT(*)::int as count FROM courses');
    if (existingCourses[0].count > 0) {
      console.log('⚠️  Database already contains data. Skipping seed.');
      console.log('💡 Use "npm run db:clear" to clear the database first if you want to reseed.\n');
      await pgp.end();
      process.exit(0);
    }

    // 1. Create Marketplace Courses (Trainer courses)
    console.log('📚 Creating marketplace courses...');
    
    const jsCourse = await courseRepo.create({
      id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      course_name: 'JavaScript Fundamentals',
      course_description: 'Learn the fundamentals of JavaScript programming',
      course_type: 'trainer',
      status: 'active',
      level: 'beginner',
      duration_hours: 20,
      created_by_user_id: TRAINER_ID
    });

    const pythonCourse = await courseRepo.create({
      id: 'd4e5f6a7-b8c9-0123-def0-234567890123',
      course_name: 'Python for Data Science',
      course_description: 'Master Python for data analysis and visualization',
      course_type: 'trainer',
      status: 'active',
      level: 'intermediate',
      duration_hours: 30,
      created_by_user_id: TRAINER_ID
    });

    const reactCourse = await courseRepo.create({
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
    
    const personalizedCourse1 = await courseRepo.create({
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

    const personalizedCourse2 = await courseRepo.create({
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
    
    const jsTopic1 = await topicRepo.create({
      course_id: jsCourse.id,
      topic_name: 'Variables and Data Types',
      topic_description: 'Understanding JavaScript variables and data types'
    });

    const jsTopic2 = await topicRepo.create({
      course_id: jsCourse.id,
      topic_name: 'Functions and Scope',
      topic_description: 'Working with functions and understanding scope'
    });

    const jsTopic3 = await topicRepo.create({
      course_id: jsCourse.id,
      topic_name: 'Objects and Arrays',
      topic_description: 'Manipulating objects and arrays in JavaScript'
    });

    console.log('✅ Created 3 topics for JavaScript course\n');

    // 4. Create Modules for Topics
    console.log('📦 Creating modules...');
    
    const jsModule1 = await moduleRepo.create({
      topic_id: jsTopic1.id,
      module_name: 'Introduction to Variables',
      module_description: 'Learn about var, let, and const'
    });

    const jsModule2 = await moduleRepo.create({
      topic_id: jsTopic1.id,
      module_name: 'Data Types Overview',
      module_description: 'Understanding primitive and reference types'
    });

    const jsModule3 = await moduleRepo.create({
      topic_id: jsTopic2.id,
      module_name: 'Function Declarations',
      module_description: 'Different ways to declare functions'
    });

    console.log('✅ Created 3 modules\n');

    // 5. Create Lessons
    console.log('📝 Creating lessons...');
    
    await lessonRepo.create({
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

    await lessonRepo.create({
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

    await lessonRepo.create({
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
    
    await registrationRepo.create({
      learner_id: LEARNER_ID,
      learner_name: LEARNER_NAME,
      course_id: jsCourse.id,
      company_id: uuidv4(),
      company_name: LEARNER_COMPANY,
      status: 'in_progress'
    });

    await registrationRepo.create({
      learner_id: LEARNER_ID,
      learner_name: LEARNER_NAME,
      course_id: pythonCourse.id,
      company_id: uuidv4(),
      company_name: LEARNER_COMPANY,
      status: 'in_progress'
    });

    await registrationRepo.create({
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
    
    await feedbackRepo.create({
      learner_id: LEARNER_ID,
      course_id: jsCourse.id,
      rating: 5,
      comment: 'Great course! Very well structured.'
    });

    await feedbackRepo.create({
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

