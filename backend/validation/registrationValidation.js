/**
 * Registration Validation Schemas
 */

import Joi from 'joi';

export const registrationStatusEnum = ['completed', 'in_progress', 'failed'];

export const createRegistrationSchema = Joi.object({
  learner_id: Joi.string().uuid().required(),
  learner_name: Joi.string().optional().allow(null, ''),
  course_id: Joi.string().uuid().required(),
  company_id: Joi.string().uuid().optional().allow(null),
  company_name: Joi.string().optional().allow(null, ''),
  status: Joi.string().valid(...registrationStatusEnum).default('in_progress'),
  enrolled_date: Joi.date().iso().optional()
});

export const updateRegistrationSchema = Joi.object({
  status: Joi.string().valid(...registrationStatusEnum).optional(),
  completed_date: Joi.date().iso().optional()
});

export const validateRegistration = (data) => {
  return createRegistrationSchema.validate(data, { abortEarly: false });
};

export const validateRegistrationUpdate = (data) => {
  return updateRegistrationSchema.validate(data, { abortEarly: false });
};







