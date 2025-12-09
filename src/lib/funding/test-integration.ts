// Test script for Canadian Funding Source Scanner
// Run this to verify the system is working end-to-end

import { 
  triggerFundingScraper, 
  queryFundingPrograms, 
  getFundingForFocusAreas,
  getScraperLogs 
} from './queryClient';

export const testFundingScanner = async () => {
  console.log('🧪 Testing Canadian Funding Source Scanner\n');
  
  // Test 1: Trigger Scraper
  console.log('📡 Test 1: Triggering funding scraper...');
  try {
    const scraperResult = await triggerFundingScraper();
    if (scraperResult.success) {
      console.log('✅ Scraper completed successfully');
      console.log(`   ${scraperResult.message}\n`);
    } else {
      console.log('❌ Scraper failed:', scraperResult.error, '\n');
    }
  } catch (error) {
    console.log('❌ Scraper error:', error, '\n');
  }
  
  // Wait for scraper to complete
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 2: Query All Programs
  console.log('🔍 Test 2: Querying all programs...');
  try {
    const allPrograms = await queryFundingPrograms({ limit: 100 });
    console.log(`✅ Found ${allPrograms.count} total programs`);
    if (allPrograms.programs.length > 0) {
      console.log('   Sample programs:');
      allPrograms.programs.slice(0, 3).forEach(p => {
        console.log(`   - ${p.program_name} (${p.agency})`);
      });
    }
    console.log('');
  } catch (error) {
    console.log('❌ Query all programs error:', error, '\n');
  }
  
  // Test 3: Query AI Programs
  console.log('🤖 Test 3: Querying AI-focused programs...');
  try {
    const aiPrograms = await queryFundingPrograms({
      focus: 'AI',
      status: 'Open',
      limit: 10,
    });
    console.log(`✅ Found ${aiPrograms.count} AI programs`);
    aiPrograms.programs.forEach(p => {
      const amountRange = p.funding_amount_min && p.funding_amount_max
        ? `$${p.funding_amount_min.toLocaleString()} - $${p.funding_amount_max.toLocaleString()}`
        : 'Amount varies';
      console.log(`   - ${p.program_name}`);
      console.log(`     ${p.agency} | ${p.status} | ${amountRange}`);
    });
    console.log('');
  } catch (error) {
    console.log('❌ Query AI programs error:', error, '\n');
  }
  
  // Test 4: Query Federal Programs
  console.log('🍁 Test 4: Querying Federal programs...');
  try {
    const federalPrograms = await queryFundingPrograms({
      jurisdiction: 'Federal',
      limit: 10,
    });
    console.log(`✅ Found ${federalPrograms.count} Federal programs`);
    
    // Group by agency
    const byAgency = federalPrograms.programs.reduce((acc, p) => {
      acc[p.agency] = (acc[p.agency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   Programs by agency:');
    Object.entries(byAgency).forEach(([agency, count]) => {
      console.log(`   - ${agency}: ${count} program(s)`);
    });
    console.log('');
  } catch (error) {
    console.log('❌ Query federal programs error:', error, '\n');
  }
  
  // Test 5: Get Funding for Focus Areas (Recommendation Engine Integration)
  console.log('🎯 Test 5: Testing recommendation engine integration...');
  try {
    const focusAreas = ['AI', 'Digital Transformation', 'Manufacturing'];
    const relevantFunding = await getFundingForFocusAreas(focusAreas, {
      status: 'Open',
      limit: 5,
    });
    console.log(`✅ Found ${relevantFunding.length} programs matching focus areas: ${focusAreas.join(', ')}`);
    relevantFunding.forEach(p => {
      console.log(`   - ${p.program_name}`);
      console.log(`     Focus: ${p.focus_areas.join(', ')}`);
      console.log(`     URL: ${p.url}`);
    });
    console.log('');
  } catch (error) {
    console.log('❌ Recommendation integration error:', error, '\n');
  }
  
  // Test 6: Check Scraper Logs
  console.log('📋 Test 6: Checking scraper logs...');
  try {
    const logs = await getScraperLogs(5);
    console.log(`✅ Found ${logs.length} recent scraper runs`);
    logs.forEach(log => {
      const duration = log.completed_at && log.started_at
        ? `${Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s`
        : 'N/A';
      console.log(`   - ${log.source_name}: ${log.status} | ${log.programs_found} found | Duration: ${duration}`);
      if (log.error_message) {
        console.log(`     Error: ${log.error_message}`);
      }
    });
    console.log('');
  } catch (error) {
    console.log('❌ Scraper logs error:', error, '\n');
  }
  
  // Test 7: Validate Data Quality
  console.log('✅ Test 7: Validating data quality...');
  try {
    const allPrograms = await queryFundingPrograms({ limit: 100 });
    const programs = allPrograms.programs;
    
    const issues: string[] = [];
    
    programs.forEach(p => {
      if (!p.program_name) issues.push(`Missing program name: ${p.id}`);
      if (!p.agency) issues.push(`Missing agency: ${p.program_name}`);
      if (!p.url) issues.push(`Missing URL: ${p.program_name}`);
      if (!p.jurisdiction) issues.push(`Missing jurisdiction: ${p.program_name}`);
      if (!p.focus_areas || p.focus_areas.length === 0) {
        issues.push(`Missing focus areas: ${p.program_name}`);
      }
    });
    
    if (issues.length === 0) {
      console.log('✅ All programs have required fields');
    } else {
      console.log(`⚠️  Found ${issues.length} data quality issues:`);
      issues.slice(0, 5).forEach(issue => console.log(`   - ${issue}`));
      if (issues.length > 5) {
        console.log(`   ... and ${issues.length - 5} more`);
      }
    }
    console.log('');
  } catch (error) {
    console.log('❌ Data quality validation error:', error, '\n');
  }
  
  // Summary
  console.log('📊 Test Summary Complete\n');
  console.log('Next steps:');
  console.log('1. Verify program data against official sources');
  console.log('2. Add more funding sources (CDAP, SDTC, provincial programs)');
  console.log('3. Implement HTML parsing for dynamic scraping');
  console.log('4. Set up scheduled scraper jobs');
  console.log('5. Integrate with recommendation engine tags\n');
};

// Export for use in recommendation engine
export const getRecommendationFundingTags = async (
  focusAreas: string[]
): Promise<Array<{
  name: string;
  agency: string;
  url: string;
  amount: string;
  jurisdiction: string;
}>> => {
  const programs = await getFundingForFocusAreas(focusAreas, {
    status: 'Open',
    limit: 3,
  });
  
  return programs.map(p => ({
    name: p.program_name,
    agency: p.agency,
    url: p.url,
    amount: p.funding_amount_min && p.funding_amount_max
      ? `$${(p.funding_amount_min / 1000).toFixed(0)}K - $${(p.funding_amount_max / 1000).toFixed(0)}K`
      : 'Varies',
    jurisdiction: p.jurisdiction,
  }));
};
