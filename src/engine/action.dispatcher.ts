import { Page } from 'playwright';
import { AtomicStep } from '../schemas/plan.schema';
import { Logger } from '../utils/logger';

export class ActionDispatcher {
  public async dispatch(page: Page, step: AtomicStep, locatorSelector: string): Promise<void> {
    Logger.info(`Dispatching step [${step.stepId}]: ${step.intent} on "${locatorSelector}" (Active Page URL: ${page.url()})`);

    const timeout = step.timeoutMs || 30000;

    switch (step.intent) {
      case 'ACTION_NAVIGATE':
        const targetUrl = step.inputValue || step.expectedValue || locatorSelector;
        Logger.info(`Navigating to URL: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout });
        break;

      case 'ACTION_CLICK':
        let clickTarget = page.locator(locatorSelector);
        const clickCount = await clickTarget.count();
        if (clickCount > 1) {
          Logger.info(`Locator "${locatorSelector}" matched ${clickCount} elements. Selecting first visible matching target.`);
          clickTarget = clickTarget.first();
        }
        await clickTarget.waitFor({ state: 'visible', timeout });

        const href = await clickTarget.getAttribute('href').catch(() => null);
        const targetAttr = await clickTarget.getAttribute('target').catch(() => null);

        // If target is a product detail link with href, navigate directly to guarantee page transition
        if (href && (targetAttr === '_blank' || href.includes('/dp/') || href.includes('/gp/product/'))) {
          const fullUrl = href.startsWith('http') ? href : new URL(href, page.url()).toString();
          Logger.info(`Product link detected (href: ${href}). Navigating directly to product detail URL: ${fullUrl}`);
          await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout });
          break;
        }

        // Listen for new tab popups triggered by link click
        const pagePromise = page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null);
        await clickTarget.click({ timeout });
        const newTab = await pagePromise;
        if (newTab) {
          Logger.info(`Click successfully opened new browser tab: ${newTab.url()}`);
          await newTab.waitForLoadState('domcontentloaded').catch(() => null);
          await newTab.bringToFront().catch(() => null);
        }
        break;

      case 'ACTION_TYPE':
        let typeTarget = page.locator(locatorSelector);
        const typeCount = await typeTarget.count();
        if (typeCount > 1) {
          Logger.info(`Locator "${locatorSelector}" matched ${typeCount} elements. Selecting first editable target.`);
          typeTarget = typeTarget.first();
        }
        await typeTarget.waitFor({ state: 'visible', timeout });
        await typeTarget.fill(step.inputValue || '', { timeout });
        break;

      case 'ACTION_SELECT':
        let selectTarget = page.locator(locatorSelector);
        if ((await selectTarget.count()) > 1) {
          selectTarget = selectTarget.first();
        }
        await selectTarget.waitFor({ state: 'visible', timeout });
        await selectTarget.selectOption(step.inputValue || '', { timeout });
        break;

      case 'ACTION_HOVER':
        let hoverTarget = page.locator(locatorSelector);
        if ((await hoverTarget.count()) > 1) {
          hoverTarget = hoverTarget.first();
        }
        await hoverTarget.waitFor({ state: 'visible', timeout });
        await hoverTarget.hover({ timeout });
        break;

      case 'ACTION_PRESS_KEY':
        let pressTarget = page.locator(locatorSelector);
        if ((await pressTarget.count()) > 1) {
          pressTarget = pressTarget.first();
        }
        await pressTarget.press(step.inputValue || 'Enter', { timeout });
        break;

      case 'ASSERT_VISIBLE':
        let visibleTarget = page.locator(locatorSelector);
        if ((await visibleTarget.count()) > 1) {
          visibleTarget = visibleTarget.first();
        }
        await visibleTarget.waitFor({ state: 'visible', timeout });
        break;

      case 'ASSERT_TEXT_EQUALS':
        let textTarget = page.locator(locatorSelector);
        if ((await textTarget.count()) > 1) {
          textTarget = textTarget.first();
        }
        await textTarget.waitFor({ state: 'visible', timeout });
        const actualText = (await textTarget.innerText()).trim();
        const expectedText = (step.expectedValue || '').trim();
        if (actualText !== expectedText && !actualText.includes(expectedText)) {
          throw new Error(`Text assertion failed for "${locatorSelector}". Expected: "${expectedText}", Actual: "${actualText}"`);
        }
        break;

      case 'ASSERT_URL_CONTAINS':
        const currentUrl = page.url();
        const expectedUrlPart = step.expectedValue || '';
        if (!currentUrl.includes(expectedUrlPart)) {
          throw new Error(`URL assertion failed. Expected URL containing "${expectedUrlPart}", Actual URL: "${currentUrl}"`);
        }
        break;

      default:
        throw new Error(`Unsupported step intent: ${step.intent}`);
    }
  }
}
