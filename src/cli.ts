import { Command } from 'commander';
import path from 'path';
import { ExecutionPipeline } from './orchestrator/pipeline';
import { Logger } from './utils/logger';

const program = new Command();

program
  .name('playwright-agent')
  .description('Autonomous Agentic Playwright Test Automation Framework CLI')
  .version('1.0.0');

program
  .command('run')
  .description('Execute an autonomous test scenario')
  .requiredOption('-s, --spec <path>', 'Path to scenario file (.md, .txt, .feature, .json)')
  .option('-u, --url <url>', 'Target base URL override')
  .option('-b, --browser <type>', 'Browser engine (chromium, firefox, webkit)', 'chromium')
  .option('-h, --headed', 'Run in headed browser mode', false)
  .option('--slowMo <ms>', 'Delay between actions in milliseconds', '0')
  .option('--no-heal', 'Disable dynamic self-healing agent')
  .option('--plan-only', 'Run ONLY the Planner Agent to synthesize the step graph without executing browser actions', false)
  .action(async (options) => {
    try {
      const pipeline = new ExecutionPipeline();
      const success = await pipeline.runScenario({
        specPath: path.resolve(process.cwd(), options.spec),
        baseUrl: options.url,
        browser: options.browser as 'chromium' | 'firefox' | 'webkit',
        headed: options.headed,
        slowMo: parseInt(options.slowMo, 10),
        enableSelfHeal: options.heal !== false,
        planOnly: options.planOnly === true
      });

      if (success) {
        if (options.planOnly) {
          Logger.info('Planner Agent completed successfully! Waiting for user confirmation before browser execution.');
        } else {
          Logger.info('Scenario execution completed successfully! [PASS]');
        }
        process.exit(0);
      } else {
        Logger.error('Scenario execution failed. [FAIL]');
        process.exit(1);
      }
    } catch (err: any) {
      Logger.error(`Fatal Execution Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
