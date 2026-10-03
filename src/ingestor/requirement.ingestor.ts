import fs from 'fs';
import path from 'path';
import { Logger } from '../utils/logger';

export class RequirementIngestor {
  public ingest(filePath: string): { scenarioTitle: string; content: string; format: string } {
    const ext = path.extname(filePath).toLowerCase();
    const rawContent = fs.readFileSync(filePath, 'utf-8');

    Logger.info(`Ingesting requirement scenario from ${filePath} (Format: ${ext})`);

    switch (ext) {
      case '.json':
        return this.parseJson(rawContent);
      case '.feature':
        return this.parseGherkin(rawContent);
      case '.txt':
        return this.parsePlainText(rawContent, filePath);
      case '.md':
      default:
        return this.parseMarkdown(rawContent, filePath);
    }
  }

  private parseJson(raw: string): { scenarioTitle: string; content: string; format: string } {
    const parsed = JSON.parse(raw);
    const title = parsed.title || parsed.scenarioTitle || 'Structured JSON Scenario';
    const requirements = Array.isArray(parsed.requirements) 
      ? parsed.requirements.join('\n') 
      : JSON.stringify(parsed);

    return {
      scenarioTitle: title,
      content: requirements,
      format: 'json'
    };
  }

  private parseGherkin(raw: string): { scenarioTitle: string; content: string; format: string } {
    const lines = raw.split('\n').map(l => l.trim());
    let title = 'Gherkin BDD Scenario';
    
    for (const line of lines) {
      if (line.startsWith('Scenario:') || line.startsWith('Feature:')) {
        title = line.replace(/^(Scenario:|Feature:)/, '').trim();
        break;
      }
    }

    return {
      scenarioTitle: title,
      content: raw,
      format: 'gherkin'
    };
  }

  private parsePlainText(raw: string, filePath: string): { scenarioTitle: string; content: string; format: string } {
    const baseName = path.basename(filePath, '.txt');
    const title = baseName.replace(/_/g, ' ').toUpperCase();
    return {
      scenarioTitle: title,
      content: raw,
      format: 'text'
    };
  }

  private parseMarkdown(raw: string, filePath: string): { scenarioTitle: string; content: string; format: string } {
    const lines = raw.split('\n').map(l => l.trim());
    let title = path.basename(filePath, '.md');
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        title = line.replace('# ', '').trim();
        break;
      }
    }

    return {
      scenarioTitle: title,
      content: raw,
      format: 'markdown'
    };
  }
}
