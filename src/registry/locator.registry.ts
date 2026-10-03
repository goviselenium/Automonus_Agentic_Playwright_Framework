import fs from 'fs';
import path from 'path';
import { LocatorRegistry, LocatorRegistrySchema, RegistryEntry } from '../schemas/registry.schema';
import { frameworkConfig } from '../../config/framework.config';
import { Logger } from '../utils/logger';

export class LocatorRegistryManager {
  private registryPath: string;
  private registryData: LocatorRegistry = {};

  constructor() {
    this.registryPath = path.resolve(process.cwd(), frameworkConfig.registryPath);
    this.loadRegistry();
  }

  private loadRegistry(): void {
    if (!frameworkConfig.enableLocatorRegistry) {
      return;
    }

    try {
      if (fs.existsSync(this.registryPath)) {
        const fileContent = fs.readFileSync(this.registryPath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.registryData = LocatorRegistrySchema.parse(parsed);
        Logger.info(`Loaded ${Object.keys(this.registryData).length} domain-scoped cached locators from registry.`);
      }
    } catch (e) {
      Logger.warn(`Failed to load locator registry from ${this.registryPath}: ${e}`);
      this.registryData = {};
    }
  }

  public getCachedLocator(domainOrUrl: string, targetDescription: string): string | null {
    if (!frameworkConfig.enableLocatorRegistry) return null;

    const key = this.hashKey(domainOrUrl, targetDescription);
    const entry = this.registryData[key];

    if (entry) {
      Logger.info(`Registry HIT for domain [${this.extractDomain(domainOrUrl)}] target "${targetDescription}": ${entry.lastKnownLocator}`);
      return entry.lastKnownLocator;
    }

    return null;
  }

  public registerLocator(domainOrUrl: string, targetDescription: string, locator: string): void {
    if (!frameworkConfig.enableLocatorRegistry) return;

    const key = this.hashKey(domainOrUrl, targetDescription);
    const existing = this.registryData[key];

    const entry: RegistryEntry = {
      targetKey: key,
      lastKnownLocator: locator,
      fallbackLocators: existing ? Array.from(new Set([...existing.fallbackLocators, existing.lastKnownLocator])) : [],
      lastVerified: new Date().toISOString(),
      successfulRuns: existing ? existing.successfulRuns + 1 : 1
    };

    this.registryData[key] = entry;
    this.saveRegistry();
  }

  private saveRegistry(): void {
    try {
      const dir = path.dirname(this.registryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.registryPath, JSON.stringify(this.registryData, null, 2), 'utf-8');
      Logger.info(`Saved locator registry to ${this.registryPath}`);
    } catch (e) {
      Logger.error(`Failed to save locator registry: ${e}`);
    }
  }

  private extractDomain(domainOrUrl: string): string {
    try {
      if (domainOrUrl.startsWith('http://') || domainOrUrl.startsWith('https://')) {
        return new URL(domainOrUrl).hostname;
      }
    } catch (e) {
      // fallback
    }
    return domainOrUrl;
  }

  private hashKey(domainOrUrl: string, input: string): string {
    const domain = this.extractDomain(domainOrUrl);
    const cleanDesc = input.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${domain}__${cleanDesc}`;
  }
}
