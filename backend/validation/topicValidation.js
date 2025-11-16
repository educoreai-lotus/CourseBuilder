/**
 * Topic Validation Schemas
 */

import Joi from 'joi';

export const createTopicSchema = Joi.object({
  course_id: Joi.string().uuid().required(),
  topic_name: Joi.string().required().min(1).max(500),
  topic_description: Joi.string().optional().allow(null, ''),
  skills: Joi.array().items(Joi.string()).default([])
});

export const updateTopicSchema = Joi.object({
  topic_name: Joi.string().min(1).max(500).optional(),
  topic_description: Joi.string().optional().allow(null, ''),
  skills: Joi.array().items(Joi.string()).optional()
});

export const validateTopic = (data) => {
  return createTopicSchema.validate(data, { abortEarly: false });
};

export const validateTopicUpdate = (data) => {
  return updateTopicSchema.validate(data, { abortEarly: false });
};




