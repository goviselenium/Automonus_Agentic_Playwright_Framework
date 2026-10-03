import { z } from 'zod';

export const InteractiveElementSchema = z.object({
  id: z.string().optional(),
  tagName: z.string(),
  role: z.string().optional(),
  name: z.string().optional(),
  text: z.string().optional(),
  placeholder: z.string().optional(),
  testId: z.string().optional(),
  selectorHint: z.string(),
  isVisible: z.boolean(),
  isEnabled: z.boolean(),
  boundingBox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }).optional()
});

export const PageSnapshotSchema = z.object({
  url: z.string(),
  title: z.string(),
  ariaSnapshot: z.string(),
  interactiveElements: z.array(InteractiveElementSchema),
  timestamp: z.string()
});

export type InteractiveElement = z.infer<typeof InteractiveElementSchema>;
export type PageSnapshot = z.infer<typeof PageSnapshotSchema>;
