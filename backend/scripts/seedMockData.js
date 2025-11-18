/**
 * Seed Database with Mock Data
 * Creates: 1 learner, 1 trainer, 1 course, 1 registration
 */

import db, { pgp } from '../config/database.js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { CourseRepository } from '../repositories/CourseRepository.js';
import { RegistrationRepository } from '../repositories/RegistrationRepository.js';
import { TopicRepository } from '../repositories/TopicRepository.js';
import { ModuleRepository } from '../repositories/ModuleRepository.js';
import { LessonRepository } from '../repositories/LessonRepository.js';

dotenv.config();

// Mock User IDs
const TRAINER_ID = '00000000-0000-0000-0000-000000000001';
const LEARNER_ID = '00000000-0000-0000-0000-000000000002';

// Mock Course ID
const COURSE_ID = '11111111-1111-1111-1111-111111111111';

// Mock Company ID
const COMPANY_ID = '22222222-2222-2222-2222-222222222222';

const courseRepository = new CourseRepository();
const registrationRepository = new RegistrationRepository();
const topicRepository = new TopicRepository();
const moduleRepository = new ModuleRepository();
const lessonRepository = new LessonRepository();

async function seedMockData() {
  try {
    console.log('🌱 Starting database seeding with mock data...\n');

    // 1. Create Trainer Course
    console.log('📚 Creating trainer course...');
    const course = await courseRepository.create({
      id: COURSE_ID,
      course_name: 'Introduction to React',
      course_description: 'Learn the fundamentals of React including components, hooks, and state management. Perfect for beginners who want to build modern web applications.',
      course_type: 'trainer',
      status: 'active',
      level: 'beginner',
      duration_hours: 10,
      start_date: new Date(),
      created_by_user_id: TRAINER_ID,
      learning_path_designation: {},
      studentsIDDictionary: {
        [LEARNER_ID]: {
          status: 'in_progress',
          enrolled_date: new Date().toISOString(),
          completion_reason: null
        }
      },
      feedbackDictionary: {},
      lesson_completion_dictionary: {}
    });
    console.log(`   ✅ Course created: ${course.course_name} (${course.id})\n`);

    // 2. Create Topic (structural container only)
    console.log('📖 Creating topic...');
    const topic = await topicRepository.create({
      course_id: COURSE_ID,
      topic_name: 'React Basics',
      topic_description: 'Understanding React components and JSX'
    });
    console.log(`   ✅ Topic created: ${topic.topic_name} (${topic.id})\n`);

    // 3. Create Module (structural container only)
    console.log('📦 Creating module...');
    const module = await moduleRepository.create({
      topic_id: topic.id,
      module_name: 'Components and Props',
      module_description: 'Learn how to create and use React components'
    });
    console.log(`   ✅ Module created: ${module.module_name} (${module.id})\n`);

    // 4. Create Lesson (contains actual content)
    console.log('📝 Creating lesson...');
    const lesson = await lessonRepository.create({
      module_id: module.id,
      topic_id: topic.id,
      lesson_name: 'Your First Component',
      lesson_description: 'Create your first React component from scratch',
      skills: ['react', 'components', 'jsx'],
      trainer_ids: [TRAINER_ID], // Must be UUID array
      content_type: 'mixed',
      content_data: [
        {
          content_id: 'c-1',
          content_type: 'video',
          content_data: {
            title: 'Building Your First Component',
            youtube_id: 'dQw4w9WgXcQ',
            description: 'Learn how to create React components'
          }
        },
        {
          content_id: 'c-2',
          content_type: 'github_snippet',
          content_data: {
            repo: 'facebook/react',
            file_path: 'examples/basic/index.js',
            description: 'Basic React component example'
          }
        }
      ],
      devlab_exercises: []
    });
    console.log(`   ✅ Lesson created: ${lesson.lesson_name} (${lesson.id})\n`);

    // 5. Create Registration (Learner enrolled in course)
    console.log('👤 Creating learner registration...');
    const registration = await registrationRepository.create({
      learner_id: LEARNER_ID,
      learner_name: 'Jane Learner',
      course_id: COURSE_ID,
      company_id: COMPANY_ID,
      company_name: 'Acme Corp',
      status: 'in_progress',
      enrolled_date: new Date()
    });
    console.log(`   ✅ Registration created: ${registration.learner_name} enrolled in course\n`);

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   👨‍🏫 Trainer ID: ${TRAINER_ID}`);
    console.log(`   👤 Learner ID: ${LEARNER_ID}`);
    console.log(`   📚 Course ID: ${COURSE_ID}`);
    console.log(`   📖 Topic ID: ${topic.id}`);
    console.log(`   📦 Module ID: ${module.id}`);
    console.log(`   📝 Lesson ID: ${lesson.id}`);
    console.log(`   ✅ Registration ID: ${registration.id}`);
    console.log('\n🎉 You can now test the frontend with this data!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    pgp.end();
  }
}

// Run seed if called directly
seedMockData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

export default seedMockData;

