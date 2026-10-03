import { z } from 'zod';

export const StepIntentSchema = z.enum([
  'ACTION_NAVIGATE',
  'ACTION_CLICK',
  'ACTION_TYPE',
  'ACTION_SELECT',
  'ACTION_HOVER',
  'ACTION_PRESS_KEY',
  'ASSERT_VISIBLE',
  'ASSERT_TEXT_EQUALS',
  'ASSERT_URL_CONTAINS'
]);

export const AtomicStepSchema = z.object({
  stepId: z.string().describe('Unique step identifier, e.g., step_001'),
  intent: StepIntentSchema.describe('Action or assertion intent'),
  targetDescription: z.string().describe('Human-readable target element description'),
  inputValue: z.string().nullable().optional().transform(v => v === null ? undefined : v).describe('Input value for typing or selecting'),
  expectedValue: z.string().nullable().optional().transform(v => v === null ? undefined : v).describe('Expected text or URL value for assertion'),
  criticality: z.enum(['CRITICAL', 'OPTIONAL']).default('CRITICAL'),
  timeoutMs: z.number().default(30000)
});

export const TestPlanSchema = z.object({
  planId: z.string(),
  scenarioTitle: z.string(),
  baseUrl: z.string().url(),
  prerequisites: z.array(z.string()).default([]),
  steps: z.array(AtomicStepSchema),
  cleanup: z.array(z.string()).default([])
});

export type StepIntent = z.infer<typeof StepIntentSchema>;
export type AtomicStep = z.infer<typeof AtomicStepSchema>;
export type TestPlan = z.infer<typeof TestPlanSchema>;
