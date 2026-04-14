import { Ollama } from 'ollama';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { Scorecard, ScorecardSchema } from '../schemas/scorecard.schema.js';

export class OllamaService {
  private ollama: Ollama;
  private promptTemplatePath: string;

  constructor() {
    this.ollama = new Ollama({ host: env.OLLAMA_BASE_URL });
    this.promptTemplatePath = path.resolve('prompts/resume_evaluation.txt');
  }

  /**
   * Extracts JSON content from a potentially chatty LLM response.
   */
  private extractJson(text: string): any {
    try {
      // Try direct parse first
      return JSON.parse(text);
    } catch {
      // Look for code blocks
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match && match[1]) {
        return JSON.parse(match[1].trim());
      }
      // Look for any { ... } block
      const braceMatch = text.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        return JSON.parse(braceMatch[0].trim());
      }
      throw new Error('Could not find a valid JSON block in the AI response');
    }
  }

  /**
   * Evaluates a resume using a local LLM via Ollama.
   */
  async evaluate(resumeText: string, jobDescription: string): Promise<Scorecard> {
    try {
      logger.debug(`Calling local Ollama (${env.OLLAMA_MODEL}) at ${env.OLLAMA_BASE_URL}...`);
      
      const template = await fs.readFile(this.promptTemplatePath, 'utf8');
      const prompt = template
        .replace('{{JOB_DESCRIPTION}}', jobDescription)
        .replace('{{RESUME_TEXT}}', resumeText);

      const response = await this.ollama.chat({
        model: env.OLLAMA_MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: {
          temperature: 0.0, // Force deterministic factual output
          num_ctx: 2048, 
        },
      });

      const text = response.message.content;
      if (!text) {
        throw new Error('Ollama returned an empty response');
      }

      logger.debug('Successfully received response from Ollama. Extracting and validating JSON...');
      
      const rawJson = this.extractJson(text);
      const scorecard = ScorecardSchema.parse(rawJson);

      logger.info('✅ Successfully generated scorecard via local LLM');
      return scorecard;
    } catch (error) {
      logger.error('Ollama Service Error:', error);
      throw error;
    }
  }
}

export const ollamaService = new OllamaService();
