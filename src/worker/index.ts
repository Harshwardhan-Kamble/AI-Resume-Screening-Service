import { Worker, Job } from 'bullmq';
import { REDIS_CONNECTION, EVALUATION_QUEUE_NAME } from '../queue/index.js';
import { logger } from '../utils/logger.js';

export const startWorker = () => {
  const worker = new Worker(
    EVALUATION_QUEUE_NAME,
    async (job: Job) => {
      logger.info(`Processing job ${job.id} for evaluation ${job.data.evaluationId}`);
      
      // TODO: Implement actual LLM processing logic in Phase 4
      return { success: true };
    },
    {
      connection: REDIS_CONNECTION,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed with error: ${err.message}`);
  });

  logger.info('👷 Worker process started');
};
