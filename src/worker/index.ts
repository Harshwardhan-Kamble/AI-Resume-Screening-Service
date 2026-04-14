import { Worker, Job } from 'bullmq';
import { REDIS_CONNECTION, EVALUATION_QUEUE_NAME, EvaluationJobData } from '../queue/index.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../db/index.js';

export const startWorker = () => {
  const worker = new Worker<EvaluationJobData>(
    EVALUATION_QUEUE_NAME,
    async (job: Job<EvaluationJobData>) => {
      const { evaluationId } = job.data;
      
      logger.info(`Processing job ${job.id} for evaluation ${evaluationId}`);

      try {
        // 1. Update status to PROCESSING
        await prisma.evaluation.update({
          where: { id: evaluationId },
          data: { status: 'PROCESSING' },
        });

        // 2. Simulate work (Phase 4 placeholder)
        logger.debug(`Simulating LLM processing for ${evaluationId}...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // 3. Update status to COMPLETED (Mock result)
        await prisma.evaluation.update({
          where: { id: evaluationId },
          data: { 
            status: 'COMPLETED',
            completedAt: new Date(),
            score: 0, // Placeholder
            verdict: 'PENDING_REAL_PROCESSOR',
          },
        });

        logger.info(`Successfully processed evaluation ${evaluationId}`);
        return { success: true };
      } catch (error) {
        logger.error(`Error processing evaluation ${evaluationId}:`, error);
        
        // Let BullMQ handle retries. The status remains PROCESSING or we can set it back to PENDING.
        // If it's the last attempt, the 'failed' listener will set it to FAILED.
        throw error; 
      }
    },
    {
      connection: REDIS_CONNECTION,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
  });

  worker.on('failed', async (job, err) => {
    logger.error(`Job ${job?.id} failed: ${err.message}`);

    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
      logger.error(`Max retries reached for evaluation ${job.data.evaluationId}. Marking as FAILED.`);
      
      try {
        await prisma.evaluation.update({
          where: { id: job.data.evaluationId },
          data: { 
            status: 'FAILED',
            error: err.message,
          },
        });
      } catch (dbErr) {
        logger.error('Failed to update evaluation status to FAILED in DB:', dbErr);
      }
    }
  });

  logger.info('👷 Worker process started');
};
