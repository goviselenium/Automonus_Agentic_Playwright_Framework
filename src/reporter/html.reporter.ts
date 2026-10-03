import fs from 'fs';
import path from 'path';
import { TestPlan, AtomicStep } from '../schemas/plan.schema';
import { HealingReport } from '../schemas/healing.schema';
import { Logger } from '../utils/logger';

export interface StepLogEntry {
  step: AtomicStep;
  locatorUsed: string;
  status: 'PASS' | 'FAIL' | 'HEALED';
  durationMs: number;
  error?: string;
  healingReport?: HealingReport;
}

export class HTMLReporter {
  public generateReport(
    outputDir: string,
    plan: TestPlan,
    stepLogs: StepLogEntry[],
    healingReports: HealingReport[],
    browserInfo?: { type: string; headless: boolean }
  ): string {
    const reportsDir = path.join(outputDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, 'execution_report.html');

    const totalSteps = stepLogs.length;
    const passedSteps = stepLogs.filter(s => s.status === 'PASS').length;
    const healedSteps = stepLogs.filter(s => s.status === 'HEALED').length;
    const failedSteps = stepLogs.filter(s => s.status === 'FAIL').length;
    const browserName = browserInfo?.type || 'chromium';
    const executionMode = browserInfo?.headless !== false ? 'Headless' : 'Headed';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Execution Report - Autonomous Agentic Playwright Framework</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f4f6f8; color: #333; margin: 0; padding: 20px; }
    .container { max-width: 1100px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); padding: 30px; }
    h1 { margin-top: 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    .metrics { display: flex; gap: 20px; margin-bottom: 30px; }
    .card { flex: 1; padding: 20px; border-radius: 6px; color: #fff; text-align: center; }
    .card.total { background: #3b82f6; }
    .card.pass { background: #10b981; }
    .card.healed { background: #f59e0b; }
    .card.fail { background: #ef4444; }
    .card h2 { margin: 0; font-size: 32px; }
    .card p { margin: 5px 0 0 0; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 600; color: #64748b; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .badge.PASS { background: #d1fae5; color: #065f46; }
    .badge.HEALED { background: #fef3c7; color: #92400e; }
    .badge.FAIL { background: #fee2e2; color: #991b1b; }
    .badge.HEADED { background: #ede9fe; color: #6d28d9; }
    .badge.HEADLESS { background: #e2e8f0; color: #475569; }
    .code { font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
    .healing-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 15px; margin-top: 10px; font-size: 13px; }
    .meta-bar { background: #f8fafc; padding: 12px 15px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; border: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Autonomous Execution Report</h1>
    <div class="meta-bar">
      <strong>Scenario:</strong> ${plan.scenarioTitle} &nbsp;|&nbsp; 
      <strong>Base URL:</strong> ${plan.baseUrl} &nbsp;|&nbsp; 
      <strong>Browser:</strong> <span class="code">${browserName.toUpperCase()}</span> &nbsp;|&nbsp; 
      <strong>Mode:</strong> <span class="badge ${executionMode.toUpperCase()}">${executionMode.toUpperCase()}</span>
    </div>
    
    <div class="metrics">
      <div class="card total">
        <h2>${totalSteps}</h2>
        <p>Total Steps</p>
      </div>
      <div class="card pass">
        <h2>${passedSteps}</h2>
        <p>Passed</p>
      </div>
      <div class="card healed">
        <h2>${healedSteps}</h2>
        <p>Self-Healed</p>
      </div>
      <div class="card fail">
        <h2>${failedSteps}</h2>
        <p>Failed</p>
      </div>
    </div>

    <h2>Step Execution Graph</h2>
    <table>
      <thead>
        <tr>
          <th>Step ID</th>
          <th>Intent</th>
          <th>Target Description</th>
          <th>Locator Used</th>
          <th>Status</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        ${stepLogs.map(log => `
          <tr>
            <td>${log.step.stepId}</td>
            <td><span class="code">${log.step.intent}</span></td>
            <td>${log.step.targetDescription}</td>
            <td><span class="code">${log.locatorUsed}</span></td>
            <td><span class="badge ${log.status}">${log.status}</span></td>
            <td>${log.durationMs}ms</td>
          </tr>
          ${log.healingReport ? `
            <tr>
              <td colspan="6">
                <div class="healing-box">
                  <strong>⚠️ Self-Healing Action Taken:</strong><br/>
                  Original Locator: <code>${log.healingReport.originalLocator}</code> → Healed Locator: <code>${log.healingReport.healedLocator}</code><br/>
                  Confidence Score: ${(log.healingReport.confidenceScore * 100).toFixed(1)}% | Status: ${log.healingReport.healingStatus}<br/>
                  <em>${log.healingReport.domDiffSummary}</em>
                </div>
              </td>
            </tr>
          ` : ''}
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

    fs.writeFileSync(reportPath, htmlContent, 'utf-8');
    Logger.info(`Generated HTML execution report: ${reportPath}`);
    return reportPath;
  }
}
