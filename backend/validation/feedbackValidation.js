/**
 * Feedback Validation Schemas
 */

import Joi from 'joi';

export const createFeedbackSchema = Joi.object({
  learner_id: Joi.string().uuid().required(),
  course_id: Joi.string().uuid().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().optional().allow(null, '')
  // Note: course_name is NOT stored in DB - it's looked up from course_id
  // when sending to Directory microservice via directoryDTO builder
});

export const updateFeedbackSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  comment: Joi.string().optional().allow(null, '')
});

export const validateFeedback = (data) => {
  return createFeedbackSchema.validate(data, { abortEarly: false });
};

export const validateFeedbackUpdate = (data) => {
  return updateFeedbackSchema.validate(data, { abortEarly: false });
};

