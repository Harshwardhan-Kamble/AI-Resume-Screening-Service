import fs from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { Scorecard, ScorecardSchema } from '../schemas/scorecard.schema.js';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private promptTemplatePath: string;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: env.GEMINI_MODEL,
    });
    this.promptTemplatePath = path.resolve('prompts/resume_evaluation.txt');
  }

  /**
   * Evaluates a resume against a job description using Gemini AI.
   */
  async evaluate(resumeText: string, jobDescription: string): Promise<Scorecard> {
    try {
      logger.debug('Loading prompt template...');
      const template = await fs.readFile(this.promptTemplatePath, 'utf8');

      const prompt = template
        .replace('{{JOB_DESCRIPTION}}', jobDescription)
        .replace('{{RESUME_TEXT}}', resumeText);

      logger.info('Calling Gemini API for evaluation...');

      // Implement timeout handling (30s)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const result = await this.model.generateContent(prompt);
        clearTimeout(timeoutId);

        const response = await result.response;
        let text = response.text();

        if (!text) {
          throw new Error('Gemini returned an empty response');
        }

        // Robust JSON extraction (handles markdown code fences)
        logger.debug('Cleaning and parsing AI response...');
        if (text.includes('```json')) {
          text = text.split('```json')[1].split('```')[0].trim();
        } else if (text.includes('```')) {
          text = text.split('```')[1].split('```')[0].trim();
        } else {
          text = text.trim();
        }

        // Parse and validate the response
        const rawJson = JSON.parse(text);
        const parsedData = ScorecardSchema.parse(rawJson);

        logger.info('Successfully generated and validated scorecard');
        return parsedData;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Gemini API request timed out after 30 seconds');
        }
        throw error;
      }
    } catch (error: any) {
      logger.error('Gemini Service Error:', error);
      // Re-throw to let the worker handle retries (BullMQ)
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
