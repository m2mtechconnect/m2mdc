#!/usr/bin/env node
/**
 * YVR Regression Test Runner
 * Run all YVR-related tests and report results
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestResult {
  suite: string;
  passed: boolean;
  output: string;
  duration: number;
}

const testSuites = [
  {
    name: 'Backend Integrity',
    command: 'npm run test -- tests/unit/yvr-template-integrity.test.ts',
  },
  {
    name: 'Builder Wiring',
    command: 'npm run test -- tests/integration/yvr-builder-wiring.test.ts',
  },
  {
    name: 'Intake Flows',
    command: 'npm run test -- tests/integration/yvr-intake-flows.test.ts',
  },
  {
    name: 'Analytics Events',
    command: 'npm run test -- tests/unit/yvr-analytics-events.test.ts',
  },
  {
    name: 'Marketplace Flow (E2E)',
    command: 'npm run test:e2e -- tests/e2e/yvr-marketplace-flow.spec.ts',
  },
  {
    name: 'Builder Deploy (E2E)',
    command: 'npm run test:e2e -- tests/e2e/yvr-builder-deploy.spec.ts',
  },
];

async function runTestSuite(suite: { name: string; command: string }): Promise<TestResult> {
  const startTime = Date.now();
  console.log(`\n🧪 Running ${suite.name}...`);

  try {
    const { stdout, stderr } = await execAsync(suite.command, {
      timeout: 60000, // 60 second timeout per suite
    });

    const duration = Date.now() - startTime;
    const output = stdout + stderr;

    // Check if tests passed
    const passed = !output.includes('FAIL') && !output.includes('Error:');

    if (passed) {
      console.log(`✅ ${suite.name} PASSED (${duration}ms)`);
    } else {
      console.log(`❌ ${suite.name} FAILED (${duration}ms)`);
    }

    return {
      suite: suite.name,
      passed,
      output,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`❌ ${suite.name} FAILED (${duration}ms)`);

    return {
      suite: suite.name,
      passed: false,
      output: error.stdout + error.stderr || error.message,
      duration,
    };
  }
}

async function main() {
  console.log('==================================================');
  console.log('  YVR AIRPORT DIGITAL TWIN - REGRESSION SUITE');
  console.log('==================================================\n');
  console.log('Running comprehensive tests for YVR template...\n');

  const results: TestResult[] = [];

  // Run all test suites
  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    results.push(result);
  }

  // Print summary
  console.log('\n==================================================');
  console.log('  TEST SUMMARY');
  console.log('==================================================\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const duration = `${result.duration}ms`;
    console.log(`${status} - ${result.suite} (${duration})`);
  });

  console.log(`\nTotal: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Duration: ${totalDuration}ms\n`);

  // Print failed test details
  if (failed > 0) {
    console.log('\n==================================================');
    console.log('  FAILED TEST DETAILS');
    console.log('==================================================\n');

    results
      .filter(r => !r.passed)
      .forEach(result => {
        console.log(`\n--- ${result.suite} ---`);
        console.log(result.output);
      });
  }

  // Exit with appropriate code
  if (failed > 0) {
    console.log('\n❌ YVR REGRESSION SUITE FAILED\n');
    process.exit(1);
  } else {
    console.log('\n✅ YVR REGRESSION SUITE PASSED\n');
    console.log('All YVR template tests are passing!');
    console.log('Template is safe for production deployment.\n');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error running test suite:', error);
  process.exit(1);
});
