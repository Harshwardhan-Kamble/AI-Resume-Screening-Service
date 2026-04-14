import fs from 'fs/promises';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import { logger } from '../utils/logger.js';

export const extractTextFromPdf = async (filePath: string): Promise<string> => {
  try {
    logger.debug(`Extracting text from PDF: ${filePath}`);
    
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    
    if (!data || !data.text) {
      throw new Error('PDF extraction returned empty text');
    }

    // Clean up basic whitespace
    const cleanedText = data.text.replace(/\s+/g, ' ').trim();
    
    logger.info(`Successfully extracted ${cleanedText.length} characters from ${filePath}`);
    return cleanedText;
  } catch (error) {
    logger.error(`Failed to extract text from PDF at ${filePath}:`, error);
    throw new Error(`PDF Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
