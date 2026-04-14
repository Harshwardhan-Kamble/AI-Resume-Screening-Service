import { z } from 'zod';

export const ScorecardSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.enum(['Strong Fit', 'Moderate Fit', 'Weak Fit']),
  missing_requirements: z.array(z.string()),
  justification: z.string().min(1),
});

export type Scorecard = z.infer<typeof ScorecardSchema>;
