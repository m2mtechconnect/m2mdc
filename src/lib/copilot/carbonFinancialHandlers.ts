/**
 * CoPilot Response Handlers for Carbon & Financial Engines
 * Provides domain-aware responses for carbon and financial queries
 */

import { CarbonEngine, REGIONAL_CARBON_INTENSITY, type RegionCode } from '@/engines/carbon';
import { FinancialEngine, DEFAULT_FINANCIAL_ASSUMPTIONS } from '@/engines/financial';
import type { CoPilotContext } from './contextBuilder';

export interface CarbonFinancialResponse {
  type: 'text' | 'navigation' | 'simulation' | 'comparison';
  content: string;
  data?: Record<string, any>;
  navigationTarget?: string;
  simulationId?: string;
}

/**
 * Detect if query is carbon or financial related
 */
export function detectCarbonFinancialIntent(query: string): 'carbon' | 'financial' | 'both' | null {
  const lowerQuery = query.toLowerCase();
  
  const carbonKeywords = [
    'carbon', 'emissions', 'co2', 'renewable', 'sustainability',
    'green', 'environment', 'intensity', 'offset', 'footprint'
  ];
  
  const financialKeywords = [
    'cost', 'price', 'gpu-hour', 'gpuhour', 'opex', 'roi', 'npv', 'irr',
    'expense', 'budget', 'savings', 'financial', 'money', 'dollar', 'payback'
  ];
  
  const hasCarbonKeywords = carbonKeywords.some(k => lowerQuery.includes(k));
  const hasFinancialKeywords = financialKeywords.some(k => lowerQuery.includes(k));
  
  if (hasCarbonKeywords && hasFinancialKeywords) return 'both';
  if (hasCarbonKeywords) return 'carbon';
  if (hasFinancialKeywords) return 'financial';
  return null;
}

/**
 * Generate carbon-related response
 */
export function handleCarbonQuery(query: string, context: CoPilotContext): CarbonFinancialResponse {
  const lowerQuery = query.toLowerCase();
  const carbonContext = context.carbonContext;
  
  // Current emissions query
  if (lowerQuery.includes('current') && (lowerQuery.includes('emission') || lowerQuery.includes('carbon'))) {
    if (carbonContext) {
      return {
        type: 'text',
        content: `**Current Carbon Metrics:**\n\n` +
          `• **Daily Emissions:** ${carbonContext.dailyEmissionsKg.toFixed(0)} kg CO₂\n` +
          `• **Projected Annual:** ${carbonContext.projectedAnnualEmissionsTons.toFixed(0)} tons CO₂\n` +
          `• **Carbon per GPU-hour:** ${carbonContext.carbonPerGpuHour.toFixed(1)} g CO₂\n` +
          `• **Carbon Efficiency Score:** ${carbonContext.carbonEfficiencyScore.toFixed(0)}/100\n` +
          `• **Renewable Mix:** ${carbonContext.renewablePercent}%\n` +
          `• **Region:** ${carbonContext.region} (${carbonContext.regionCarbonIntensity} gCO₂/kWh)`,
        data: carbonContext,
      };
    }
    return {
      type: 'navigation',
      content: 'Carbon metrics are available on the Financial tab. Would you like me to open it?',
      navigationTarget: '/data-centre-twin?view=financial',
    };
  }
  
  // Region comparison
  if (lowerQuery.includes('compare') && (lowerQuery.includes('region') || lowerQuery.includes('qc') || lowerQuery.includes('ab'))) {
    const regions = Object.entries(REGIONAL_CARBON_INTENSITY).map(([code, data]) => ({
      code,
      intensity: data.carbonIntensityGPerKwh,
      renewable: data.renewablePercentage,
    }));
    
    const comparisonText = regions.map(r => 
      `• **${r.code}:** ${r.intensity} gCO₂/kWh (${r.renewable}% renewable)`
    ).join('\n');
    
    return {
      type: 'comparison',
      content: `**Regional Carbon Intensity Comparison:**\n\n${comparisonText}\n\n` +
        `*Quebec (CA-QC) has the lowest carbon intensity due to hydroelectric dominance. ` +
        `Alberta (CA-AB) has the highest due to natural gas reliance.*`,
      data: { regions },
    };
  }
  
  // Carbon price simulation
  if (lowerQuery.includes('simulate') && lowerQuery.includes('carbon') && lowerQuery.includes('price')) {
    return {
      type: 'simulation',
      content: 'I can run a carbon price shock simulation to show the financial impact. ' +
        'This will simulate a 100% increase in carbon pricing and show the effect on your operating costs.',
      simulationId: 'carbon_price_shock',
    };
  }
  
  // Default carbon response
  return {
    type: 'navigation',
    content: 'For detailed carbon metrics and trends, check the Financial tab which includes carbon tracking.',
    navigationTarget: '/data-centre-twin?view=financial',
  };
}

/**
 * Generate financial-related response
 */
export function handleFinancialQuery(query: string, context: CoPilotContext): CarbonFinancialResponse {
  const lowerQuery = query.toLowerCase();
  const financialContext = context.financialContext;
  
  // Cost per GPU-hour query
  if (lowerQuery.includes('cost') && (lowerQuery.includes('gpu') || lowerQuery.includes('hour'))) {
    if (financialContext) {
      return {
        type: 'text',
        content: `**Cost per GPU-Hour Breakdown:**\n\n` +
          `• **Total Cost:** $${financialContext.costPerGpuHour.toFixed(2)}/GPU-hour\n` +
          `• **Daily OPEX:** $${financialContext.opexPerDay.toLocaleString()}\n` +
          `• **Annual OPEX:** $${financialContext.opexPerYear.toLocaleString()}\n` +
          `• **Carbon Cost Impact:** $${financialContext.carbonCostImpactPerYear.toLocaleString()}/year ` +
          `(${financialContext.carbonCostPctOfOpex.toFixed(1)}% of OPEX)\n\n` +
          `*This includes electricity, cooling, and carbon costs.*`,
        data: financialContext,
      };
    }
    return {
      type: 'navigation',
      content: 'Financial metrics are available on the Financial tab.',
      navigationTarget: '/data-centre-twin?view=financial',
    };
  }
  
  // ROI query
  if (lowerQuery.includes('roi') || lowerQuery.includes('return on investment') || lowerQuery.includes('payback')) {
    if (financialContext) {
      const roiStatus = financialContext.roiYears <= 5 ? '✅ Excellent' : 
                        financialContext.roiYears <= 8 ? '⚠️ Acceptable' : '❌ Needs Improvement';
      return {
        type: 'text',
        content: `**ROI Analysis:**\n\n` +
          `• **ROI Timeline:** ${financialContext.roiYears.toFixed(1)} years ${roiStatus}\n` +
          `• **NPV:** $${financialContext.npv.toLocaleString()}\n` +
          `• **IRR:** ${(financialContext.irr * 100).toFixed(1)}%\n` +
          `• **Financial Health Score:** ${financialContext.financialHealthScore.toFixed(0)}/100\n\n` +
          `*Target: ROI under 5 years for optimal investment returns.*`,
        data: financialContext,
      };
    }
  }
  
  // Carbon tax impact query
  if ((lowerQuery.includes('carbon') && lowerQuery.includes('tax')) || 
      (lowerQuery.includes('carbon') && lowerQuery.includes('double'))) {
    return {
      type: 'simulation',
      content: 'I can simulate a carbon tax increase scenario. This will show how a doubling of carbon price ' +
        'would affect your operating costs and financial metrics.',
      simulationId: 'carbon_price_shock',
    };
  }
  
  // Financial health explanation
  if (lowerQuery.includes('financial health') && lowerQuery.includes('low')) {
    return {
      type: 'text',
      content: `**Why Financial Health Score May Be Low:**\n\n` +
        `1. **High Carbon Costs:** Operating in a carbon-intensive region increases OPEX\n` +
        `2. **Suboptimal PUE:** Power Usage Effectiveness above 1.4 wastes electricity\n` +
        `3. **Long ROI:** Investment payback exceeding 5 years signals inefficiency\n` +
        `4. **Negative NPV:** Project may not generate positive returns\n\n` +
        `**Recommendations:**\n` +
        `• Consider migrating workloads to low-carbon regions (Quebec, Nordic)\n` +
        `• Optimize cooling efficiency to reduce PUE\n` +
        `• Increase GPU utilization to improve cost per GPU-hour`,
    };
  }
  
  // Default financial response
  return {
    type: 'navigation',
    content: 'View detailed financial metrics including OPEX, ROI, and cost analysis on the Financial tab.',
    navigationTarget: '/data-centre-twin?view=financial',
  };
}

/**
 * Generate combined carbon + financial response
 */
export function handleCombinedQuery(query: string, context: CoPilotContext): CarbonFinancialResponse {
  const carbonContext = context.carbonContext;
  const financialContext = context.financialContext;
  
  if (carbonContext && financialContext) {
    return {
      type: 'text',
      content: `**Carbon & Financial Overview:**\n\n` +
        `**Carbon Metrics:**\n` +
        `• Carbon per GPU-hour: ${carbonContext.carbonPerGpuHour.toFixed(1)} g CO₂\n` +
        `• Annual Emissions: ${carbonContext.projectedAnnualEmissionsTons.toFixed(0)} tons\n` +
        `• Efficiency Score: ${carbonContext.carbonEfficiencyScore.toFixed(0)}/100\n\n` +
        `**Financial Metrics:**\n` +
        `• Cost per GPU-hour: $${financialContext.costPerGpuHour.toFixed(2)}\n` +
        `• Annual OPEX: $${financialContext.opexPerYear.toLocaleString()}\n` +
        `• Carbon Cost: ${financialContext.carbonCostPctOfOpex.toFixed(1)}% of OPEX\n` +
        `• Financial Health: ${financialContext.financialHealthScore.toFixed(0)}/100`,
      data: { carbon: carbonContext, financial: financialContext },
    };
  }
  
  return {
    type: 'navigation',
    content: 'View combined carbon and financial metrics on the Financial tab.',
    navigationTarget: '/data-centre-twin?view=financial',
  };
}

/**
 * Main handler for carbon/financial queries
 */
export function handleCarbonFinancialQuery(
  query: string, 
  context: CoPilotContext
): CarbonFinancialResponse | null {
  const intent = detectCarbonFinancialIntent(query);
  
  if (!intent) return null;
  
  switch (intent) {
    case 'carbon':
      return handleCarbonQuery(query, context);
    case 'financial':
      return handleFinancialQuery(query, context);
    case 'both':
      return handleCombinedQuery(query, context);
    default:
      return null;
  }
}

/**
 * Get suggested navigation responses
 */
export function getCarbonFinancialNavigationSuggestions(): Array<{query: string; response: string; target: string}> {
  return [
    {
      query: 'Open the Financial tab',
      response: 'Opening the Financial & Carbon tab...',
      target: '/data-centre-twin?view=financial',
    },
    {
      query: 'Open the Carbon metrics dashboard',
      response: 'The carbon metrics are displayed on the Financial tab. Opening now...',
      target: '/data-centre-twin?view=financial',
    },
    {
      query: 'Run the Carbon Price Shock simulation',
      response: 'Starting carbon price shock simulation...',
      target: '/data-centre-twin?view=simulation&scenarioId=carbon_price_shock',
    },
  ];
}
