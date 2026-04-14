import { Request, Response } from 'express';
import { prisma } from '../../db/index.js';
import { evaluationQueue } from '../../queue/index.js';
import { logger } from '../../utils/logger.js';

export const evaluateResume = async (req: Request, res: Response) => {
  try {
    const { job_description } = req.body;
    const file = req.file;

    // 1. Basic Validation
    if (!job_description) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    if (!file) {
      return res.status(400).json({ error: 'Resume PDF file is required' });
    }

    logger.info(`Received evaluation request for file: ${file.originalname}`);

    // 2. Store initial record in DB with status "PENDING"
    const evaluation = await prisma.evaluation.create({
      data: {
        jobDescription: job_description,
        resumePath: file.path,
        status: 'PENDING',
      },
    });

    // 3. Push job to queue
    await evaluationQueue.add('evaluate', {
      evaluationId: evaluation.id,
    });

    logger.info(`Enqueued evaluation job: ${evaluation.id}`);

    // 4. Return 202 Accepted
    return res.status(202).json({
      evaluation_id: evaluation.id,
      status: 'pending',
    });
  } catch (error) {
    logger.error('Failed to initiate evaluation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEvaluationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
    });

    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    // Handle PENDING/PROCESSING status
    if (evaluation.status === 'PENDING' || evaluation.status === 'PROCESSING') {
      return res.status(200).json({
        status: evaluation.status.toLowerCase(),
        score: null,
        verdict: null,
        missing_requirements: [],
        justification: 'The evaluation is still being processed by our AI.',
      });
    }

    // Return the full record for COMPLETED or FAILED
    return res.status(200).json({
      status: evaluation.status.toLowerCase(),
      score: evaluation.score,
      verdict: evaluation.verdict,
      missing_requirements: evaluation.missingRequirements || [],
      justification: evaluation.justification,
      error: evaluation.error, // Optional: helpful for debugging failed runs
    });
  } catch (error) {
    logger.error('Failed to fetch evaluation status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
