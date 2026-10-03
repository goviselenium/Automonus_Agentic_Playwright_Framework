import path from 'path';
import { RequirementIngestor } from '../../src/ingestor/requirement.ingestor';

describe('RequirementIngestor Unit Tests', () => {
  const ingestor = new RequirementIngestor();

  it('should ingest markdown scenario files', () => {
    const specPath = path.resolve(process.cwd(), 'scenarios/purchase_flow.md');
    const result = ingestor.ingest(specPath);
    expect(result.format).toBe('markdown');
    expect(result.scenarioTitle).toBe('User Story: Swag Labs E-Commerce Purchase Flow');
  });

  it('should ingest gherkin feature files', () => {
    const specPath = path.resolve(process.cwd(), 'scenarios/sample_gherkin.feature');
    const result = ingestor.ingest(specPath);
    expect(result.format).toBe('gherkin');
    expect(result.scenarioTitle).toBe('User Authentication & Product Selection');
  });

  it('should ingest JSON scenario files', () => {
    const specPath = path.resolve(process.cwd(), 'scenarios/sample_case.json');
    const result = ingestor.ingest(specPath);
    expect(result.format).toBe('json');
    expect(result.scenarioTitle).toBe('E-Commerce Checkout Verification');
  });
});
