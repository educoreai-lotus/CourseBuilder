import Joi from 'joi';

// Validation schema for incoming input payloads
const inputSchema = Joi.object({
  learner_id: Joi.string().optional(),
  learner_name: Joi.string().optional(),
  learner_company: Joi.string().optional(),
  sourceService: Joi.string().optional(),
  learning_path: Joi.array().items(
    Joi.object({
      topic_id: Joi.string().optional(),
      topic_name: Joi.string().required(),
      topic_language: Joi.string().optional(),
      topic_description: Joi.string().optional(),
    })
  ).min(1).required(),
  skills: Joi.array().items(Joi.string()).min(1).required(),
  level: Joi.string().valid('beginner','intermediate','advanced').optional(),
  duration: Joi.number().integer().min(1).optional(),
  metadata: Joi.object().optional()
}).unknown(true);

export const validateInput = (data) => {
  const { error, value } = inputSchema.validate(data, { abortEarly: false });
  if (error) {
    const err = new Error(`Invalid input payload: ${error.details.map(d => d.message).join('; ')}`);
    err.status = 400;
    throw err;
  }
  return value;
};

export const prepareCourseInputDTO = (data) => {
  const normalized = validateInput(data);
  return {
    learnerId: normalized.learner_id || null,
    learnerName: normalized.learner_name || null,
    learnerCompany: normalized.learner_company || null,
    learningPath: normalized.learning_path.map(t => ({
      topicId: t.topic_id || null,
      topicName: t.topic_name,
      topicLanguage: t.topic_language || 'English',
      topicDescription: t.topic_description || ''
    })),
    skills: normalized.skills,
    level: normalized.level || null,
    duration: normalized.duration || null,
    metadata: {
      ...(normalized.metadata || {}),
      learner_name: normalized.learner_name || null,
      learner_company: normalized.learner_company || null
    }
  };
};

export const inputService = {
  validateInput,
  prepareCourseInputDTO
};


