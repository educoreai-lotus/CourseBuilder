/**
 * Fallback Data for Integration Handlers
 * Provides mock/sample data when external services are unavailable
 */

export const fallbackData = {
  ContentStudio: {
    learner_specific: {
      learner_id: '00000000-0000-0000-0000-000000000001',
      learner_name: 'Demo Learner',
      learner_company: 'Demo Company',
      topics: [
        {
          topic_name: 'Introduction to Web Development',
          lessons: [
            {
              lesson_name: 'Getting Started with HTML',
              lesson_description: 'Learn the basics of HTML structure and tags',
              content_type: 'text',
              content_data: {
                text: '<h1>Welcome to HTML</h1><p>HTML is the foundation of web development...</p>'
              },
              skills: ['html', 'web-development'],
              devlab_exercises: []
            },
            {
              lesson_name: 'CSS Fundamentals',
              lesson_description: 'Master CSS styling and layout',
              content_type: 'text',
              content_data: {
                text: '<h1>CSS Basics</h1><p>CSS allows you to style your HTML...</p>'
              },
              skills: ['css', 'styling'],
              devlab_exercises: []
            }
          ]
        },
        {
          topic_name: 'JavaScript Basics',
          lessons: [
            {
              lesson_name: 'Variables and Data Types',
              lesson_description: 'Understanding JavaScript variables',
              content_type: 'text',
              content_data: {
                text: '<h1>JavaScript Variables</h1><p>Variables store data values...</p>'
              },
              skills: ['javascript', 'programming'],
              devlab_exercises: [
                {
                  exercise_id: 'ex-js-001',
                  exercise_name: 'Create Variables',
                  difficulty: 'beginner'
                }
              ]
            }
          ]
        }
      ]
    },
    trainer: {
      course_name: 'Full Stack Web Development',
      course_description: 'Complete course covering frontend and backend development',
      topics: [
        {
          topic_name: 'Frontend Development',
          lessons: [
            {
              lesson_name: 'React Fundamentals',
              lesson_description: 'Introduction to React framework',
              content_type: 'text',
              content_data: {
                text: '<h1>React Basics</h1><p>React is a JavaScript library...</p>'
              },
              skills: ['react', 'javascript', 'frontend'],
              devlab_exercises: []
            }
          ]
        }
      ]
    }
  },

  Assessment: {
    learner_id: '00000000-0000-0000-0000-000000000001',
    course_id: '11111111-1111-1111-1111-111111111111',
    course_name: 'Web Development Fundamentals',
    exam_type: 'postcourse',
    passing_grade: 70.0,
    final_grade: 85.5,
    passed: true,
    assessment_date: new Date().toISOString()
  },

  LearnerAI: {
    user_id: '00000000-0000-0000-0000-000000000001',
    user_name: 'Demo User',
    company_id: 'company-demo-001',
    company_name: 'Demo Tech Corp',
    skills: ['javascript', 'react', 'nodejs', 'typescript'],
    competency_name: 'Full Stack Developer',
    skill_level: 'intermediate'
  },

  Directory: {
    employee_id: 'emp-demo-001',
    preferred_language: 'en-US',
    bonus_attempt: true,
    department: 'Engineering',
    role: 'Software Developer'
  },

  SkillsEngine: {
    skills: [
      {
        skill_id: 'skill-js-001',
        skill_name: 'JavaScript',
        category: 'programming',
        level: 'intermediate'
      },
      {
        skill_id: 'skill-react-001',
        skill_name: 'React',
        category: 'framework',
        level: 'beginner'
      },
      {
        skill_id: 'skill-node-001',
        skill_name: 'Node.js',
        category: 'backend',
        level: 'intermediate'
      }
    ]
  },

  LearningAnalytics: {
    // Learning Analytics doesn't send data back
    // This is just for reference
    analytics_id: 'analytics-demo-001',
    status: 'processed'
  },

  ManagementReporting: {
    // Management Reporting doesn't send data back
    // This is just for reference
    report_id: 'report-demo-001',
    status: 'generated'
  },

  Devlab: {
    // DevLab doesn't send data back
    // This is just for reference
    exercise_id: 'ex-demo-001',
    status: 'completed'
  }
};

/**
 * Get fallback data for a specific service
 * @param {string} serviceName - Service name (e.g., 'ContentStudio')
 * @param {string} variant - Optional variant (e.g., 'learner_specific', 'trainer')
 * @returns {Object} Fallback data object
 */
export function getFallbackData(serviceName, variant = null) {
  const serviceData = fallbackData[serviceName];
  
  if (!serviceData) {
    console.warn(`[Fallback Data] No fallback data found for service: ${serviceName}`);
    return {};
  }

  // Handle services with variants (like ContentStudio)
  if (variant && serviceData[variant]) {
    return serviceData[variant];
  }

  // Return the service data directly
  return serviceData;
}

/**
 * Check if fallback data should be used
 * @param {Error} error - The error that occurred
 * @param {string} serviceName - Service name
 * @returns {boolean} True if fallback should be used
 */
export function shouldUseFallback(error, serviceName) {
  // Use fallback for network errors, timeouts, or service unavailable
  const networkErrors = [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNRESET',
    'Network Error',
    'Service Unavailable',
    'timeout'
  ];

  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || '';

  return (
    networkErrors.some(code => errorCode.includes(code)) ||
    networkErrors.some(msg => errorMessage.includes(msg)) ||
    error?.response?.status === 503 || // Service Unavailable
    error?.response?.status === 504 || // Gateway Timeout
    error?.response?.status === 502    // Bad Gateway
  );
}

export default {
  fallbackData,
  getFallbackData,
  shouldUseFallback
};

