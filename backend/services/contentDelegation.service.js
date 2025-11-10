import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_PATH = path.resolve(__dirname, '../protos/content_studio.proto');

const grpcEndpoint = process.env.CONTENT_STUDIO_GRPC_URL || '';
const grpcDeadlineMs = parseInt(process.env.CONTENT_STUDIO_TIMEOUT_MS || '5000', 10);
const useMock =
  process.env.CONTENT_STUDIO_MOCK === 'true' ||
  !grpcEndpoint ||
  process.env.NODE_ENV === 'test';

let grpcClient;

const loadGrpcClient = () => {
  if (grpcClient || useMock) {
    return grpcClient;
  }

  try {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const ContentStudio = protoDescriptor.contentstudio.ContentStudio;
    grpcClient = new ContentStudio(grpcEndpoint, grpc.credentials.createInsecure());
    return grpcClient;
  } catch (error) {
    console.error('[ContentDelegation] Failed to initialize gRPC client, fallback to mock:', error);
    grpcClient = null;
    return null;
  }
};

const buildMockLessons = (skills = []) => {
  const baseSkills = skills.length > 0 ? skills : ['Foundations', 'Practice'];

  return baseSkills.map((skill, index) => ({
    lessonId: uuidv4(),
    lessonName: `${skill} Essentials`,
    contentType: 'text',
    contentRef: `doc://${skill.toLowerCase().replace(/\s+/g, '_')}_essentials`,
    order: index + 1,
    content_data: {
      content_ref: `doc://${skill.toLowerCase().replace(/\s+/g, '_')}_essentials`
    }
  }));
};

const normalizeLessonPayload = (lessons = []) => {
  if (!Array.isArray(lessons) || lessons.length === 0) {
    return buildMockLessons();
  }

  return lessons.map((lesson, index) => ({
    lessonId: lesson.lessonId || uuidv4(),
    lessonName: lesson.lessonName || lesson.title || `Lesson ${index + 1}`,
    contentType: lesson.contentType || lesson.type || 'text',
    contentRef: lesson.contentRef || lesson.content_ref || `doc://lesson_${index + 1}`,
    order: lesson.order || lesson.order_index || index + 1,
    content_data: lesson.content_data || {
      content_ref: lesson.contentRef || lesson.content_ref || `doc://lesson_${index + 1}`
    }
  }));
};

export const requestLessonsFromContentStudio = async ({
  courseId,
  moduleId,
  topic,
  skills = [],
  learnerContext = {}
}) => {
  const client = loadGrpcClient();
  const payload = {
    courseId,
    moduleId,
    topic: {
      topicId: topic.topicId || '',
      topicName: topic.topicName,
      topicDescription: topic.topicDescription || '',
      topicLanguage: topic.topicLanguage || 'English'
    },
    skills,
    metadata: learnerContext.metadata || {},
    learnerId: learnerContext.learnerId || ''
  };

  if (!client) {
    return {
      lessons: buildMockLessons(skills),
      metadata: {
        source: 'mock',
        generatedAt: new Date().toISOString()
      }
    };
  }

  return new Promise((resolve) => {
    const deadline = new Date();
    deadline.setMilliseconds(deadline.getMilliseconds() + grpcDeadlineMs);

    client.GenerateLessons(payload, { deadline }, (error, response) => {
      if (error) {
        console.error('[ContentDelegation] gRPC call failed, fallback to mock:', error.message);
        resolve({
          lessons: buildMockLessons(skills),
          metadata: {
            source: 'mock-fallback',
            generatedAt: new Date().toISOString()
          }
        });
        return;
      }

      resolve({
        lessons: normalizeLessonPayload(response?.lessons),
        metadata: {
          source: 'content-studio',
          generatedAt: response?.generatedAt || new Date().toISOString()
        }
      });
    });
  });
};

export const contentDelegationService = {
  requestLessonsFromContentStudio
};

export default contentDelegationService;


