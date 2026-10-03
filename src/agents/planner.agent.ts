import { BaseAgent } from './base.agent';
import { TestPlan, TestPlanSchema } from '../schemas/plan.schema';
import { MaskUtil } from '../utils/mask.util';
import { Logger } from '../utils/logger';

export class PlannerAgent extends BaseAgent {
  public async plan(scenarioText: string, baseUrl: string): Promise<TestPlan> {
    const sanitizedScenario = MaskUtil.maskSensitiveData(scenarioText);
    Logger.info(`Planner Agent analyzing scenario...`);

    const systemPrompt = `You are an expert QA Automation Planner.
Your task is to decompose high-level user scenario requirements into an ordered, stateful graph of atomic execution steps.

Output strictly valid JSON matching this schema:
{
  "planId": "plan_001",
  "scenarioTitle": "Title of test case",
  "baseUrl": "${baseUrl}",
  "prerequisites": [],
  "steps": [
    {
      "stepId": "step_001",
      "intent": "ACTION_NAVIGATE" | "ACTION_CLICK" | "ACTION_TYPE" | "ACTION_SELECT" | "ACTION_HOVER" | "ACTION_PRESS_KEY" | "ASSERT_VISIBLE" | "ASSERT_TEXT_EQUALS" | "ASSERT_URL_CONTAINS",
      "targetDescription": "human readable target, e.g. login button or username input",
      "inputValue": "optional value to type or select",
      "expectedValue": "optional expected text or URL for assertions",
      "criticality": "CRITICAL",
      "timeoutMs": 30000
    }
  ],
  "cleanup": []
}`;

    const userPrompt = `Target Base URL: ${baseUrl}
Requirement Scenario:
${sanitizedScenario}`;

    const rawResponse = await this.callLlm(userPrompt, systemPrompt);
    
    try {
      const parsedJson = JSON.parse(rawResponse);
      return TestPlanSchema.parse(parsedJson);
    } catch (e) {
      Logger.warn(`Failed to parse LLM planner output into schema: ${e}. Using dynamic scenario parser...`);
      return this.deterministicPlan(sanitizedScenario, baseUrl);
    }
  }

  protected async fallbackReasoning(prompt: string, systemPrompt: string): Promise<string> {
    const baseUrl = prompt.includes('Target Base URL:') 
      ? prompt.split('Target Base URL:')[1].split('\n')[0].trim() 
      : 'https://www.saucedemo.com';

    const plan: TestPlan = this.deterministicPlan(prompt, baseUrl);
    return JSON.stringify(plan, null, 2);
  }

  private deterministicPlan(scenarioText: string, baseUrl: string): TestPlan {
    const steps: any[] = [];
    let stepCounter = 1;

    steps.push({
      stepId: `step_00${stepCounter++}`,
      intent: 'ACTION_NAVIGATE',
      targetDescription: `Navigate to ${baseUrl}`,
      inputValue: baseUrl,
      criticality: 'CRITICAL',
      timeoutMs: 30000
    });

    const lines = scenarioText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('##'));

    let hasAddedLogin = false;

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (lower.startsWith('navigate') || lower.startsWith('given user is on')) {
        continue;
      }

      if (!hasAddedLogin && (lower.includes('log in') || lower.includes('login') || lower.includes('credentials'))) {
        hasAddedLogin = true;
        steps.push({
          stepId: `step_00${stepCounter++}`,
          intent: 'ACTION_TYPE',
          targetDescription: 'Username field',
          inputValue: 'standard_user',
          criticality: 'CRITICAL',
          timeoutMs: 30000
        });
        steps.push({
          stepId: `step_00${stepCounter++}`,
          intent: 'ACTION_TYPE',
          targetDescription: 'Password field',
          inputValue: 'secret_sauce',
          criticality: 'CRITICAL',
          timeoutMs: 30000
        });
        steps.push({
          stepId: `step_00${stepCounter++}`,
          intent: 'ACTION_CLICK',
          targetDescription: 'Login button',
          criticality: 'CRITICAL',
          timeoutMs: 30000
        });
      } else if (lower.includes('type') || lower.includes('enter') || lower.includes('fill')) {
        const inputValMatch = line.match(/["']([^"']+)["']/);
        const val = inputValMatch ? inputValMatch[1] : 'test value';
        steps.push({
          stepId: `step_00${stepCounter++}`,
          intent: 'ACTION_TYPE',
          targetDescription: line,
          inputValue: val,
          criticality: 'CRITICAL',
          timeoutMs: 30000
        });
      } else if (lower.includes('click') || lower.includes('add') || lower.includes('open') || lower.includes('select')) {
        steps.push({
          stepId: `step_00${stepCounter++}`,
          intent: 'ACTION_CLICK',
          targetDescription: line,
          criticality: 'CRITICAL',
          timeoutMs: 30000
        });
      } else if (lower.includes('verify') || lower.includes('assert') || lower.includes('should')) {
        steps.push({
          stepId: `step_00${stepCounter++}`,
          intent: 'ASSERT_VISIBLE',
          targetDescription: line.replace(/^(verify|assert|then)\s+/i, '').trim(),
          criticality: 'CRITICAL',
          timeoutMs: 30000
        });
      }
    }

    return {
      planId: 'plan_auto_001',
      scenarioTitle: 'Autonomous Generated Test Plan',
      baseUrl,
      prerequisites: [],
      steps,
      cleanup: []
    };
  }
}
