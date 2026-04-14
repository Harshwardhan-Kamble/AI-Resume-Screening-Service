import { startServer } from './server.js';
import { logger } from '../utils/logger.js';

try {
  startServer();
  logger.info('🚀 API Server process started');
} catch (error) {
  logger.error('💥 Failed to start API server:', error);
  process.exit(1);
}
