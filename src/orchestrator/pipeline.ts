import fs from 'fs';
import path from 'path';
import { BrowserManager } from '../engine/browser.manager';
import { DOMExtractor } from '../extractor/dom.extractor';
import { ActionDispatcher } from '../engine/action.dispatcher';
import { FailureInterceptor } from '../engine/failure.interceptor';
import { PlannerAgent } from '../agents/planner.agent';
import { GeneratorAgent } from '../agents/generator.agent';
import { HealerAgent } from '../agents/healer.agent';
import { LocatorRegistryManager } from '../registry/locator.registry';
import { RequirementIngestor } from '../ingestor/requirement.ingestor';
import { HTMLReporter, StepLogEntry } from '../reporter/html.reporter';
import { AuditReporter } from '../reporter/audit.reporter';
import { HealingReport } from '../schemas/healing.schema';
import { frameworkConfig } from '../../config/framework.config';
import { Logger } from '../utils/logger';

export interface RunOptions {
  specPath: string;
  baseUrl?: string;
  browser?: 'chromium' | 'firefox' | 'webkit';
  headed?: boolean;
  slowMo?: number;
  enableSelfHeal?: boolean;
  planOnly?: boolean;
}

export class ExecutionPipeline {
  private browserManager = new BrowserManager();
  private domExtractor = new DOMExtractor();
  private actionDispatcher = new ActionDispatcher();
  private failureInterceptor = new FailureInterceptor();
  private plannerAgent = new PlannerAgent();
  private generatorAgent = new GeneratorAgent();
  private healerAgent = new HealerAgent();
  private registryManager = new LocatorRegistryManager();
  private ingestor = new RequirementIngestor();
  private htmlReporter = new HTMLReporter();
  private auditReporter = new AuditReporter();

  public async runScenario(options: RunOptions): Promise<boolean> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.resolve(process.cwd(), `artifacts/${timestamp}`);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    Logger.info(`Starting Pipeline execution for spec: ${options.specPath}`);

    // 1. Ingest Scenario Requirement
    if (!fs.existsSync(options.specPath)) {
      throw new Error(`Scenario file not found at path: ${options.specPath}`);
    }
    
    const ingested = this.ingestor.ingest(options.specPath);
    const targetBaseUrl = options.baseUrl || frameworkConfig.baseUrl;

    // 2. Synthesize Atomic Test Plan via Planner Agent
    const plan = await this.plannerAgent.plan(ingested.content, targetBaseUrl);
    if (ingested.scenarioTitle) {
      plan.scenarioTitle = ingested.scenarioTitle;
    }

    Logger.info(`Generated Test Plan "${plan.scenarioTitle}" with ${plan.steps.length} atomic steps for Base URL: ${targetBaseUrl}`);

    // Save generated Plan JSON artifact
    const reportsDir = path.join(outputDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(reportsDir, 'plan.json'), JSON.stringify(plan, null, 2), 'utf-8');

    // If --plan-only option was requested, display plan and stop before execution
    if (options.planOnly) {
      console.log('\n=============================================================');
      console.log('            PLANNER AGENT ATOMIC STEP GRAPH                  ');
      console.log('=============================================================');
      console.log(`Plan ID: ${plan.planId}`);
      console.log(`Scenario: ${plan.scenarioTitle}`);
      console.log(`Target Base URL: ${plan.baseUrl}`);
      console.log('-------------------------------------------------------------');
      plan.steps.forEach((step, idx) => {
        console.log(`[Step ${idx + 1}] ${step.stepId} | ${step.intent}`);
        console.log(`         Target: ${step.targetDescription}`);
        if (step.inputValue) console.log(`         Input:  ${step.inputValue}`);
        if (step.expectedValue) console.log(`         Expect: ${step.expectedValue}`);
      });
      console.log('=============================================================\n');
      Logger.info(`Plan generated and saved to ${path.join(reportsDir, 'plan.json')}. Stopping execution for user confirmation (--plan-only).`);
      return true;
    }

    // 3. Initialize Browser for live execution
    const initialPage = await this.browserManager.initialize({
      browserType: options.browser,
      headless: options.headed ? false : frameworkConfig.headless,
      slowMo: options.slowMo
    });

    const stepLogs: StepLogEntry[] = [];
    const healingReports: HealingReport[] = [];
    let overallSuccess = true;

    try {
      // 4. Step Execution Loop
      for (const step of plan.steps) {
        const stepStartTime = Date.now();

        // Dynamically resolve active browser tab page (handles new tab popups like Amazon product pages)
        const pages = this.browserManager.getContext().pages();
        const activePage = pages.length > 0 ? pages[pages.length - 1] : initialPage;
        try {
          await activePage.bringToFront();
        } catch (e) {
          // ignore
        }

        const currentDomain = activePage.url() !== 'about:blank' ? activePage.url() : targetBaseUrl;
        Logger.info(`---> Executing Step [${step.stepId}]: ${step.intent} (${step.targetDescription}) on Tab [${pages.length}] (${currentDomain})`);

        let locatorToUse: string | null = null;
        if (step.intent === 'ACTION_NAVIGATE') {
          locatorToUse = step.inputValue || targetBaseUrl;
        } else {
          locatorToUse = this.registryManager.getCachedLocator(currentDomain, step.targetDescription);
        }

        if (!locatorToUse) {
          const snapshot = await this.domExtractor.extractPageState(activePage);
          locatorToUse = await this.generatorAgent.resolveLocator(step, snapshot);
          this.registryManager.registerLocator(currentDomain, step.targetDescription, locatorToUse);
        }

        try {
          await this.actionDispatcher.dispatch(activePage, step, locatorToUse);
          const duration = Date.now() - stepStartTime;
          stepLogs.push({
            step,
            locatorUsed: locatorToUse,
            status: 'PASS',
            durationMs: duration
          });
        } catch (execErr: any) {
          Logger.warn(`Step [${step.stepId}] initial execution failed: ${execErr.message}`);

          const context = await this.failureInterceptor.captureContext(
            activePage,
            step,
            locatorToUse,
            execErr,
            outputDir
          );

          if (options.enableSelfHeal !== false) {
            const { healedLocator, confidence, report } = await this.healerAgent.diagnoseAndRepair(context);
            healingReports.push(report);

            if (report.healingStatus === 'SUCCESS' && confidence >= 0.8) {
              Logger.info(`Attempting dynamic re-execution with healed locator: "${healedLocator}"`);
              try {
                await this.actionDispatcher.dispatch(activePage, step, healedLocator);
                const duration = Date.now() - stepStartTime;
                this.registryManager.registerLocator(currentDomain, step.targetDescription, healedLocator);

                stepLogs.push({
                  step,
                  locatorUsed: healedLocator,
                  status: 'HEALED',
                  durationMs: duration,
                  healingReport: report
                });
                Logger.info(`Step [${step.stepId}] successfully HEALED and resumed!`);
                continue;
              } catch (reExecErr: any) {
                Logger.error(`Re-execution with healed locator failed: ${reExecErr.message}`);
              }
            }
          }

          const duration = Date.now() - stepStartTime;
          stepLogs.push({
            step,
            locatorUsed: locatorToUse,
            status: 'FAIL',
            durationMs: duration,
            error: execErr.message
          });

          if (step.criticality === 'CRITICAL') {
            Logger.error(`Critical step [${step.stepId}] failed. Aborting scenario execution.`);
            overallSuccess = false;
            break;
          }
        }
      }
    } finally {
      // 5. Teardown & Stop Tracing
      const traceZipPath = path.join(outputDir, 'traces', 'trace.zip');
      const tracesDir = path.dirname(traceZipPath);
      if (!fs.existsSync(tracesDir)) {
        fs.mkdirSync(tracesDir, { recursive: true });
      }
      await this.browserManager.stopTracing(traceZipPath);
      await this.browserManager.close();

      // 6. Generate Reports
      this.htmlReporter.generateReport(outputDir, plan, stepLogs, healingReports, {
        type: options.browser || frameworkConfig.browser,
        headless: options.headed ? false : frameworkConfig.headless
      });
      this.auditReporter.generateAuditReport(outputDir, healingReports);
    }

    return overallSuccess;
  }
}
