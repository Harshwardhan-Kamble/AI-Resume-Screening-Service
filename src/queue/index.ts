import { Queue } from 'bullmq';
import { env } from '../config/index.js';

export const REDIS_CONNECTION = {
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT, 10),
};

export const EVALUATION_QUEUE_NAME = 'evaluation-queue';

export const evaluationQueue = new Queue(EVALUATION_QUEUE_NAME, {
  connection: REDIS_CONNECTION,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
  },
});
