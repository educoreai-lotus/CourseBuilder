/**
 * Manual test script for AI Structure Generator
 * Run with: node test-ai-structure.js
 */

import { generateAIStructure } from './services/AIStructureGenerator.js';
import dotenv from 'dotenv';

dotenv.config();

// Mock lessons similar to what Content Studio would return
const mockLessons = [
  {
    lessonId: 'lesson_1',
    lessonName: 'Introduction to React',
    description: 'Learn the basics of React framework and how to create your first component',
    content_data: [
      { content: 'React is a JavaScript library for building user interfaces. It was developed by Facebook and is now widely used in web development.' }
    ],
    skills: ['react', 'javascript', 'frontend']
  },
  {
    lessonId: 'lesson_2',
    lessonName: 'JSX and Components',
    description: 'Understanding JSX syntax and creating reusable components',
    content_data: [
      { content: 'JSX allows you to write HTML-like syntax in JavaScript. Components are the building blocks of React applications.' }
    ],
    skills: ['react', 'jsx', 'components']
  },
  {
    lessonId: 'lesson_3',
    lessonName: 'Props and State',
    description: 'Learning how to pass data using props and manage component state',
    content_data: [
      { content: 'Props allow you to pass data from parent to child components. State allows components to manage their own data.' }
    ],
    skills: ['react', 'props', 'state']
  },
  {
    lessonId: 'lesson_4',
    lessonName: 'React Hooks',
    description: 'Using useState and useEffect hooks in functional components',
    content_data: [
      { content: 'Hooks are functions that let you use state and other React features in functional components. useState and useEffect are the most commonly used hooks.' }
    ],
    skills: ['react', 'hooks', 'usestate', 'useeffect']
  },
  {
    lessonId: 'lesson_5',
    lessonName: 'Custom Hooks',
    description: 'Creating custom hooks to share logic between components',
    content_data: [
      { content: 'Custom hooks allow you to extract component logic into reusable functions. They must start with "use" and can call other hooks.' }
    ],
    skills: ['react', 'hooks', 'custom-hooks']
  },
  {
    lessonId: 'lesson_6',
    lessonName: 'Context API',
    description: 'Using Context API for state management across components',
    content_data: [
      { content: 'Context API allows you to share data across components without prop drilling. It is useful for global state like themes or user authentication.' }
    ],
    skills: ['react', 'context', 'state-management']
  },
  {
    lessonId: 'lesson_7',
    lessonName: 'Performance Optimization',
    description: 'Optimizing React applications with memo, useMemo, and useCallback',
    content_data: [
      { content: 'React provides several optimization techniques including React.memo, useMemo, and useCallback to prevent unnecessary re-renders.' }
    ],
    skills: ['react', 'performance', 'optimization']
  },
  {
    lessonId: 'lesson_8',
    lessonName: 'Testing React Components',
    description: 'Writing tests for React components using Jest and React Testing Library',
    content_data: [
      { content: 'Testing ensures your components work correctly. Jest and React Testing Library are popular tools for testing React applications.' }
    ],
    skills: ['react', 'testing', 'jest']
  }
];

const mockLearningPath = [
  { topicName: 'React Fundamentals' },
  { topicName: 'Advanced React Concepts' }
];

const mockSkills = ['react', 'javascript', 'frontend-development'];

async function testAIStructure() {
  console.log('🧪 Testing AI Structure Generator\n');
  console.log('=' .repeat(50));
  
  // Check environment
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not set. Testing fallback behavior...\n');
  } else {
    console.log('✅ OPENAI_API_KEY is configured\n');
  }
  
  console.log(`📚 Input Lessons: ${mockLessons.length}`);
  console.log(`🎯 Learning Path Topics: ${mockLearningPath.length}`);
  console.log(`🛠️  Skills: ${mockSkills.join(', ')}\n`);
  console.log('=' .repeat(50));
  console.log('\n🔄 Generating structure...\n');

  try {
    const startTime = Date.now();
    const result = await generateAIStructure({
      learningPath: mockLearningPath,
      skills: mockSkills,
      allLessons: mockLessons
    });
    const endTime = Date.now();

    console.log('=' .repeat(50));
    console.log('📊 RESULT\n');
    console.log(`Source: ${result.source}`);
    console.log(`Valid: ${result.isValid}`);
    console.log(`Time: ${endTime - startTime}ms\n`);

    if (result.structure && result.structure.topics) {
      console.log(`Topics: ${result.structure.topics.length}\n`);
      
      result.structure.topics.forEach((topic, topicIndex) => {
        console.log(`📖 Topic ${topicIndex + 1}: ${topic.topic_name}`);
        if (topic.topic_description) {
          console.log(`   ${topic.topic_description}`);
        }
        console.log(`   Modules: ${topic.modules.length}`);
        
        topic.modules.forEach((module, moduleIndex) => {
          console.log(`   📦 Module ${moduleIndex + 1}: ${module.module_name}`);
          if (module.module_description) {
            console.log(`      ${module.module_description}`);
          }
          console.log(`      Lessons: ${module.lesson_ids.length} (${module.lesson_ids.join(', ')})`);
        });
        console.log('');
      });

      // Validate structure
      const allAssignedLessons = new Set();
      let totalLessons = 0;
      
      result.structure.topics.forEach(topic => {
        topic.modules.forEach(module => {
          module.lesson_ids.forEach(lessonId => {
            allAssignedLessons.add(lessonId);
            totalLessons++;
          });
        });
      });

      console.log('=' .repeat(50));
      console.log('✅ VALIDATION\n');
      console.log(`Expected lessons: ${mockLessons.length}`);
      console.log(`Assigned lessons: ${totalLessons}`);
      console.log(`Unique lessons: ${allAssignedLessons.size}`);
      
      if (allAssignedLessons.size === mockLessons.length && totalLessons === mockLessons.length) {
        console.log('\n✅ All lessons properly assigned!');
      } else {
        console.log('\n⚠️  Lesson assignment mismatch!');
        const missing = mockLessons
          .map(l => l.lessonId)
          .filter(id => !allAssignedLessons.has(id));
        if (missing.length > 0) {
          console.log(`Missing: ${missing.join(', ')}`);
        }
      }
    } else {
      console.log('❌ No structure generated');
    }

    console.log('\n' + '=' .repeat(50));
    console.log('✨ Test completed!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testAIStructure().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

