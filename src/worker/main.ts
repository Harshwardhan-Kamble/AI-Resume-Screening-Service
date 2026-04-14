import { startWorker } from './index.js';
import { logger } from '../utils/logger.js';

try {
  startWorker();
  logger.info('👷 Worker process started');
} catch (error) {
  logger.error('💥 Failed to start worker:', error);
  process.exit(1);
}
