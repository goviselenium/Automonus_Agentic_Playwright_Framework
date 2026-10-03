import { frameworkConfig } from '../../config/framework.config';
import { Logger } from '../utils/logger';

export abstract class BaseAgent {
  protected provider: string;
  protected apiKey: string;
  protected model: string;

  constructor() {
    this.provider = frameworkConfig.llmProvider;
    this.apiKey = frameworkConfig.openAiApiKey;
    this.model = frameworkConfig.llmModel;
  }

  /**
   * Generic method to call LLM or fallback deterministic engine if API key is not present.
   */
  protected async callLlm(prompt: string, systemPrompt: string): Promise<string> {
    Logger.debug(`Calling LLM Agent (${this.model}) with prompt length: ${prompt.length}`);

    // If API key is present and OpenAI SDK/HTTP fetch is configured
    if (this.apiKey && this.apiKey !== 'mock_or_env_key' && this.apiKey !== 'your_openai_api_key_here') {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`LLM API returned status ${response.status}: ${errText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
      } catch (err) {
        Logger.warn(`LLM call failed (${err}). Switching to deterministic agent fallback.`);
      }
    }

    // Deterministic rule-based fallback for local offline / zero-key testing
    return this.fallbackReasoning(prompt, systemPrompt);
  }

  protected abstract fallbackReasoning(prompt: string, systemPrompt: string): Promise<string>;
}
