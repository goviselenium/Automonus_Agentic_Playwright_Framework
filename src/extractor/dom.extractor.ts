import { Page } from 'playwright';
import { PageSnapshot, InteractiveElement } from '../schemas/snapshot.schema';
import { Logger } from '../utils/logger';

export class DOMExtractor {
  public async extractPageState(page: Page): Promise<PageSnapshot> {
    const url = page.url();
    const title = await page.title();
    const timestamp = new Date().toISOString();

    let ariaSnapshot = '';
    try {
      ariaSnapshot = await page.locator('body').ariaSnapshot();
    } catch (e) {
      Logger.warn(`ariaSnapshot failed or unsupported on current browser: ${e}. Falling back to dynamic DOM query.`);
    }

    const interactiveElements = await page.evaluate(() => {
      const elements: any[] = [];
      const selectors = 'button, input, select, textarea, a, [role="button"], [role="link"], [role="textbox"], [data-test], [data-testid]';
      const nodes = Array.from(document.querySelectorAll(selectors));

      for (const node of nodes) {
        const el = node as HTMLElement;
        const rect = el.getBoundingClientRect();
        
        // Skip hidden elements
        const isVisible = !!(rect.width || rect.height || el.getClientRects().length) && 
                          window.getComputedStyle(el).visibility !== 'hidden' &&
                          window.getComputedStyle(el).display !== 'none';

        if (!isVisible) continue;

        const id = el.id || undefined;
        const tagName = el.tagName.toLowerCase();
        const role = el.getAttribute('role') || undefined;
        const name = el.getAttribute('name') || el.getAttribute('aria-label') || undefined;
        const text = (el.innerText || el.textContent || '').trim().substring(0, 100) || undefined;
        const placeholder = el.getAttribute('placeholder') || undefined;
        const testId = el.getAttribute('data-test') || el.getAttribute('data-testid') || undefined;

        // Formulate a recommended selector hint
        let selectorHint = '';
        if (testId) {
          selectorHint = `[data-test="${testId}"], [data-testid="${testId}"]`;
        } else if (id) {
          selectorHint = `#${id}`;
        } else if (role && name) {
          selectorHint = `role=${role}[name="${name}"]`;
        } else if (name) {
          selectorHint = `[name="${name}"]`;
        } else if (placeholder) {
          selectorHint = `[placeholder="${placeholder}"]`;
        } else if (text && (tagName === 'button' || tagName === 'a')) {
          selectorHint = `${tagName}:has-text("${text}")`;
        } else {
          selectorHint = `${tagName}`;
        }

        elements.push({
          id,
          tagName,
          role,
          name,
          text,
          placeholder,
          testId,
          selectorHint,
          isVisible,
          isEnabled: !(el as any).disabled,
          boundingBox: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        });
      }

      return elements;
    });

    if (!ariaSnapshot) {
      ariaSnapshot = interactiveElements
        .map(el => `- [${el.tagName}] ${el.name || el.text || el.placeholder || el.id || el.selectorHint}`)
        .join('\n');
    }

    return {
      url,
      title,
      ariaSnapshot,
      interactiveElements,
      timestamp
    };
  }
}
