import express from 'express';
import cors from 'cors';
import { env } from '../config/index.js';
import { logger } from '../utils/logger.js';

import evaluationRoutes from './routes/evaluation.routes.js';

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/evaluate', evaluationRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Base API route
  app.get('/', (req, res) => {
    res.json({ message: 'AI Resume Screening API' });
  });

  return app;
};

export const startServer = () => {
  const app = createApp();
  const port = env.PORT;

  app.listen(port, () => {
    logger.info(`🚀 API Server running on port ${port}`);
  });
};
