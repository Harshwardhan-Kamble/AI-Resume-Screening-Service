import { describe, it, expect, vi, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createApp } from '../src/api/server.js';
import { prisma } from '../src/db/index.js';
import { geminiService } from '../src/services/gemini.service.js';
import { preprocessingService } from '../src/services/preprocessing.service.js';
import { evaluationQueue } from '../src/queue/index.js';
import * as pdfService from '../src/services/pdf.service.js';

// Mock Queue
vi.mock('../src/queue/index.js', () => ({
  evaluationQueue: {
    add: vi.fn().mockResolvedValue({ id: 'test-job-id' })
  },
  REDIS_CONNECTION: {},
  EVALUATION_QUEUE_NAME: 'test-queue'
}));

// Mock the AI services to prevent real API calls and speed up tests
vi.mock('../src/services/gemini.service.js', () => ({
  geminiService: {
    evaluate: vi.fn().mockResolvedValue({
      score: 85,
      verdict: 'Strong Fit',
      missing_requirements: ['Experience with AWS'],
      justification: 'Highly qualified candidate with strong backend experience.'
    })
  }
}));

vi.mock('../src/services/preprocessing.service.js', () => ({
  preprocessingService: {
    refineText: vi.fn().mockResolvedValue('Refined Text Content')
  }
}));

vi.mock('../src/services/pdf.service.js', () => ({
  extractTextFromPdf: vi.fn().mockResolvedValue('Raw Resume Text Content')
}));

describe('Resume Evaluation Integration Test', () => {
  const app = createApp();
  let evaluationId: string;
  const fixturePath = path.resolve(__dirname, 'fixtures/test-resume.pdf');

  // Cleanup test data after tests
  afterAll(async () => {
    if (evaluationId) {
      await prisma.evaluation.deleteMany({
        where: { id: evaluationId }
      });
    }
    await prisma.$disconnect();
  });

  it('1. Should upload a resume and return an evaluation_id', async () => {
    const response = await request(app)
      .post('/evaluate')
      .attach('resume', fixturePath)
      .field('job_description', 'Looking for a Node.js developer with 5 years experience.');

    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty('evaluation_id');
    expect(response.body.status).toBe('pending');
    
    evaluationId = response.body.evaluation_id;
  });

  it('2. Should verify the record exists in the database as PENDING', async () => {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId }
    });

    expect(evaluation).toBeDefined();
    expect(evaluation?.status).toBe('PENDING');
  });

  it('3. Should process the job programmatically (Simulating Worker)', async () => {
    // In a real scenario, the worker picks this up via BullMQ.
    // For integration testing the logic, we run the processing steps directly.
    
    // 1. Extraction (PDF)
    const rawText = await pdfService.extractTextFromPdf('dummy-path');
    
    // 2. Refinement (BERT)
    const refinedResume = await preprocessingService.refineText(rawText, 'resume');
    const refinedJD = await preprocessingService.refineText('JD Text', 'jd');
    
    // 3. Evaluation (Gemini)
    const scorecard = await geminiService.evaluate(refinedResume, refinedJD);

    // 4. Update DB
    await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        status: 'COMPLETED',
        score: scorecard.score,
        verdict: scorecard.verdict,
        justification: scorecard.justification,
        missingRequirements: scorecard.missing_requirements,
        completedAt: new Date()
      }
    });

    const updated = await prisma.evaluation.findUnique({ where: { id: evaluationId } });
    expect(updated?.status).toBe('COMPLETED');
    expect(updated?.score).toBe(85);
  });

  it('4. Should fetch the correct result structure via API', async () => {
    // The route is GET /evaluate/:id in the router
    const response = await request(app).get(`/evaluate/${evaluationId}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('completed');
    expect(response.body.score).toBe(85);
    expect(response.body.verdict).toBe('Strong Fit');
    expect(response.body.missing_requirements).toContain('Experience with AWS');
    expect(response.body.justification).toBeDefined();
  });
});
