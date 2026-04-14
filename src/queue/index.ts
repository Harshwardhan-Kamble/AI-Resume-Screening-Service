import { Queue } from 'bullmq';
import { env } from '../config/index.js';

export interface EvaluationJobData {
  evaluationId: string;
}

export const REDIS_CONNECTION = {
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT, 10),
};

export const EVALUATION_QUEUE_NAME = 'evaluation-queue';

export const evaluationQueue = new Queue<EvaluationJobData>(EVALUATION_QUEUE_NAME, {
  connection: REDIS_CONNECTION,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 10s, 20s
    },
    removeOnComplete: true,
    removeOnFail: {
      age: 24 * 3600, // keep failed jobs for 24h
    },
  },
});
