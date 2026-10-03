import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface FrameworkConfig {
  baseUrl: string;
  llmProvider: string;
  openAiApiKey: string;
  llmModel: string;
  ollamaHost: string;
  headless: boolean;
  browser: 'chromium' | 'firefox' | 'webkit';
  slowMo: number;
  defaultTimeout: number;
  maskSensitiveData: boolean;
  secretPatterns: string[];
  enableLocatorRegistry: boolean;
  registryPath: string;
}

export const frameworkConfig: FrameworkConfig = {
  baseUrl: process.env.BASE_URL || 'https://www.saucedemo.com',
  llmProvider: process.env.LLM_PROVIDER || 'openai',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'gpt-4o',
  ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
  headless: process.env.HEADLESS !== 'false',
  browser: (process.env.BROWSER as 'chromium' | 'firefox' | 'webkit') || 'chromium',
  slowMo: parseInt(process.env.SLOW_MO || '0', 10),
  defaultTimeout: parseInt(process.env.DEFAULT_TIMEOUT || '30000', 10),
  maskSensitiveData: process.env.MASK_SENSITIVE_DATA !== 'false',
  secretPatterns: (process.env.SECRET_PATTERNS || 'password,secret,token,credit_card').split(','),
  enableLocatorRegistry: process.env.ENABLE_LOCATOR_REGISTRY !== 'false',
  registryPath: process.env.REGISTRY_PATH || './config/locator.registry.json',
};
