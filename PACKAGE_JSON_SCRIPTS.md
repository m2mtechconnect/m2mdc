# Test Scripts for package.json

Since `package.json` is read-only, please manually add these test scripts to your `package.json` file:

## Add to "scripts" section:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    
    // ADD THESE TEST SCRIPTS:
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:int": "vitest run tests/integration",
    "test:all": "vitest run && playwright test",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:record": "playwright codegen",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Usage After Adding Scripts:

```bash
# Run all tests
npm run test:all

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:int

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Generate coverage report
npm run test:coverage
```
