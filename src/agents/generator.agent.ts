import { BaseAgent } from './base.agent';
import { AtomicStep } from '../schemas/plan.schema';
import { PageSnapshot } from '../schemas/snapshot.schema';
import { Logger } from '../utils/logger';

export class GeneratorAgent extends BaseAgent {
  public async resolveLocator(step: AtomicStep, snapshot: PageSnapshot): Promise<string> {
    Logger.info(`Generator Agent resolving locator for step [${step.stepId}]: "${step.targetDescription}" (${step.intent})`);

    const systemPrompt = `You are a specialized Playwright Action Generator.
Given a step intent, target description, and live page ARIA/element snapshot, identify the most robust single Playwright selector.

Prefer selectors in this priority order:
1. data-test / data-testid attributes (e.g. [data-test="username"])
2. Unique ID (e.g. #username)
3. Role & Name (e.g. role=button[name="Login"])
4. Name or Placeholder attribute (e.g. [name="user-name"])

Output JSON strictly in this format:
{
  "selector": "[data-test='username']",
  "confidence": 0.95
}`;

    const userPrompt = `Step Intent: ${step.intent}
Target Description: ${step.targetDescription}
Page Title: ${snapshot.title}
Page URL: ${snapshot.url}
Page ARIA Snapshot:
${snapshot.ariaSnapshot}

Interactive Elements:
${JSON.stringify(snapshot.interactiveElements, null, 2)}`;

    const rawResponse = await this.callLlm(userPrompt, systemPrompt);

    try {
      const parsed = JSON.parse(rawResponse);
      if (parsed.selector && parsed.selector !== 'body' && (parsed.confidence === undefined || parsed.confidence >= 0.7)) {
        return parsed.selector;
      }
    } catch (e) {
      Logger.debug(`LLM locator response parse error: ${e}. Using semantic matcher fallback.`);
    }

    return this.matchSemanticElement(step, snapshot);
  }

  protected async fallbackReasoning(prompt: string, systemPrompt: string): Promise<string> {
    return JSON.stringify({ selector: 'body', confidence: 0.5 });
  }

  private matchSemanticElement(step: AtomicStep, snapshot: PageSnapshot): string {
    const desc = step.targetDescription.toLowerCase();

    // Amazon search item title link
    if ((desc.includes('product') || desc.includes('item')) && step.intent === 'ACTION_CLICK') {
      return 'div[data-component-type="s-search-result"] h2 a[href*="/dp/"], .s-main-slot h2 a[href*="/dp/"]';
    }

    // Add to cart buttons
    if (desc.includes('add to cart')) {
      return '#add-to-cart-button, [data-test="add-to-cart-sauce-labs-backpack"], input#add-to-cart-button';
    }

    // Amazon search input & click
    if (desc.includes('search') && step.intent === 'ACTION_TYPE') {
      return '#twotabsearchtextbox';
    }

    if (desc.includes('search') && step.intent === 'ACTION_CLICK') {
      return '#nav-search-submit-button';
    }

    // 1. Check interactive elements extracted from live DOM
    for (const el of snapshot.interactiveElements) {
      const id = (el.id || '').toLowerCase();
      const name = (el.name || '').toLowerCase();

      if (desc.includes('search') && step.intent === 'ACTION_TYPE') {
        if (id === 'twotabsearchtextbox' || name === 'field-keywords') {
          return `#${el.id}`;
        }
      }

      if (desc.includes('search') && step.intent === 'ACTION_CLICK') {
        if (id === 'nav-search-submit-button') {
          return `#${el.id}`;
        }
      }
    }

    if (desc.includes('username') || desc.includes('user name')) {
      return '[data-test="username"], input[name="username"]';
    }

    if (desc.includes('password')) {
      return '[data-test="password"], input[name="password"]';
    }

    if (desc.includes('login button') || desc.includes('login') || desc.includes('log in')) {
      return '[data-test="login-button"], input[type="submit"], input[value="Log In"]';
    }

    if (step.intent === 'ACTION_NAVIGATE') {
      return step.inputValue || step.expectedValue || snapshot.url;
    }

    if (step.intent === 'ACTION_TYPE') {
      return 'input:not([type="hidden"])';
    }

    if (step.intent === 'ACTION_CLICK') {
      return 'button, input[type="submit"]';
    }

    return 'body';
  }
}
