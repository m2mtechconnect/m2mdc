// Manual test runner for the Canadian Funding Source Scanner
// This file can be used to manually test the scraper from the browser console

import { testFundingScanner } from './test-integration';

// Run this in the browser console to test the funding scanner
export const runFundingTest = async () => {
  console.log('🚀 Starting Canadian Funding Source Scanner Test...\n');
  
  try {
    await testFundingScanner();
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
};

// Auto-run when imported in dev mode
if (import.meta.env.DEV) {
  console.log('📋 Funding Scanner Test Available');
  console.log('Run: window.runFundingTest()');
  (window as any).runFundingTest = runFundingTest;
}
