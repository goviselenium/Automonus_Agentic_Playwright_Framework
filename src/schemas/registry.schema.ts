import { z } from 'zod';

export const RegistryEntrySchema = z.object({
  targetKey: z.string().describe('Unique hashed target description key'),
  lastKnownLocator: z.string().describe('Primary Playwright selector'),
  fallbackLocators: z.array(z.string()).default([]),
  lastVerified: z.string(),
  successfulRuns: z.number().default(1)
});

export const LocatorRegistrySchema = z.record(z.string(), RegistryEntrySchema);

export type RegistryEntry = z.infer<typeof RegistryEntrySchema>;
export type LocatorRegistry = z.infer<typeof LocatorRegistrySchema>;
