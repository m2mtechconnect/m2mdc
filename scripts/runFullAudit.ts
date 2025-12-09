/**
 * Full Audit Script for Industry + Department Digital Twin Recommender
 * Runs all tests and generates a comprehensive PASS/FAIL report
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  total: number;
  failures: string[];
}

interface AuditReport {
  timestamp: string;
  summary: {
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    passRate: number;
  };
  results: TestResult[];
  missingImplementations: string[];
  criticalIssues: string[];
  recommendations: string[];
}

async function runTestSuite(command: string, suiteName: string): Promise<TestResult> {
  console.log(`\n🧪 Running ${suiteName}...`);
  
  try {
    const { stdout, stderr } = await execAsync(command);
    
    // Parse output for test results
    const passMatch = stdout.match(/(\d+) passed/);
    const failMatch = stdout.match(/(\d+) failed/);
    const totalMatch = stdout.match(/(\d+) total/);
    
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    const total = totalMatch ? parseInt(totalMatch[1]) : passed + failed;
    
    // Extract failure messages
    const failures: string[] = [];
    if (failed > 0) {
      const failureSection = stdout.split('FAIL')[1] || '';
      const lines = failureSection.split('\n').slice(0, 10);
      failures.push(...lines.filter(l => l.trim()));
    }
    
    console.log(`✅ ${passed} passed, ❌ ${failed} failed, Total: ${total}`);
    
    return {
      suite: suiteName,
      passed,
      failed,
      total,
      failures,
    };
  } catch (error: any) {
    console.error(`❌ Error running ${suiteName}:`, error.message);
    return {
      suite: suiteName,
      passed: 0,
      failed: 1,
      total: 1,
      failures: [error.message],
    };
  }
}

async function checkImplementationCompleteness(): Promise<string[]> {
  const missing: string[] = [];
  
  // Check for required files
  const requiredFiles = [
    'src/lib/digitalTwin/industryClassifier.ts',
    'src/lib/digitalTwin/departmentClassifier.ts',
    'src/lib/digitalTwin/twinTemplates.ts',
    'src/lib/digitalTwin/enhancedValidators.ts',
    'supabase/functions/url-recommendations/index.ts',
  ];
  
  for (const file of requiredFiles) {
    try {
      await fs.access(file);
    } catch {
      missing.push(`Missing required file: ${file}`);
    }
  }
  
  return missing;
}

async function analyzeCriticalIssues(results: TestResult[]): Promise<string[]> {
  const issues: string[] = [];
  
  // Check for failing industry classification
  const industryTests = results.find(r => r.suite.includes('Industry'));
  if (industryTests && industryTests.failed > 0) {
    issues.push('CRITICAL: Industry classification is failing');
  }
  
  // Check for failing department classification
  const deptTests = results.find(r => r.suite.includes('Department'));
  if (deptTests && deptTests.failed > 0) {
    issues.push('CRITICAL: Department classification is failing');
  }
  
  // Check for failing validation
  const validationTests = results.find(r => r.suite.includes('Validation'));
  if (validationTests && validationTests.failed > 0) {
    issues.push('CRITICAL: Digital Twin validation is failing');
  }
  
  // Check pass rate
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalTests = results.reduce((sum, r) => sum + r.total, 0);
  const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
  
  if (passRate < 80) {
    issues.push(`WARNING: Overall pass rate is ${passRate.toFixed(1)}% (target: 80%+)`);
  }
  
  return issues;
}

function generateRecommendations(results: TestResult[], issues: string[]): string[] {
  const recommendations: string[] = [];
  
  if (issues.some(i => i.includes('Industry classification'))) {
    recommendations.push('Review and fix src/lib/digitalTwin/industryClassifier.ts');
    recommendations.push('Add more domain patterns for edge cases');
  }
  
  if (issues.some(i => i.includes('Department classification'))) {
    recommendations.push('Review and fix src/lib/digitalTwin/departmentClassifier.ts');
    recommendations.push('Enhance keyword weighting and context analysis');
  }
  
  if (issues.some(i => i.includes('validation'))) {
    recommendations.push('Review and fix src/lib/digitalTwin/enhancedValidators.ts');
    recommendations.push('Ensure all required elements are checked');
  }
  
  const e2eTests = results.find(r => r.suite.includes('E2E'));
  if (e2eTests && e2eTests.failed > 0) {
    recommendations.push('Fix UI integration issues');
    recommendations.push('Ensure edge function is properly wired to UI');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All tests passing! System is functioning correctly.');
    recommendations.push('Continue monitoring for regressions.');
  }
  
  return recommendations;
}

async function generateAuditReport(results: TestResult[]): Promise<AuditReport> {
  const totalTests = results.reduce((sum, r) => sum + r.total, 0);
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
  
  const missingImplementations = await checkImplementationCompleteness();
  const criticalIssues = await analyzeCriticalIssues(results);
  const recommendations = generateRecommendations(results, criticalIssues);
  
  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      totalPassed,
      totalFailed,
      passRate,
    },
    results,
    missingImplementations,
    criticalIssues,
    recommendations,
  };
}

async function saveReport(report: AuditReport): Promise<void> {
  const reportPath = path.join(process.cwd(), 'AUDIT_REPORT.md');
  
  let markdown = `# Industry + Department Digital Twin Recommender - Audit Report\n\n`;
  markdown += `**Generated:** ${report.timestamp}\n\n`;
  
  markdown += `## 📊 Summary\n\n`;
  markdown += `- **Total Tests:** ${report.summary.totalTests}\n`;
  markdown += `- **Passed:** ✅ ${report.summary.totalPassed}\n`;
  markdown += `- **Failed:** ❌ ${report.summary.totalFailed}\n`;
  markdown += `- **Pass Rate:** ${report.summary.passRate.toFixed(1)}%\n\n`;
  
  if (report.summary.passRate >= 80) {
    markdown += `🎉 **PASS** - System is functioning correctly!\n\n`;
  } else {
    markdown += `⚠️ **ATTENTION REQUIRED** - Some tests are failing.\n\n`;
  }
  
  markdown += `## 🧪 Test Results by Suite\n\n`;
  for (const result of report.results) {
    const status = result.failed === 0 ? '✅ PASS' : '❌ FAIL';
    markdown += `### ${status} ${result.suite}\n\n`;
    markdown += `- Passed: ${result.passed}\n`;
    markdown += `- Failed: ${result.failed}\n`;
    markdown += `- Total: ${result.total}\n`;
    
    if (result.failures.length > 0) {
      markdown += `\n**Failures:**\n`;
      result.failures.forEach(f => {
        markdown += `- ${f}\n`;
      });
    }
    markdown += `\n`;
  }
  
  if (report.missingImplementations.length > 0) {
    markdown += `## ⚠️ Missing Implementations\n\n`;
    report.missingImplementations.forEach(m => {
      markdown += `- ${m}\n`;
    });
    markdown += `\n`;
  }
  
  if (report.criticalIssues.length > 0) {
    markdown += `## 🚨 Critical Issues\n\n`;
    report.criticalIssues.forEach(i => {
      markdown += `- ${i}\n`;
    });
    markdown += `\n`;
  }
  
  markdown += `## 💡 Recommendations\n\n`;
  report.recommendations.forEach(r => {
    markdown += `- ${r}\n`;
  });
  markdown += `\n`;
  
  markdown += `## 📝 Next Steps\n\n`;
  if (report.summary.passRate >= 80) {
    markdown += `1. Monitor for regressions in production\n`;
    markdown += `2. Add additional test coverage for edge cases\n`;
    markdown += `3. Document any known limitations\n`;
  } else {
    markdown += `1. Address critical issues listed above\n`;
    markdown += `2. Fix failing tests one suite at a time\n`;
    markdown += `3. Re-run audit after fixes\n`;
    markdown += `4. Ensure pass rate reaches 80%+ before deployment\n`;
  }
  
  await fs.writeFile(reportPath, markdown, 'utf-8');
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

async function main() {
  console.log('🚀 Starting Full Audit of Industry + Department Digital Twin Recommender\n');
  console.log('=' .repeat(80));
  
  const testSuites = [
    { command: 'npm run test:unit -- industryClassifier', name: 'Industry Classification (20 Industries)' },
    { command: 'npm run test:unit -- departmentClassifier', name: 'Department Classification (12 Departments)' },
    { command: 'npm run test:unit -- twinTemplateValidation', name: 'Digital Twin Template Validation' },
    { command: 'npm run test:integration -- industryDepartmentPipeline', name: 'Full Pipeline Integration' },
    { command: 'npm run test:e2e -- industry-department-ui', name: 'UI End-to-End Tests' },
  ];
  
  const results: TestResult[] = [];
  
  for (const suite of testSuites) {
    const result = await runTestSuite(suite.command, suite.name);
    results.push(result);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Generating Audit Report...\n');
  
  const report = await generateAuditReport(results);
  await saveReport(report);
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Audit Complete!\n');
  console.log(`Pass Rate: ${report.summary.passRate.toFixed(1)}%`);
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`Passed: ${report.summary.totalPassed}`);
  console.log(`Failed: ${report.summary.totalFailed}`);
  
  if (report.criticalIssues.length > 0) {
    console.log('\n🚨 Critical Issues Found:');
    report.criticalIssues.forEach(i => console.log(`  - ${i}`));
  }
  
  process.exit(report.summary.totalFailed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error running audit:', error);
  process.exit(1);
});
