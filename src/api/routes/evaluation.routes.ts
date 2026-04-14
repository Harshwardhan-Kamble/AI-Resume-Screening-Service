import { Router } from 'express';
import { evaluateResume, getEvaluationStatus } from '../controllers/evaluation.controller.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// POST /evaluate - Upload PDF and trigger screening
router.post('/', upload.single('resume'), evaluateResume);

// GET /evaluate/:id - Poll for status and results
router.get('/:id', getEvaluationStatus);

export default router;
