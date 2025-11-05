import { prepareCourseInputDTO } from '../services/input.service.js';
import { generateStructure } from '../services/courseStructure.service.js';

export const acceptCourseInput = async (req, res, next) => {
  try {
    const dto = prepareCourseInputDTO(req.body);
    const result = await generateStructure(dto);
    return res.status(201).json({ status: 'accepted', course_id: result.courseId, structure: result.structureSummary });
  } catch (err) {
    if (!err.status) err.status = 400;
    return res.status(err.status).json({ message: err.message, error: true });
  }
};


