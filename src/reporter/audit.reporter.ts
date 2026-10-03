import fs from 'fs';
import path from 'path';
import { HealingReport } from '../schemas/healing.schema';
import { StepLogEntry } from './html.reporter';
import { Logger } from '../utils/logger';

export class AuditReporter {
  public generateAuditReport(
    outputDir: string,
    stepLogs: StepLogEntry[],
    healingReports: HealingReport[]
  ): void {
    const reportsDir = path.join(outputDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // 1. Generate generator.json (Generator Agent resolution log)
    const generatorPath = path.join(reportsDir, 'generator.json');
    const generatorPayload = {
      generatedAt: new Date().toISOString(),
      totalResolvedSteps: stepLogs.length,
      resolutions: stepLogs.map(log => ({
        stepId: log.step.stepId,
        intent: log.step.intent,
        targetDescription: log.step.targetDescription,
        resolvedLocator: log.locatorUsed,
        status: log.status,
        durationMs: log.durationMs
      }))
    };
    fs.writeFileSync(generatorPath, JSON.stringify(generatorPayload, null, 2), 'utf-8');
    Logger.info(`Generated Generator Agent report: ${generatorPath}`);

    // 2. Generate healer.json (Healer Agent self-healing report)
    const healerPath = path.join(reportsDir, 'healer.json');
    const auditPath = path.join(reportsDir, 'self_healing_audit.json');
    const healerPayload = {
      generatedAt: new Date().toISOString(),
      totalHealedCount: healingReports.length,
      reports: healingReports
    };
    fs.writeFileSync(healerPath, JSON.stringify(healerPayload, null, 2), 'utf-8');
    fs.writeFileSync(auditPath, JSON.stringify(healerPayload, null, 2), 'utf-8');
    Logger.info(`Generated Healer Agent report: ${healerPath}`);
  }
}
