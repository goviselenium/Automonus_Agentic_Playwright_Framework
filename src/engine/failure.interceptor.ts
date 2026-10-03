import { Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { AtomicStep } from '../schemas/plan.schema';
import { DOMExtractor } from '../extractor/dom.extractor';
import { Logger } from '../utils/logger';

export interface FailureContext {
  step: AtomicStep;
  failedLocator: string;
  errorName: string;
  errorMessage: string;
  stackTrace: string;
  screenshotPath: string;
  domSnapshot: string;
  timestamp: string;
}

export class FailureInterceptor {
  private domExtractor = new DOMExtractor();

  public async captureContext(
    page: Page,
    step: AtomicStep,
    failedLocator: string,
    error: Error,
    outputDir: string
  ): Promise<FailureContext> {
    Logger.warn(`Intercepting failure for step [${step.stepId}] target "${failedLocator}"`);

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const screenshotsDir = path.join(outputDir, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const screenshotPath = path.join(screenshotsDir, `failure_${step.stepId}_${timestamp}.png`);
    
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch (scErr) {
      Logger.error(`Failed to capture failure screenshot: ${scErr}`);
    }

    let domSnapshot = '';
    try {
      const pageSnapshot = await this.domExtractor.extractPageState(page);
      domSnapshot = pageSnapshot.ariaSnapshot;
    } catch (domErr) {
      Logger.error(`Failed to extract DOM snapshot on failure: ${domErr}`);
    }

    return {
      step,
      failedLocator,
      errorName: error.name || 'Error',
      errorMessage: error.message || String(error),
      stackTrace: error.stack || '',
      screenshotPath,
      domSnapshot,
      timestamp
    };
  }
}
