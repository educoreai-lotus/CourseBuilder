import { Router } from 'express';
import { acceptCourseInput } from '../controllers/input.controller.js';

const router = Router();

router.post('/courses/input', acceptCourseInput);

export default router;


