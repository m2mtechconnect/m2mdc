# Test Helpers

Comprehensive utilities for seeding realistic test data in integration tests.

## Usage

### Quick Seeding

For simple test scenarios, use the `quickSeeds` helpers:

```typescript
import { quickSeeds, cleanupTestData } from './helpers/seedHelpers';

describe('Builder Flow', () => {
  let testData: any;

  beforeEach(async () => {
    testData = await quickSeeds.singleActiveSystem();
  });

  afterEach(async () => {
    await cleanupTestData(testData.user.id);
  });

  it('should load system data', () => {
    expect(testData.system.status).toBe('active');
  });
});
```

### Full Environment Seeding

For complex integration tests:

```typescript
import { seedTestEnvironment, cleanupTestData } from './helpers/seedHelpers';

describe('Dashboard Integration', () => {
  let seedResult: any;

  beforeAll(async () => {
    seedResult = await seedTestEnvironment({
      systemsCount: 5,
      integrationsCount: 3,
      runsCount: 50,
      sourcesCount: 10,
    });
  });

  afterAll(async () => {
    await cleanupTestData(seedResult.user.id);
  });

  it('should display all systems', () => {
    expect(seedResult.systems).toHaveLength(5);
  });
});
```

### Custom Data Factory

For unit tests or custom scenarios:

```typescript
import { TestDataFactory } from './helpers/testDataFactory';

describe('Agent Config', () => {
  it('should validate agent config', () => {
    const config = TestDataFactory.agentConfig({
      name: 'Custom Agent',
      status: 'active',
    });
    
    expect(config.name).toBe('Custom Agent');
    expect(config.config.model).toBeDefined();
  });
});
```

## Available Quick Seeds

- `quickSeeds.singleActiveSystem()` - One active system with workflow
- `quickSeeds.multipleSystemStates()` - Systems in various states
- `quickSeeds.connectedIntegrations()` - User with connected integrations
- `quickSeeds.completeBuilderFlow()` - Full builder scenario

## Test Data Factory

Generate realistic fake data for:
- Agent configs
- Integrations
- Workflow nodes
- Agent runs
- Knowledge sources
- Policies
- Deployments

Batch generation available for load testing.

## Cleanup

Always cleanup after tests:

```typescript
afterEach(async () => {
  await cleanupTestData(userId);
});
```
