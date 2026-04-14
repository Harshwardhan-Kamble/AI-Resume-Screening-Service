import { startServer } from './api/server.js';
import { startWorker } from './worker/index.js';
import { logger } from './utils/logger.js';

const startApp = async () => {
  try {
    // Start the API Server
    startServer();

    // Start the Worker process
    startWorker();

    logger.info('🚀 AI Resume Screening Service fully initialized');
  } catch (error) {
    logger.error('💥 Failed to start application:', error);
    process.exit(1);
  }
};

startApp();
