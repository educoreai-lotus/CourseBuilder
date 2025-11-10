import { prepareCourseInputDTO } from '../services/input.service.js';
import { generateStructure } from '../services/courseStructure.service.js';

export const acceptCourseInput = async (req, res, next) => {
  try {
    const headerSource = req.headers['x-source-service'] || req.headers['x-service-name'];
    const querySource = req.query?.sourceService || req.query?.service;
    const bodySource = req.body?.sourceService || req.body?.service;
    const detectedSource = headerSource || querySource || bodySource || null;

    if (detectedSource) {
      console.info(`[InputService] Received payload with sourceService hint: ${detectedSource}`);
      if (!req.body.sourceService) {
        req.body.sourceService = detectedSource;
      }
    }

    const dto = prepareCourseInputDTO(req.body);
    const result = await generateStructure(dto);
    return res.status(201).json({ status: 'accepted', course_id: result.courseId, structure: result.structureSummary });
  } catch (err) {
    if (!err.status) err.status = 400;
    return res.status(err.status).json({ message: err.message, error: true });
  }
};


