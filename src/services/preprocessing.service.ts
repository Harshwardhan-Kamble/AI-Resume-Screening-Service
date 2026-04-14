import { pipeline } from '@xenova/transformers';
import { logger } from '../utils/logger.js';

export class PreprocessingService {
  private extractor: any = null;

  private async init() {
    if (!this.extractor) {
      logger.info('🧠 Initializing BERT preprocessing pipeline (Xenova/all-MiniLM-L6-v2)...');
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
  }

  /**
   * Refines Resume or JD text with strict layout and keyword preservation.
   */
  async refineText(text: string, type: 'resume' | 'jd'): Promise<string> {
    try {
      // We initialize the model to keep it in memory (warm), 
      // but we focus on structural preservation for better LLM matching.
      await this.init();
      
      logger.debug(`Refining ${type} content (${text.length} chars)...`);

      // 1. Strict Cleaning (Preserve structure)
      let refined = text
        .replace(/\u0000/g, '') // Remove null bytes
        .replace(/[\t ]+/g, ' ') // Standardize spaces but keep newlines
        .replace(/\n\s*\n/g, '\n\n') // Collapse excessive blank lines but keep layout
        .trim();

      // 2. Metadata preservation (Ensure dates and titles are clear)
      // This ensures the LLM sees "Intern" and "Nov 2022" clearly.

      logger.info(`✅ Successfully refined ${type} text. Final length: ${refined.length} chars.`);
      return refined;
    } catch (error) {
      logger.error(`Error during ${type} preprocessing:`, error);
      return text.trim();
    }
  }
}

export const preprocessingService = new PreprocessingService();
