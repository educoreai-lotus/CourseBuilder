/**
 * Assessment Validation Schemas
 */

import Joi from 'joi';

export const examTypeEnum = ['postcourse'];

export const coverageMapItemSchema = Joi.object({
  lesson_id: Joi.string().uuid().required(),
  skills: Joi.array().items(Joi.string()).default([])
});

export const createAssessmentSchema = Joi.object({
  learner_id: Joi.string().uuid().required(),
  learner_name: Joi.string().optional().allow(null, ''),
  course_id: Joi.string().uuid().required(),
  exam_type: Joi.string().valid(...examTypeEnum).default('postcourse'),
  passing_grade: Joi.number().min(0).max(100).default(70.00),
  final_grade: Joi.number().min(0).max(100).optional().allow(null),
  passed: Joi.boolean().optional().allow(null)
  // Note: coverage_map is NOT stored in DB - it's built dynamically from lessons
  // when sending to Assessment microservice via assessmentDTO builder
});

export const validateAssessment = (data) => {
  return createAssessmentSchema.validate(data, { abortEarly: false });
};

