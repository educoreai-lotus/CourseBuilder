/**
 * Course Validation Schemas (Joi)
 */

import Joi from 'joi';

export const courseTypeEnum = ['learner_specific', 'trainer'];
export const courseStatusEnum = ['active', 'archived', 'draft'];
export const courseLevelEnum = ['beginner', 'intermediate', 'advanced'];

export const learningPathDesignationSchema = Joi.object({
  is_designated: Joi.boolean().default(false),
  target_competency: Joi.object({
    competency_id: Joi.string().uuid().optional(),
    competency_name: Joi.string().optional(),
    target_level: Joi.string().optional()
  }).optional()
}).default({});

export const studentDictionarySchema = Joi.object().pattern(
  Joi.string().uuid(),
  Joi.object({
    status: Joi.string().valid('in_progress', 'completed', 'failed').required(),
    enrolled_date: Joi.date().iso().required(),
    completed_date: Joi.date().iso().optional(),
    completion_reason: Joi.string().optional()
  })
).default({});

export const feedbackDictionarySchema = Joi.object().pattern(
  Joi.string().uuid(),
  Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().optional(),
    submitted_at: Joi.date().iso().required()
  })
).default({});

export const lessonCompletionDictionarySchema = Joi.object().pattern(
  Joi.string().uuid(),
  Joi.object().pattern(
    Joi.string().uuid(),
    Joi.object({
      completed: Joi.boolean().required(),
      completed_at: Joi.date().iso().optional()
    })
  )
).default({});

export const createCourseSchema = Joi.object({
  course_name: Joi.string().required().min(1).max(500),
  course_description: Joi.string().optional().allow(null, ''),
  course_type: Joi.string().valid(...courseTypeEnum).required(),
  status: Joi.string().valid(...courseStatusEnum).default('draft'),
  level: Joi.string().valid(...courseLevelEnum).optional().allow(null),
  duration_hours: Joi.number().integer().min(0).optional().allow(null),
  start_date: Joi.date().iso().optional().allow(null),
  created_by_user_id: Joi.string().uuid().optional().allow(null),
  learning_path_designation: learningPathDesignationSchema,
  studentsIDDictionary: studentDictionarySchema,
  feedbackDictionary: feedbackDictionarySchema,
  lesson_completion_dictionary: lessonCompletionDictionarySchema
});

export const updateCourseSchema = Joi.object({
  course_name: Joi.string().min(1).max(500).optional(),
  course_description: Joi.string().optional().allow(null, ''),
  status: Joi.string().valid(...courseStatusEnum).optional(),
  level: Joi.string().valid(...courseLevelEnum).optional().allow(null),
  duration_hours: Joi.number().integer().min(0).optional().allow(null),
  start_date: Joi.date().iso().optional().allow(null),
  learning_path_designation: learningPathDesignationSchema.optional(),
  studentsIDDictionary: studentDictionarySchema.optional(),
  feedbackDictionary: feedbackDictionarySchema.optional(),
  lesson_completion_dictionary: lessonCompletionDictionarySchema.optional()
});

export const validateCourse = (data) => {
  return createCourseSchema.validate(data, { abortEarly: false });
};

export const validateCourseUpdate = (data) => {
  return updateCourseSchema.validate(data, { abortEarly: false });
};


