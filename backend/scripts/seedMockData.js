/**
 * Seed Database with Mock Data
 * Creates: 1 learner (Alice Learner), 2 trainers, 8 courses (4 marketplace + 4 personalized)
 * Single learner is enrolled in ALL courses with feedback and progress tracking
 */

import db, { pgp } from '../config/database.js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { CourseRepository } from '../repositories/CourseRepository.js';
import { RegistrationRepository } from '../repositories/RegistrationRepository.js';
import { TopicRepository } from '../repositories/TopicRepository.js';
import { ModuleRepository } from '../repositories/ModuleRepository.js';
import { LessonRepository } from '../repositories/LessonRepository.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';

dotenv.config();

// Mock User IDs (matching frontend AppContext)
const TRAINER_ID = '20000000-0000-0000-0000-000000000001'; // Tristan Trainer
const TRAINER_2_ID = '20000000-0000-0000-0000-000000000002'; // Trainer 2
const LEARNER_ID = '10000000-0000-0000-0000-000000000001'; // Alice Learner (ONLY LEARNER)
const LEARNER_NAME = 'Alice Learner'; // Matching frontend AppContext
const LEARNER_COMPANY = 'Emerald Learning'; // Matching frontend AppContext

// Mock Course IDs
const MARKETPLACE_COURSE_1_ID = 'c3d4e5f6-a7b8-9012-cdef-123456789012'; // JavaScript course
const MARKETPLACE_COURSE_2_ID = 'd4e5f6a7-b8c9-0123-def0-234567890123'; // Python course
const MARKETPLACE_COURSE_3_ID = 'e5f6a7b8-c9d0-1234-efab-345678901234'; // React course
const MARKETPLACE_COURSE_4_ID = 'b8c9d0e1-f2a3-4567-cdef-678901234567'; // Node.js course (NEW)
const PERSONALIZED_COURSE_1_ID = 'f6a7b8c9-d0e1-2345-fabc-456789012345'; // Personalized for learner
const PERSONALIZED_COURSE_2_ID = 'a7b8c9d0-e1f2-3456-bcde-567890123456'; // Personalized for learner 2
const PERSONALIZED_COURSE_3_ID = 'c9d0e1f2-a3b4-5678-def0-789012345678'; // Personalized for learner (NEW)
const PERSONALIZED_COURSE_4_ID = 'd0e1f2a3-b4c5-6789-ef01-890123456789'; // Personalized for learner 2 (NEW)

// Mock Company ID
const COMPANY_ID = 'd4e5f6a7-b8c9-0123-def0-234567890123';

const courseRepository = new CourseRepository();
const registrationRepository = new RegistrationRepository();
const topicRepository = new TopicRepository();
const moduleRepository = new ModuleRepository();
const lessonRepository = new LessonRepository();
const feedbackRepository = new FeedbackRepository();

/**
 * Helper function to create full course content structure
 * Creates multiple topics, each with multiple modules, each with multiple lessons
 */
async function createFullCourseContent(courseId, courseStructure, trainerId) {
  const createdContent = {
    topics: [],
    modules: [],
    lessons: []
  };

  for (const topicData of courseStructure.topics) {
    // Create topic
    const topic = await topicRepository.create({
      course_id: courseId,
      topic_name: topicData.name,
      topic_description: topicData.description
    });
    createdContent.topics.push(topic);

    for (const moduleData of topicData.modules) {
      // Create module
      const module = await moduleRepository.create({
        topic_id: topic.id,
        module_name: moduleData.name,
        module_description: moduleData.description
      });
      createdContent.modules.push(module);

      for (const lessonData of moduleData.lessons) {
        // Create lesson
        const lesson = await lessonRepository.create({
          module_id: module.id,
          topic_id: topic.id,
          lesson_name: lessonData.name,
          lesson_description: lessonData.description,
          skills: lessonData.skills || [],
          trainer_ids: trainerId ? [trainerId] : [],
          content_type: lessonData.content_type || 'mixed',
          content_data: lessonData.content_data || [],
          devlab_exercises: lessonData.devlab_exercises || []
        });
        createdContent.lessons.push(lesson);
      }
    }
  }

  return createdContent;
}

async function seedMockData() {
  try {
    console.log('🌱 Starting database seeding with mock data...\n');

    // ============================================
    // MARKETPLACE COURSES (Trainer courses - enrollment through frontend)
    // ============================================
    
    // 1. Marketplace Course 1: JavaScript
    console.log('📚 Creating marketplace course 1: JavaScript...');
    const marketplaceCourse1 = await courseRepository.create({
      id: MARKETPLACE_COURSE_1_ID,
      course_name: 'Mastering Modern JavaScript: ES6+ and Beyond',
      course_description: 'A comprehensive course covering modern JavaScript features including ES6+ syntax, async/await, modules, and advanced patterns. Build real-world applications with the latest JavaScript standards.',
      course_type: 'trainer',
      status: 'active',
      level: 'intermediate',
      duration_hours: 15,
      start_date: new Date(),
      created_by_user_id: TRAINER_ID,
      learning_path_designation: {},
      studentsIDDictionary: {}, // Will enroll learner after content creation
      feedbackDictionary: {},
      lesson_completion_dictionary: {}
    });
    console.log(`   ✅ Course created: ${marketplaceCourse1.course_name}\n`);

    // 2. Marketplace Course 2: Python
    console.log('📚 Creating marketplace course 2: Python...');
    const marketplaceCourse2 = await courseRepository.create({
      id: MARKETPLACE_COURSE_2_ID,
      course_name: 'Python for Data Science and Machine Learning',
      course_description: 'Learn Python programming from scratch and dive into data science libraries like Pandas, NumPy, and Scikit-learn. Build machine learning models and analyze real-world datasets.',
      course_type: 'trainer',
      status: 'active',
      level: 'beginner',
      duration_hours: 20,
      start_date: new Date(),
      created_by_user_id: TRAINER_2_ID,
      learning_path_designation: {},
      studentsIDDictionary: {}, // Will enroll learner after content creation
      feedbackDictionary: {},
      lesson_completion_dictionary: {}
    });
    console.log(`   ✅ Course created: ${marketplaceCourse2.course_name}\n`);

    // 3. Marketplace Course 3: React
    console.log('📚 Creating marketplace course 3: React...');
    const marketplaceCourse3 = await courseRepository.create({
      id: MARKETPLACE_COURSE_3_ID,
      course_name: 'Advanced React Development: Hooks, Context, and Performance',
      course_description: 'Master advanced React concepts including custom hooks, Context API, performance optimization, and state management patterns. Build scalable React applications.',
      course_type: 'trainer',
      status: 'active',
      level: 'advanced',
      duration_hours: 12,
      start_date: new Date(),
      created_by_user_id: TRAINER_ID,
      learning_path_designation: {},
      studentsIDDictionary: {}, // Will enroll learner after content creation
      feedbackDictionary: {},
      lesson_completion_dictionary: {}
    });
    console.log(`   ✅ Course created: ${marketplaceCourse3.course_name}\n`);

    // 4. Marketplace Course 4: Node.js (NEW - FULL COURSE)
    console.log('📚 Creating marketplace course 4: Node.js (Full Course)...');
    const marketplaceCourse4 = await courseRepository.create({
      id: MARKETPLACE_COURSE_4_ID,
      course_name: 'Complete Node.js Backend Development',
      course_description: 'Build production-ready backend applications with Node.js. Learn Express.js, database integration, authentication, API design, testing, and deployment strategies.',
      course_type: 'trainer',
      status: 'active',
      level: 'intermediate',
      duration_hours: 30,
      start_date: new Date(),
      created_by_user_id: TRAINER_ID,
      learning_path_designation: {},
      studentsIDDictionary: {}, // Will enroll learner after content creation
      feedbackDictionary: {},
      lesson_completion_dictionary: {}
    });
    console.log(`   ✅ Course created: ${marketplaceCourse4.course_name}\n`);

    // ============================================
    // PERSONALIZED COURSES (Learner-specific - automatic enrollment)
    // ALL FOR SINGLE LEARNER: Alice Learner
    // ============================================
    
    // 5. Personalized Course 1: For Single Learner
    console.log('📚 Creating personalized course 1 for learner...');
    const personalizedCourse1 = await courseRepository.create({
      id: PERSONALIZED_COURSE_1_ID,
      course_name: 'Personalized Full-Stack Development Path',
      course_description: 'A customized learning path designed specifically for your skill level and career goals. Focuses on building full-stack applications with modern technologies.',
      course_type: 'learner_specific',
      status: 'active',
      level: 'intermediate',
      duration_hours: 25,
      start_date: new Date(),
      created_by_user_id: LEARNER_ID,
      learning_path_designation: {
        is_designated: true,
        target_competency: {
          competency_id: 'comp-001',
          competency_name: 'Full-Stack Development',
          target_level: 'intermediate',
          max_test_attempts: 3
        }
      },
      studentsIDDictionary: {
        [LEARNER_ID]: {
          status: 'in_progress',
          enrolled_date: new Date().toISOString(),
          completion_reason: null
        }
      }, // Automatic enrollment for personalized courses
      feedbackDictionary: {},
      lesson_completion_dictionary: {}
    });
    console.log(`   ✅ Course created: ${personalizedCourse1.course_name}\n`);

    // 6. Personalized Course 2: For Single Learner
    console.log('📚 Creating personalized course 2 for learner...');
    const personalizedCourse2 = await courseRepository.create({
      id: PERSONALIZED_COURSE_2_ID,
      course_name: 'AI and Machine Learning Fundamentals',
      course_description: 'A personalized introduction to artificial intelligence and machine learning tailored to your background. Learn core concepts and practical applications.',
      course_type: 'learner_specific',
      status: 'active',
      level: 'beginner',
      duration_hours: 18,
      start_date: new Date(),
      created_by_user_id: LEARNER_ID,
      learning_path_designation: {
        is_designated: true,
        target_competency: {
          competency_id: 'comp-002',
          competency_name: 'Machine Learning',
          target_level: 'beginner',
          max_test_attempts: 2
        }
      },
      studentsIDDictionary: {
        [LEARNER_ID]: {
          status: 'in_progress',
          enrolled_date: new Date().toISOString(),
          completion_reason: null
        }
      }, // Automatic enrollment
      feedbackDictionary: {},
      lesson_completion_dictionary: {}
    });
    console.log(`   ✅ Course created: ${personalizedCourse2.course_name}\n`);

    // 7. Personalized Course 3: For Single Learner (NEW - FULL COURSE)
    console.log('📚 Creating personalized course 3 for learner (Full Course)...');
    const personalizedCourse3 = await courseRepository.create({
      id: PERSONALIZED_COURSE_3_ID,
      course_name: 'Cloud Infrastructure and DevOps Mastery',
      course_description: 'A comprehensive personalized path covering cloud platforms (AWS, Azure), containerization with Docker and Kubernetes, CI/CD pipelines, and infrastructure as code. Tailored to accelerate your DevOps career.',
      course_type: 'learner_specific',
      status: 'active',
      level: 'advanced',
      duration_hours: 35,
      start_date: new Date(),
      created_by_user_id: LEARNER_ID,
      learning_path_designation: {
        is_designated: true,
        target_competency: {
          competency_id: 'comp-003',
          competency_name: 'DevOps Engineering',
          target_level: 'advanced',
          max_test_attempts: 3
        }
      },
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
    console.log(`   ✅ Course created: ${personalizedCourse3.course_name}\n`);

    // 8. Personalized Course 4: For Single Learner (NEW - FULL COURSE)
    console.log('📚 Creating personalized course 4 for learner (Full Course)...');
    const personalizedCourse4 = await courseRepository.create({
      id: PERSONALIZED_COURSE_4_ID,
      course_name: 'Data Engineering and Big Data Analytics',
      course_description: 'Master data engineering concepts including ETL pipelines, data warehousing, stream processing, and big data technologies. Personalized learning path for data professionals.',
      course_type: 'learner_specific',
      status: 'active',
      level: 'intermediate',
      duration_hours: 28,
      start_date: new Date(),
      created_by_user_id: LEARNER_ID,
      learning_path_designation: {
        is_designated: true,
        target_competency: {
          competency_id: 'comp-004',
          competency_name: 'Data Engineering',
          target_level: 'intermediate',
          max_test_attempts: 2
        }
      },
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
    console.log(`   ✅ Course created: ${personalizedCourse4.course_name}\n`);

    // ============================================
    // CREATE FULL CONTENT FOR MARKETPLACE COURSE 1 (JavaScript)
    // ============================================
    console.log('📖 Creating FULL content for JavaScript course...');
    const jsCourseContent = await createFullCourseContent(MARKETPLACE_COURSE_1_ID, {
      topics: [
        {
          name: 'Advanced ES6+ Features',
          description: 'Deep dive into modern JavaScript features including destructuring, spread operators, template literals, and arrow functions',
          modules: [
            {
              name: 'Async Programming with Promises and Async/Await',
              description: 'Master asynchronous JavaScript programming patterns',
              lessons: [
                {
                  name: 'Understanding Promises and the Event Loop',
                  description: 'Learn how JavaScript handles asynchronous operations through Promises, the event loop, and microtask queues',
                  skills: ['javascript', 'async-programming', 'promises', 'event-loop'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'js-001',
                      content_type: 'video',
                      content_data: { title: 'JavaScript Promises Explained', youtube_id: 'DHvZLI7Db8E', duration: '15:30' }
                    },
                    {
                      content_id: 'js-002',
                      content_type: 'github_snippet',
                      content_data: { repo: 'mdn/learning-area', file_path: 'javascript/asynchronous/promises/promise-basics.html' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Async/Await Patterns and Error Handling',
                  description: 'Master the async/await syntax and learn best practices for error handling in asynchronous code',
                  skills: ['javascript', 'async-await', 'error-handling'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'js-003',
                      content_type: 'video',
                      content_data: { title: 'Async/Await Tutorial', youtube_id: 'vn3tm0quoqE', duration: '12:45' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Working with Fetch API and HTTP Requests',
                  description: 'Learn to make HTTP requests using Fetch API and handle responses effectively',
                  skills: ['javascript', 'fetch-api', 'http-requests'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'js-004',
                      content_type: 'video',
                      content_data: { title: 'Fetch API Complete Guide', youtube_id: 'cuEtnrL9-H0', duration: '18:20' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            },
            {
              name: 'Destructuring and Spread Operators',
              description: 'Learn advanced destructuring patterns and spread operator usage',
              lessons: [
                {
                  name: 'Array and Object Destructuring',
                  description: 'Master destructuring syntax for arrays and objects with practical examples',
                  skills: ['javascript', 'destructuring', 'es6'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'js-005',
                      content_type: 'video',
                      content_data: { title: 'Destructuring in JavaScript', youtube_id: 'NIq3qLaHCU8', duration: '14:10' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Spread and Rest Operators',
                  description: 'Understand the difference between spread and rest operators and their use cases',
                  skills: ['javascript', 'spread-operator', 'rest-operator'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'js-006',
                      content_type: 'video',
                      content_data: { title: 'Spread vs Rest Operators', youtube_id: 'iLx4ma8ZqvQ', duration: '10:30' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        },
        {
          name: 'Modules and Module Systems',
          description: 'Understanding ES6 modules, CommonJS, and modern module bundling',
          modules: [
            {
              name: 'ES6 Modules and Import/Export',
              description: 'Learn to use ES6 module syntax for organizing and sharing code',
              lessons: [
                {
                  name: 'Export and Import Syntax',
                  description: 'Master default and named exports, and various import patterns',
                  skills: ['javascript', 'es6-modules', 'import-export'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'js-007',
                      content_type: 'video',
                      content_data: { title: 'ES6 Modules Tutorial', youtube_id: 'cRHQNNcYq6s', duration: '16:45' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        }
      ]
    }, TRAINER_ID);
    console.log(`   ✅ Created: ${jsCourseContent.topics.length} topics, ${jsCourseContent.modules.length} modules, ${jsCourseContent.lessons.length} lessons\n`);

    // ============================================
    // CREATE FULL CONTENT FOR MARKETPLACE COURSE 2 (Python)
    // ============================================
    console.log('📖 Creating FULL content for Python course...');
    const pythonCourseContent = await createFullCourseContent(MARKETPLACE_COURSE_2_ID, {
      topics: [
        {
          name: 'Python Fundamentals',
          description: 'Master the basics of Python programming including data types, control structures, and functions',
          modules: [
            {
              name: 'Working with Data Structures',
              description: 'Learn to use lists, dictionaries, sets, and tuples effectively in Python',
              lessons: [
                {
                  name: 'Lists and List Comprehensions',
                  description: 'Understand Python lists and powerful list comprehension syntax for efficient data manipulation',
                  skills: ['python', 'data-structures', 'list-comprehensions'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'py-001',
                      content_type: 'video',
                      content_data: { title: 'Python Lists Tutorial', youtube_id: 'tw7ror9x32s', duration: '20:00' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Dictionaries and Sets',
                  description: 'Master dictionary operations, set theory, and their practical applications',
                  skills: ['python', 'dictionaries', 'sets'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'py-002',
                      content_type: 'video',
                      content_data: { title: 'Python Dictionaries Guide', youtube_id: 'daefaLgNkw0', duration: '22:15' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            },
            {
              name: 'Functions and Lambda Expressions',
              description: 'Learn to write reusable functions and use lambda expressions for functional programming',
              lessons: [
                {
                  name: 'Defining and Calling Functions',
                  description: 'Master function definition, parameters, return values, and scope',
                  skills: ['python', 'functions', 'programming'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'py-003',
                      content_type: 'video',
                      content_data: { title: 'Python Functions Tutorial', youtube_id: 'u-OmVr_fT4s', duration: '17:30' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Lambda Functions and Higher-Order Functions',
                  description: 'Understand lambda functions, map, filter, and reduce operations',
                  skills: ['python', 'lambda', 'functional-programming'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'py-004',
                      content_type: 'video',
                      content_data: { title: 'Lambda Functions Explained', youtube_id: '25ovCm9jKf8', duration: '13:45' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        },
        {
          name: 'Object-Oriented Programming in Python',
          description: 'Learn classes, inheritance, polymorphism, and encapsulation in Python',
          modules: [
            {
              name: 'Classes and Objects',
              description: 'Create and use classes, understand instance methods and attributes',
              lessons: [
                {
                  name: 'Introduction to Classes',
                  description: 'Learn the fundamentals of object-oriented programming with Python classes',
                  skills: ['python', 'oop', 'classes'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'py-005',
                      content_type: 'video',
                      content_data: { title: 'Python Classes Tutorial', youtube_id: 'ZDa-Z5JzLYM', duration: '19:20' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        }
      ]
    }, TRAINER_2_ID);
    console.log(`   ✅ Created: ${pythonCourseContent.topics.length} topics, ${pythonCourseContent.modules.length} modules, ${pythonCourseContent.lessons.length} lessons\n`);

    // ============================================
    // CREATE FULL CONTENT FOR MARKETPLACE COURSE 3 (React)
    // ============================================
    console.log('📖 Creating FULL content for React course...');
    const reactCourseContent = await createFullCourseContent(MARKETPLACE_COURSE_3_ID, {
      topics: [
        {
          name: 'React Hooks and State Management',
          description: 'Learn to use React Hooks for state management and side effects',
          modules: [
            {
              name: 'Custom Hooks and Context API',
              description: 'Build reusable custom hooks and manage global state with Context API',
              lessons: [
                {
                  name: 'Creating Custom Hooks',
                  description: 'Learn to extract component logic into reusable custom hooks',
                  skills: ['react', 'hooks', 'custom-hooks', 'state-management'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'react-001',
                      content_type: 'video',
                      content_data: { title: 'React Custom Hooks Tutorial', youtube_id: '6ThXsUwLWvc', duration: '18:45' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Context API for Global State',
                  description: 'Manage application-wide state using React Context API',
                  skills: ['react', 'context-api', 'global-state'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'react-002',
                      content_type: 'video',
                      content_data: { title: 'React Context API Guide', youtube_id: '5LrDIWkK_Bc', duration: '21:10' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            },
            {
              name: 'useState and useEffect Deep Dive',
              description: 'Master the most commonly used React hooks',
              lessons: [
                {
                  name: 'Managing State with useState',
                  description: 'Learn to manage component state effectively using useState hook',
                  skills: ['react', 'usestate', 'state-management'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'react-003',
                      content_type: 'video',
                      content_data: { title: 'useState Hook Tutorial', youtube_id: 'O6P86uwfdR0', duration: '14:25' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Side Effects with useEffect',
                  description: 'Handle side effects, API calls, and lifecycle events with useEffect',
                  skills: ['react', 'useeffect', 'side-effects'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'react-004',
                      content_type: 'video',
                      content_data: { title: 'useEffect Complete Guide', youtube_id: '0ZJgIjIy4YE', duration: '16:50' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        },
        {
          name: 'Performance Optimization',
          description: 'Learn techniques to optimize React application performance',
          modules: [
            {
              name: 'Memoization and Code Splitting',
              description: 'Use React.memo, useMemo, useCallback, and code splitting for better performance',
              lessons: [
                {
                  name: 'React.memo and useMemo',
                  description: 'Optimize re-renders using memoization techniques',
                  skills: ['react', 'performance', 'memoization'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'react-005',
                      content_type: 'video',
                      content_data: { title: 'React Performance Optimization', youtube_id: 'bZeBToIqaR4', duration: '20:30' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        }
      ]
    }, TRAINER_ID);
    console.log(`   ✅ Created: ${reactCourseContent.topics.length} topics, ${reactCourseContent.modules.length} modules, ${reactCourseContent.lessons.length} lessons\n`);

    // ============================================
    // CREATE FULL CONTENT FOR MARKETPLACE COURSE 4 (Node.js) - NEW
    // ============================================
    console.log('📖 Creating FULL content for Node.js course...');
    const nodejsCourseContent = await createFullCourseContent(MARKETPLACE_COURSE_4_ID, {
      topics: [
        {
          name: 'Node.js Fundamentals',
          description: 'Master the core concepts of Node.js including the event loop, streams, and file system operations',
          modules: [
            {
              name: 'Getting Started with Node.js',
              description: 'Learn Node.js basics, module system, and npm package management',
              lessons: [
                {
                  name: 'Introduction to Node.js and NPM',
                  description: 'Understand what Node.js is, how it works, and how to use npm for package management',
                  skills: ['nodejs', 'npm', 'javascript'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'node-001',
                      content_type: 'video',
                      content_data: { title: 'Node.js Introduction', youtube_id: 'TlB_eWDSMt4', duration: '22:00' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Node.js Event Loop and Asynchronous Programming',
                  description: 'Deep dive into Node.js event loop, callbacks, and asynchronous patterns',
                  skills: ['nodejs', 'event-loop', 'async-programming'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'node-002',
                      content_type: 'video',
                      content_data: { title: 'Node.js Event Loop Explained', youtube_id: '8aGhZQkoFbQ', duration: '26:45' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Working with File System and Streams',
                  description: 'Learn to read/write files and work with streams for efficient data processing',
                  skills: ['nodejs', 'filesystem', 'streams'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'node-003',
                      content_type: 'video',
                      content_data: { title: 'Node.js File System Tutorial', youtube_id: 'U57kU311-nE', duration: '19:15' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            },
            {
              name: 'Building Web Servers with Express',
              description: 'Create web servers and RESTful APIs using Express.js framework',
              lessons: [
                {
                  name: 'Express.js Basics and Routing',
                  description: 'Learn Express.js fundamentals, routing, and middleware concepts',
                  skills: ['nodejs', 'express', 'routing', 'middleware'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'node-004',
                      content_type: 'video',
                      content_data: { title: 'Express.js Tutorial', youtube_id: 'SccSCuHhOw0', duration: '24:30' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Building RESTful APIs',
                  description: 'Design and implement RESTful APIs with proper HTTP methods and status codes',
                  skills: ['nodejs', 'express', 'rest-api', 'api-design'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'node-005',
                      content_type: 'video',
                      content_data: { title: 'REST API Design Best Practices', youtube_id: 'pKd0Rpw7Y48', duration: '28:20' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Middleware and Error Handling',
                  description: 'Implement custom middleware and robust error handling strategies',
                  skills: ['nodejs', 'express', 'middleware', 'error-handling'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'node-006',
                      content_type: 'video',
                      content_data: { title: 'Express Middleware Guide', youtube_id: 'lY6icfhap2o', duration: '17:45' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        },
        {
          name: 'Database Integration',
          description: 'Connect Node.js applications to databases and work with data',
          modules: [
            {
              name: 'Working with PostgreSQL',
              description: 'Integrate PostgreSQL database with Node.js applications',
              lessons: [
                {
                  name: 'Setting Up Database Connections',
                  description: 'Configure database connections and connection pooling',
                  skills: ['nodejs', 'postgresql', 'database'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'node-007',
                      content_type: 'video',
                      content_data: { title: 'Node.js PostgreSQL Integration', youtube_id: 'ufdHsFClAk0', duration: '23:10' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Query Building and ORMs',
                  description: 'Write database queries and use ORMs like Sequelize or TypeORM',
                  skills: ['nodejs', 'postgresql', 'orm', 'database-queries'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'node-008',
                      content_type: 'video',
                      content_data: { title: 'Using ORMs with Node.js', youtube_id: 'bK3AJfs7qNY', duration: '25:50' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        },
        {
          name: 'Authentication and Security',
          description: 'Implement authentication, authorization, and security best practices',
          modules: [
            {
              name: 'JWT Authentication',
              description: 'Secure your APIs with JSON Web Tokens and authentication middleware',
              lessons: [
                {
                  name: 'Implementing JWT Authentication',
                  description: 'Build secure authentication system using JWT tokens',
                  skills: ['nodejs', 'jwt', 'authentication', 'security'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'node-009',
                      content_type: 'video',
                      content_data: { title: 'JWT Authentication Tutorial', youtube_id: '7Q17ubqLfaM', duration: '30:15' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        }
      ]
    }, TRAINER_ID);
    console.log(`   ✅ Created: ${nodejsCourseContent.topics.length} topics, ${nodejsCourseContent.modules.length} modules, ${nodejsCourseContent.lessons.length} lessons\n`);

    // ============================================
    // CREATE FULL CONTENT FOR PERSONALIZED COURSE 1
    // ============================================
    console.log('📖 Creating FULL content for personalized course 1...');
    const personalized1Content = await createFullCourseContent(PERSONALIZED_COURSE_1_ID, {
      topics: [
        {
          name: 'Full-Stack Architecture',
          description: 'Understanding full-stack application architecture and design patterns',
          modules: [
            {
              name: 'RESTful API Design',
              description: 'Design and implement RESTful APIs following best practices',
              lessons: [
                {
                  name: 'Building REST APIs with Express',
                  description: 'Create RESTful APIs using Express.js with proper routing and middleware',
                  skills: ['nodejs', 'express', 'rest-api', 'backend'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'fs-001',
                      content_type: 'video',
                      content_data: { title: 'Express.js REST API Tutorial', youtube_id: 'pKd0Rpw7Y48', duration: '25:00' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'API Documentation with Swagger',
                  description: 'Document your APIs using Swagger/OpenAPI specifications',
                  skills: ['api-documentation', 'swagger', 'openapi'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'fs-002',
                      content_type: 'video',
                      content_data: { title: 'Swagger API Documentation', youtube_id: 'S8kgj8h9l-E', duration: '18:30' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            },
            {
              name: 'Frontend-Backend Integration',
              description: 'Connect frontend applications to backend APIs',
              lessons: [
                {
                  name: 'Consuming REST APIs from Frontend',
                  description: 'Learn to make API calls from React/Vue applications and handle responses',
                  skills: ['frontend', 'api-integration', 'axios', 'fetch'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'fs-003',
                      content_type: 'video',
                      content_data: { title: 'Frontend API Integration', youtube_id: 'cuEtnrL9-H0', duration: '20:45' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        },
        {
          name: 'Database Design and Modeling',
          description: 'Learn to design efficient database schemas and relationships',
          modules: [
            {
              name: 'Relational Database Design',
              description: 'Understand normalization, relationships, and database design principles',
              lessons: [
                {
                  name: 'Database Normalization',
                  description: 'Learn normalization forms and when to apply them',
                  skills: ['database', 'normalization', 'sql'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'fs-004',
                      content_type: 'video',
                      content_data: { title: 'Database Normalization Explained', youtube_id: 'GFQaEYEc8_8', duration: '22:20' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        }
      ]
    }, null);
    console.log(`   ✅ Created: ${personalized1Content.topics.length} topics, ${personalized1Content.modules.length} modules, ${personalized1Content.lessons.length} lessons\n`);

    // ============================================
    // CREATE FULL CONTENT FOR PERSONALIZED COURSE 2
    // ============================================
    console.log('📖 Creating FULL content for personalized course 2...');
    const personalized2Content = await createFullCourseContent(PERSONALIZED_COURSE_2_ID, {
      topics: [
        {
          name: 'Introduction to Machine Learning',
          description: 'Fundamentals of machine learning and its applications',
          modules: [
            {
              name: 'Supervised Learning Basics',
              description: 'Learn about supervised learning algorithms and their use cases',
              lessons: [
                {
                  name: 'Linear Regression Fundamentals',
                  description: 'Understand linear regression, one of the most fundamental machine learning algorithms',
                  skills: ['machine-learning', 'linear-regression', 'supervised-learning'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'ml-001',
                      content_type: 'video',
                      content_data: { title: 'Linear Regression Explained', youtube_id: 'zPG4NjIkCjc', duration: '22:15' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Logistic Regression for Classification',
                  description: 'Learn logistic regression for binary and multiclass classification problems',
                  skills: ['machine-learning', 'logistic-regression', 'classification'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'ml-002',
                      content_type: 'video',
                      content_data: { title: 'Logistic Regression Tutorial', youtube_id: 'yIYKR4sgXa8', duration: '24:30' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            },
            {
              name: 'Unsupervised Learning',
              description: 'Explore clustering and dimensionality reduction techniques',
              lessons: [
                {
                  name: 'K-Means Clustering',
                  description: 'Learn to group data using K-means clustering algorithm',
                  skills: ['machine-learning', 'clustering', 'unsupervised-learning'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'ml-003',
                      content_type: 'video',
                      content_data: { title: 'K-Means Clustering Guide', youtube_id: '4b5d3muPQmA', duration: '19:45' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        },
        {
          name: 'Data Preprocessing',
          description: 'Learn to prepare and clean data for machine learning models',
          modules: [
            {
              name: 'Feature Engineering',
              description: 'Create meaningful features from raw data',
              lessons: [
                {
                  name: 'Handling Missing Data',
                  description: 'Techniques for dealing with missing values in datasets',
                  skills: ['machine-learning', 'data-preprocessing', 'feature-engineering'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'ml-004',
                      content_type: 'video',
                      content_data: { title: 'Handling Missing Data', youtube_id: 'BqXhUYxH8gY', duration: '21:00' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        }
      ]
    }, null);
    console.log(`   ✅ Created: ${personalized2Content.topics.length} topics, ${personalized2Content.modules.length} modules, ${personalized2Content.lessons.length} lessons\n`);

    // ============================================
    // CREATE FULL CONTENT FOR PERSONALIZED COURSE 3 (DevOps) - NEW
    // ============================================
    console.log('📖 Creating FULL content for personalized course 3 (DevOps)...');
    const personalized3Content = await createFullCourseContent(PERSONALIZED_COURSE_3_ID, {
      topics: [
        {
          name: 'Cloud Infrastructure Fundamentals',
          description: 'Understanding cloud computing concepts and major cloud providers',
          modules: [
            {
              name: 'AWS Core Services',
              description: 'Learn essential AWS services including EC2, S3, and RDS',
              lessons: [
                {
                  name: 'Introduction to AWS',
                  description: 'Overview of AWS services and how to get started',
                  skills: ['aws', 'cloud-computing', 'infrastructure'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'devops-001',
                      content_type: 'video',
                      content_data: { title: 'AWS Introduction', youtube_id: 'ulprqHHWlng', duration: '28:00' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'EC2 Instances and Auto Scaling',
                  description: 'Launch and manage EC2 instances with auto-scaling groups',
                  skills: ['aws', 'ec2', 'auto-scaling'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'devops-002',
                      content_type: 'video',
                      content_data: { title: 'EC2 Tutorial', youtube_id: 'XXYx5z9k0EM', duration: '32:15' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'S3 Storage and Data Management',
                  description: 'Work with S3 buckets, objects, and storage classes',
                  skills: ['aws', 's3', 'storage'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'devops-003',
                      content_type: 'video',
                      content_data: { title: 'AWS S3 Complete Guide', youtube_id: 'r0EXv_2nEP4', duration: '25:40' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            },
            {
              name: 'Azure Cloud Platform',
              description: 'Explore Microsoft Azure services and deployment options',
              lessons: [
                {
                  name: 'Azure Virtual Machines and Networking',
                  description: 'Deploy and configure VMs on Azure with proper networking',
                  skills: ['azure', 'virtual-machines', 'networking'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'devops-004',
                      content_type: 'video',
                      content_data: { title: 'Azure VMs Tutorial', youtube_id: '3hLmDS179yw', duration: '29:20' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        },
        {
          name: 'Containerization and Orchestration',
          description: 'Master Docker and Kubernetes for containerized applications',
          modules: [
            {
              name: 'Docker Fundamentals',
              description: 'Learn to containerize applications using Docker',
              lessons: [
                {
                  name: 'Docker Basics and Images',
                  description: 'Understand Docker concepts, images, and containers',
                  skills: ['docker', 'containers', 'containerization'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'devops-005',
                      content_type: 'video',
                      content_data: { title: 'Docker Tutorial for Beginners', youtube_id: 'fqMOX6JJhGo', duration: '38:50' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Docker Compose and Multi-Container Apps',
                  description: 'Orchestrate multiple containers using Docker Compose',
                  skills: ['docker', 'docker-compose', 'multi-container'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'devops-006',
                      content_type: 'video',
                      content_data: { title: 'Docker Compose Guide', youtube_id: 'HG6yIjZapSA', duration: '27:30' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            },
            {
              name: 'Kubernetes Orchestration',
              description: 'Deploy and manage containerized applications with Kubernetes',
              lessons: [
                {
                  name: 'Kubernetes Basics: Pods, Deployments, and Services',
                  description: 'Learn core Kubernetes concepts and resources',
                  skills: ['kubernetes', 'k8s', 'orchestration'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'devops-007',
                      content_type: 'video',
                      content_data: { title: 'Kubernetes Tutorial', youtube_id: 'PH-2Nf4D3qU', duration: '45:20' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Scaling and Load Balancing in Kubernetes',
                  description: 'Scale applications and configure load balancing',
                  skills: ['kubernetes', 'scaling', 'load-balancing'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'devops-008',
                      content_type: 'video',
                      content_data: { title: 'Kubernetes Scaling', youtube_id: 'QJJVim4_D1o', duration: '33:15' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        },
        {
          name: 'CI/CD Pipelines',
          description: 'Automate build, test, and deployment processes',
          modules: [
            {
              name: 'GitHub Actions and GitLab CI',
              description: 'Set up continuous integration and deployment pipelines',
              lessons: [
                {
                  name: 'Building CI/CD Pipelines with GitHub Actions',
                  description: 'Create automated workflows for testing and deployment',
                  skills: ['ci-cd', 'github-actions', 'automation'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'devops-009',
                      content_type: 'video',
                      content_data: { title: 'GitHub Actions Tutorial', youtube_id: 'mFFXuXjVgkU', duration: '35:45' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'GitLab CI/CD Configuration',
                  description: 'Configure GitLab CI/CD pipelines with .gitlab-ci.yml',
                  skills: ['ci-cd', 'gitlab', 'automation'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'devops-010',
                      content_type: 'video',
                      content_data: { title: 'GitLab CI/CD Guide', youtube_id: 'Jav4vbUqVC8', duration: '31:20' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        }
      ]
    }, null);
    console.log(`   ✅ Created: ${personalized3Content.topics.length} topics, ${personalized3Content.modules.length} modules, ${personalized3Content.lessons.length} lessons\n`);

    // ============================================
    // CREATE FULL CONTENT FOR PERSONALIZED COURSE 4 (Data Engineering) - NEW
    // ============================================
    console.log('📖 Creating FULL content for personalized course 4 (Data Engineering)...');
    const personalized4Content = await createFullCourseContent(PERSONALIZED_COURSE_4_ID, {
      topics: [
        {
          name: 'ETL Pipeline Development',
          description: 'Build Extract, Transform, Load pipelines for data processing',
          modules: [
            {
              name: 'Data Extraction Techniques',
              description: 'Learn to extract data from various sources including databases, APIs, and files',
              lessons: [
                {
                  name: 'Extracting Data from Databases',
                  description: 'Connect to databases and extract data efficiently',
                  skills: ['data-engineering', 'etl', 'databases'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'de-001',
                      content_type: 'video',
                      content_data: { title: 'Database Data Extraction', youtube_id: 'ZDa-Z5JzLYM', duration: '26:30' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'API Data Extraction',
                  description: 'Extract data from REST APIs and handle pagination',
                  skills: ['data-engineering', 'api-integration', 'data-extraction'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'de-002',
                      content_type: 'video',
                      content_data: { title: 'API Data Extraction Guide', youtube_id: 'cuEtnrL9-H0', duration: '24:15' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            },
            {
              name: 'Data Transformation and Cleaning',
              description: 'Transform and clean data for analysis and storage',
              lessons: [
                {
                  name: 'Data Cleaning with Pandas',
                  description: 'Use Pandas to clean, transform, and prepare data',
                  skills: ['data-engineering', 'pandas', 'data-cleaning'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'de-003',
                      content_type: 'video',
                      content_data: { title: 'Pandas Data Cleaning', youtube_id: 'vmEHCJofslg', duration: '28:45' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Data Validation and Quality Checks',
                  description: 'Implement data validation and quality assurance processes',
                  skills: ['data-engineering', 'data-validation', 'data-quality'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'de-004',
                      content_type: 'video',
                      content_data: { title: 'Data Quality Assurance', youtube_id: 'BqXhUYxH8gY', duration: '22:30' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        },
        {
          name: 'Data Warehousing',
          description: 'Design and implement data warehouses for analytics',
          modules: [
            {
              name: 'Data Warehouse Design',
              description: 'Learn star and snowflake schemas for data warehousing',
              lessons: [
                {
                  name: 'Dimensional Modeling',
                  description: 'Design fact and dimension tables for data warehouses',
                  skills: ['data-warehousing', 'dimensional-modeling', 'data-modeling'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'de-005',
                      content_type: 'video',
                      content_data: { title: 'Data Warehouse Design', youtube_id: 'GFQaEYEc8_8', duration: '30:20' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        },
        {
          name: 'Stream Processing',
          description: 'Process real-time data streams using modern technologies',
          modules: [
            {
              name: 'Apache Kafka and Stream Processing',
              description: 'Learn to process real-time data streams with Kafka',
              lessons: [
                {
                  name: 'Introduction to Apache Kafka',
                  description: 'Understand Kafka architecture and core concepts',
                  skills: ['kafka', 'stream-processing', 'real-time-data'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'de-006',
                      content_type: 'video',
                      content_data: { title: 'Apache Kafka Tutorial', youtube_id: 'R873BlNVUB4', duration: '42:15' }
                    }
                  ],
                  devlab_exercises: []
                },
                {
                  name: 'Building Stream Processing Pipelines',
                  description: 'Create stream processing applications with Kafka Streams',
                  skills: ['kafka', 'stream-processing', 'data-pipelines'],
                  content_type: 'mixed',
                  content_data: [
                    {
                      content_id: 'de-007',
                      content_type: 'video',
                      content_data: { title: 'Kafka Streams Guide', youtube_id: 'Z3JKCLG3VP4', duration: '38:50' }
                    }
                  ],
                  devlab_exercises: []
                }
              ]
            }
          ]
        }
      ]
    }, null);
    console.log(`   ✅ Created: ${personalized4Content.topics.length} topics, ${personalized4Content.modules.length} modules, ${personalized4Content.lessons.length} lessons\n`);

    // ============================================
    // ENROLL SINGLE LEARNER IN PERSONALIZED COURSES ONLY
    // Marketplace courses require manual enrollment through the frontend
    // ============================================
    console.log('👤 Enrolling single learner (Alice Learner) in personalized courses only...\n');
    console.log('   Note: Marketplace courses require manual enrollment through the frontend.\n');

    // Enroll in all personalized courses (already have enrollment in studentsIDDictionary, just create registrations)
    console.log('📝 Enrolling in personalized courses...');
    const reg5 = await registrationRepository.create({
      learner_id: LEARNER_ID,
      learner_name: LEARNER_NAME,
      course_id: PERSONALIZED_COURSE_1_ID,
      company_id: COMPANY_ID,
      company_name: LEARNER_COMPANY,
      status: 'in_progress',
      enrolled_date: new Date()
    });
    console.log(`   ✅ ${LEARNER_NAME} → ${personalizedCourse1.course_name}`);

    const reg6 = await registrationRepository.create({
      learner_id: LEARNER_ID,
      learner_name: LEARNER_NAME,
      course_id: PERSONALIZED_COURSE_2_ID,
      company_id: COMPANY_ID,
      company_name: LEARNER_COMPANY,
      status: 'in_progress',
      enrolled_date: new Date()
    });
    console.log(`   ✅ ${LEARNER_NAME} → ${personalizedCourse2.course_name}`);

    const reg7 = await registrationRepository.create({
      learner_id: LEARNER_ID,
      learner_name: LEARNER_NAME,
      course_id: PERSONALIZED_COURSE_3_ID,
      company_id: COMPANY_ID,
      company_name: LEARNER_COMPANY,
      status: 'in_progress',
      enrolled_date: new Date()
    });
    console.log(`   ✅ ${LEARNER_NAME} → ${personalizedCourse3.course_name}`);

    const reg8 = await registrationRepository.create({
      learner_id: LEARNER_ID,
      learner_name: LEARNER_NAME,
      course_id: PERSONALIZED_COURSE_4_ID,
      company_id: COMPANY_ID,
      company_name: LEARNER_COMPANY,
      status: 'in_progress',
      enrolled_date: new Date()
    });
    console.log(`   ✅ ${LEARNER_NAME} → ${personalizedCourse4.course_name}\n`);

    // ============================================
    // ADD FEEDBACK FOR SOME COURSES
    // ============================================
    console.log('💬 Adding feedback for learner in some courses...');
    
    // Add feedback for personalized courses only (learner is enrolled in these)
    const feedback1 = await feedbackRepository.create({
      learner_id: LEARNER_ID,
      course_id: PERSONALIZED_COURSE_1_ID,
      rating: 5,
      comment: 'Perfect personalized path for my goals! The full-stack approach is exactly what I needed.'
    });
    console.log(`   ✅ Feedback added: 5 stars for ${personalizedCourse1.course_name}`);
    
    const feedback2 = await feedbackRepository.create({
      learner_id: LEARNER_ID,
      course_id: PERSONALIZED_COURSE_3_ID,
      rating: 5,
      comment: 'Excellent DevOps course! The cloud infrastructure section was particularly helpful.'
    });
    console.log(`   ✅ Feedback added: 5 stars for ${personalizedCourse3.course_name}\n`);

    // Update feedbackDictionary in personalized courses
    const pCourse1 = await courseRepository.findById(PERSONALIZED_COURSE_1_ID);
    await courseRepository.update(PERSONALIZED_COURSE_1_ID, {
      feedbackDictionary: {
        ...(pCourse1.feedbackDictionary || {}),
        [LEARNER_ID]: {
          rating: 5,
          comment: feedback1.comment,
          submitted_at: new Date().toISOString()
        }
      }
    });
    
    const pCourse3 = await courseRepository.findById(PERSONALIZED_COURSE_3_ID);
    await courseRepository.update(PERSONALIZED_COURSE_3_ID, {
      feedbackDictionary: {
        ...(pCourse3.feedbackDictionary || {}),
        [LEARNER_ID]: {
          rating: 5,
          comment: feedback2.comment,
          submitted_at: new Date().toISOString()
        }
      }
    });

    // ============================================
    // ADD LESSON COMPLETION PROGRESS
    // ============================================
    console.log('📊 Adding lesson completion progress...');
    
    // Helper function to mark lessons as completed for a course
    async function addLessonProgress(courseId, completedLessonIds, courseName) {
      const course = await courseRepository.findById(courseId);
      const progressDict = {
        ...(course.lesson_completion_dictionary || {}),
        [LEARNER_ID]: {
          completed_lessons: completedLessonIds,
          progress_percentage: Math.round((completedLessonIds.length / (course.duration_hours || 1)) * 100),
          last_accessed: new Date().toISOString()
        }
      };
      await courseRepository.update(courseId, { lesson_completion_dictionary: progressDict });
      console.log(`   ✅ Progress added: ${completedLessonIds.length} lessons completed in ${courseName}`);
    }

    // Add progress for personalized courses only (learner is enrolled in these)
    // Add progress for personalized course 1 (first lesson)
    if (personalized1Content.lessons.length >= 1) {
      await addLessonProgress(PERSONALIZED_COURSE_1_ID,
        [personalized1Content.lessons[0].id],
        personalizedCourse1.course_name);
    }
    
    // Add progress for personalized course 3 (first lesson)
    if (personalized3Content.lessons.length >= 1) {
      await addLessonProgress(PERSONALIZED_COURSE_3_ID,
        [personalized3Content.lessons[0].id],
        personalizedCourse3.course_name);
    }
    
    console.log('');

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log('\n👥 Users:');
    console.log(`   👨‍🏫 Trainer 1: Tristan Trainer (${TRAINER_ID.substring(0, 8)}...)`);
    console.log(`   👨‍🏫 Trainer 2: Trainer 2 (${TRAINER_2_ID.substring(0, 8)}...)`);
    console.log(`   👤 SINGLE LEARNER: ${LEARNER_NAME} (${LEARNER_ID.substring(0, 8)}...)`);
    console.log(`      Company: ${LEARNER_COMPANY}`);
    
    console.log('\n📚 Marketplace Courses (Available for manual enrollment):');
    console.log(`   1. ${marketplaceCourse1.course_name} (${marketplaceCourse1.level}) - ${jsCourseContent.lessons.length} lessons`);
    console.log(`   2. ${marketplaceCourse2.course_name} (${marketplaceCourse2.level}) - ${pythonCourseContent.lessons.length} lessons`);
    console.log(`   3. ${marketplaceCourse3.course_name} (${marketplaceCourse3.level}) - ${reactCourseContent.lessons.length} lessons`);
    console.log(`   4. ${marketplaceCourse4.course_name} (${marketplaceCourse4.level}) - ${nodejsCourseContent.lessons.length} lessons`);
    
    console.log('\n🎯 Personalized Courses (Automatically enrolled for single learner):');
    console.log(`   1. ${personalizedCourse1.course_name} - ${personalized1Content.lessons.length} lessons ✓`);
    console.log(`   2. ${personalizedCourse2.course_name} - ${personalized2Content.lessons.length} lessons ✓`);
    console.log(`   3. ${personalizedCourse3.course_name} - ${personalized3Content.lessons.length} lessons ✓`);
    console.log(`   4. ${personalizedCourse4.course_name} - ${personalized4Content.lessons.length} lessons ✓`);
    
    const totalTopics = jsCourseContent.topics.length + pythonCourseContent.topics.length + 
                       reactCourseContent.topics.length + nodejsCourseContent.topics.length +
                       personalized1Content.topics.length + personalized2Content.topics.length +
                       personalized3Content.topics.length + personalized4Content.topics.length;
    const totalModules = jsCourseContent.modules.length + pythonCourseContent.modules.length + 
                        reactCourseContent.modules.length + nodejsCourseContent.modules.length +
                        personalized1Content.modules.length + personalized2Content.modules.length +
                        personalized3Content.modules.length + personalized4Content.modules.length;
    const totalLessons = jsCourseContent.lessons.length + pythonCourseContent.lessons.length + 
                        reactCourseContent.lessons.length + nodejsCourseContent.lessons.length +
                        personalized1Content.lessons.length + personalized2Content.lessons.length +
                        personalized3Content.lessons.length + personalized4Content.lessons.length;
    
    console.log('\n📖 Total Content Created:');
    console.log(`   • ${totalTopics} Topics`);
    console.log(`   • ${totalModules} Modules`);
    console.log(`   • ${totalLessons} Lessons`);
    console.log(`   • 4 Registrations (ALL for ${LEARNER_NAME} - personalized courses only)`);
    console.log(`   • 2 Feedback entries (for personalized courses)`);
    console.log(`   • Lesson progress tracked in 2 personalized courses`);
    
    console.log('\n🎉 Database is ready with real data!');
    console.log(`   Single learner (${LEARNER_NAME}) is enrolled in 4 personalized courses`);
    console.log('   Marketplace courses: Available for manual enrollment via frontend');
    console.log('   Personalized courses: Automatically enrolled and ready to learn');
    console.log('   Feedback and progress data included for personalized courses');
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

