import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import { frameworkConfig } from '../../config/framework.config';
import { Logger } from '../utils/logger';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  public async initialize(options?: {
    browserType?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
    slowMo?: number;
  }): Promise<Page> {
    const selectedBrowser = options?.browserType || frameworkConfig.browser;
    const headless = options?.headless !== undefined ? options.headless : frameworkConfig.headless;
    const slowMo = options?.slowMo !== undefined ? options.slowMo : frameworkConfig.slowMo;

    Logger.info(`Initializing ${selectedBrowser} browser (Headless: ${headless}, SlowMo: ${slowMo}ms)...`);

    const launchOptions = {
      headless,
      slowMo
    };

    switch (selectedBrowser) {
      case 'firefox':
        this.browser = await firefox.launch(launchOptions);
        break;
      case 'webkit':
        this.browser = await webkit.launch(launchOptions);
        break;
      case 'chromium':
      default:
        this.browser = await chromium.launch(launchOptions);
        break;
    }

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: './artifacts/videos/' }
    });

    await this.context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(frameworkConfig.defaultTimeout);

    return this.page;
  }

  public getPage(): Page {
    if (!this.page) {
      throw new Error('Browser page has not been initialized. Call initialize() first.');
    }
    return this.page;
  }

  public getContext(): BrowserContext {
    if (!this.context) {
      throw new Error('Browser context has not been initialized. Call initialize() first.');
    }
    return this.context;
  }

  public async stopTracing(tracePath: string): Promise<void> {
    if (this.context) {
      await this.context.tracing.stop({ path: tracePath });
      Logger.info(`Saved execution trace to: ${tracePath}`);
    }
  }

  public async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.page = null;
    Logger.info('Browser context cleanly closed.');
  }
}
