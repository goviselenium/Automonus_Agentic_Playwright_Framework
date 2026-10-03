import fs from 'fs';
import path from 'path';
import { HealingReport } from '../schemas/healing.schema';
import { Logger } from '../utils/logger';

export class AuditReporter {
  public generateAuditReport(outputDir: string, healingReports: HealingReport[]): string {
    const reportsDir = path.join(outputDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const auditPath = path.join(reportsDir, 'self_healing_audit.json');

    const payload = {
      generatedAt: new Date().toISOString(),
      totalHealedCount: healingReports.length,
      reports: healingReports
    };

    fs.writeFileSync(auditPath, JSON.stringify(payload, null, 2), 'utf-8');
    Logger.info(`Generated self-healing audit report: ${auditPath}`);
    return auditPath;
  }
}
