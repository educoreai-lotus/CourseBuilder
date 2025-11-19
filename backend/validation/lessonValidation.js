/**
 * Lesson Validation Schemas
 */

import Joi from 'joi';

export const createLessonSchema = Joi.object({
  module_id: Joi.string().uuid().required(),
  topic_id: Joi.string().uuid().required(),
  lesson_name: Joi.string().required().min(1).max(500),
  lesson_description: Joi.string().optional().allow(null, ''),
  skills: Joi.array().items(Joi.string()).default([]),
  trainer_ids: Joi.array().items(Joi.string().uuid()).default([]),
  content_type: Joi.string().optional().allow(null, ''),
  content_data: Joi.object().default({}),
  devlab_exercises: Joi.array().default([])
});

export const updateLessonSchema = Joi.object({
  lesson_name: Joi.string().min(1).max(500).optional(),
  lesson_description: Joi.string().optional().allow(null, ''),
  skills: Joi.array().items(Joi.string()).optional(),
  trainer_ids: Joi.array().items(Joi.string().uuid()).optional(),
  content_type: Joi.string().optional().allow(null, ''),
  content_data: Joi.object().optional(),
  devlab_exercises: Joi.array().optional()
});

export const validateLesson = (data) => {
  return createLessonSchema.validate(data, { abortEarly: false });
};

export const validateLessonUpdate = (data) => {
  return updateLessonSchema.validate(data, { abortEarly: false });
};







