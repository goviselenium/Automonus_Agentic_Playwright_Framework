import { z } from 'zod';

export const HealingReportSchema = z.object({
  timestamp: z.string(),
  stepId: z.string(),
  originalLocator: z.string(),
  failureErrorType: z.string(),
  healedLocator: z.string(),
  confidenceScore: z.number().min(0).max(1),
  healingStatus: z.enum(['SUCCESS', 'FAILED_CANNOT_REPAIR', 'FAILED_GENUINE_BUG']),
  domDiffSummary: z.string()
});

export type HealingReport = z.infer<typeof HealingReportSchema>;
