import { Worker, Job } from 'bullmq';
import { REDIS_CONNECTION, EVALUATION_QUEUE_NAME, EvaluationJobData } from '../queue/index.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../db/index.js';
import { extractTextFromPdf } from '../services/pdf.service.js';
import { geminiService } from '../services/gemini.service.js';
import { preprocessingService } from '../services/preprocessing.service.js';

/**
 * Worker to process resume evaluations using BERT (refinement) and Gemini (evaluation).
 */
export const startWorker = () => {
  const worker = new Worker<EvaluationJobData>(
    EVALUATION_QUEUE_NAME,
    async (job: Job<EvaluationJobData>) => {
      const { evaluationId } = job.data;
      
      logger.info(`🚀 Starting job ${job.id} for evaluation ${evaluationId}`);

      try {
        // 1. Fetch record and update status to PROCESSING
        const evaluation = await prisma.evaluation.update({
          where: { id: evaluationId },
          data: { status: 'PROCESSING' },
        });

        // 2. Extract raw text from PDF
        logger.info(`📄 Extracting raw text from ${evaluation.resumePath}...`);
        const rawResumeText = await extractTextFromPdf(evaluation.resumePath);

        // 3. NLP Preprocessing (BERT Refinement)
        // We refine BOTH JD and Resume to give Gemini the cleanest possible input
        logger.info('🧠 Running BERT preprocessing to refine Resume and JD signal...');
        const refinedResume = await preprocessingService.refineText(rawResumeText, 'resume');
        const refinedJD = await preprocessingService.refineText(evaluation.jobDescription, 'jd');

        // Store refined resume text for reference
        await prisma.evaluation.update({
          where: { id: evaluationId },
          data: { resumeText: refinedResume },
        });

        // 4. Gemini Evaluation
        logger.info('📡 Calling Gemini 1.5 Flash for high-precision analysis...');
        const scorecard = await geminiService.evaluate(refinedResume, refinedJD);

        // 5. Update status to COMPLETED with actual results
        await prisma.evaluation.update({
          where: { id: evaluationId },
          data: { 
            status: 'COMPLETED',
            completedAt: new Date(),
            score: scorecard.score,
            verdict: scorecard.verdict,
            justification: scorecard.justification,
            missingRequirements: scorecard.missing_requirements,
          },
        });

        logger.info(`✅ Successfully processed evaluation ${evaluationId} via Gemini.`);
        return { success: true };
      } catch (error) {
        logger.error(`❌ Error processing evaluation ${evaluationId}:`, error);
        throw error; 
      }
    },
    {
      connection: REDIS_CONNECTION,
      concurrency: 5, // Gemini API can handle much higher concurrency than local models
    }
  );

  worker.on('failed', async (job, err) => {
    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
      await prisma.evaluation.update({
        where: { id: job.data.evaluationId },
        data: { 
          status: 'FAILED',
          error: err.message,
        },
      });
    }
  });

  logger.info('👷 Worker process is listening for Gemini evaluation jobs...');
};
