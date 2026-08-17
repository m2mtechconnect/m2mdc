/**
 * Digital Twin Templates for Industry × Department Combinations
 * Defines blueprints for 20 industries × 12 departments = 240 combinations
 */

import { getAllowedTwinTypes, getBlockedTwinTypes, type Industry } from './industryClassifier';
import type { Department } from './departmentClassifier';

export interface TwinTemplate {
  industry: Industry;
  department: Department;
  processDescription: string;
  eventTriggers: string[];
  dataSources: string[];
  kpis: string[];
  humanInLoop: string[];
  integrationPoints: string[];
  /**
   * Twin types this industry may run, and the ones it must not. The industry
   * classifier owns this vocabulary; templates carry it so a caller holding a
   * template can gate twin creation without re-deriving it from the industry.
   */
  allowedTwinTypes: string[];
  blockedTwinTypes: string[];
}

/**
 * Base templates that can be inherited and customized
 */
const baseTemplates: Record<string, Partial<TwinTemplateCore>> = {
  supplyChain: {
    processDescription: 'Supply chain planning, inventory optimization, and demand forecasting',
    eventTriggers: ['Low stock alert', 'New forecast run', 'Supplier delay', 'Demand spike'],
    dataSources: ['ERP', 'WMS', 'POS', 'TMS'],
    kpis: ['Inventory turnover', 'Stockout rate', 'Forecast accuracy', 'Order fill rate'],
    humanInLoop: ['Planner approval', 'Exception handling', 'Supplier negotiations'],
    integrationPoints: ['SAP', 'Oracle', 'Manhattan', 'Blue Yonder'],
  },
  operations: {
    processDescription: 'Operational workflow optimization and process automation',
    eventTriggers: ['Task assignment', 'Process bottleneck', 'Quality issue', 'Capacity change'],
    dataSources: ['ERP', 'MES', 'IoT sensors', 'HRIS'],
    kpis: ['OEE', 'Throughput', 'Cycle time', 'Utilization rate'],
    humanInLoop: ['Manager approval', 'Quality checks', 'Exception resolution'],
    integrationPoints: ['ERP systems', 'MES platforms', 'IoT hubs'],
  },
  workforce: {
    processDescription: 'Workforce scheduling, task optimization, and performance management',
    eventTriggers: ['Shift start', 'Absence', 'Demand surge', 'Skill mismatch'],
    dataSources: ['HRIS', 'Time tracking', 'POS', 'Task management'],
    kpis: ['Labor efficiency', 'Schedule adherence', 'Overtime hours', 'Employee satisfaction'],
    humanInLoop: ['Manager approval', 'Employee self-service', 'Schedule adjustments'],
    integrationPoints: ['Workday', 'ADP', 'UKG', 'Kronos'],
  },
  logistics: {
    processDescription: 'Fleet management, route optimization, and last-mile delivery',
    eventTriggers: ['Order placement', 'Route start', 'Delay alert', 'Delivery completion'],
    dataSources: ['TMS', 'GPS/Telematics', 'WMS', 'Order management'],
    kpis: ['On-time delivery', 'Cost per mile', 'Fuel efficiency', 'Vehicle utilization'],
    humanInLoop: ['Dispatcher approval', 'Driver check-in', 'Exception handling'],
    integrationPoints: ['TMS platforms', 'Telematics systems', 'Route optimization'],
  },
};

/**
 * Get template for a specific industry-department combination.
 *
 * Every return path is completed with the industry's allowed and blocked twin
 * types, so the field is guaranteed present regardless of which branch matched.
 */
export function getTwinTemplate(industry: Industry, department: Department): TwinTemplate {
  return {
    ...buildTwinTemplate(industry, department),
    allowedTwinTypes: getAllowedTwinTypes(industry),
    blockedTwinTypes: getBlockedTwinTypes(industry),
  };
}

type TwinTemplateCore = Omit<TwinTemplate, 'allowedTwinTypes' | 'blockedTwinTypes'>;

function buildTwinTemplate(industry: Industry, department: Department): TwinTemplateCore {
  const key = `${industry}::${department}`;
  
  // Retail + Supply Chain
  if ((industry === 'Enterprise Retail' || industry === 'Fashion / Apparel Retail' || industry === 'Grocery & Food Retail') && department === 'Supply Chain') {
    return {
      industry,
      department,
      processDescription: 'Multi-echelon supply chain with predictive replenishment, SKU-level forecasting, and DC routing',
      eventTriggers: ['Low stock alert', 'New forecast run', 'Inbound shipment', 'Demand spike', 'Seasonal shift'],
      dataSources: ['POS', 'WMS', 'ERP', 'TMS', 'External demand signals'],
      kpis: ['Stockout reduction %', 'Inventory turns', 'Forecast accuracy', 'DC throughput', 'Cost per unit'],
      humanInLoop: ['Planner approval for large orders', 'Exception handling', 'Supplier negotiations'],
      integrationPoints: ['SAP', 'Oracle', 'Manhattan', 'Blue Yonder', 'JDA'],
    };
  }

  // Retail + Operations
  if ((industry === 'Enterprise Retail' || industry === 'Fashion / Apparel Retail') && department === 'Operations') {
    return {
      industry,
      department,
      processDescription: 'Store operations twin with task orchestration, shelf scanning, checkout optimization, and robotics integration',
      eventTriggers: ['Store opening', 'Peak traffic', 'Shelf empty alert', 'Task completion', 'Customer queue'],
      dataSources: ['POS', 'IoT sensors', 'Shelf cameras', 'Task management', 'HRIS'],
      kpis: ['Task completion rate', 'Shelf availability', 'Checkout wait time', 'Labor efficiency', 'Customer satisfaction'],
      humanInLoop: ['Store manager approval', 'Task prioritization', 'Exception handling'],
      integrationPoints: ['Workday', 'Zebra', 'NCR', 'Task management systems'],
    };
  }

  // Retail + Logistics
  if (industry === 'Enterprise Retail' && department === 'Logistics / Fleet') {
    return {
      industry,
      department,
      processDescription: 'Last-mile delivery optimization with route planning, driver assignment, and real-time tracking',
      eventTriggers: ['Order ready', 'Route start', 'Traffic alert', 'Delivery attempt', 'Return initiated'],
      dataSources: ['TMS', 'GPS', 'Order management', 'Traffic APIs', 'Weather'],
      kpis: ['On-time delivery %', 'Cost per delivery', 'Packages per route', 'Driver utilization', 'Customer rating'],
      humanInLoop: ['Dispatcher approval', 'Driver check-in', 'Failed delivery handling'],
      integrationPoints: ['Last-mile platforms', 'Route optimization', 'Telematics'],
    };
  }

  // Manufacturing + Operations/Production
  if ((industry === 'Manufacturing – Automotive' || industry === 'Manufacturing – Industrial' || industry === 'Manufacturing – Consumer Goods') && (department === 'Operations' || department === 'Manufacturing / Production')) {
    return {
      industry,
      department,
      processDescription: 'Factory digital twin with production scheduling, predictive maintenance, quality control, and throughput optimization',
      eventTriggers: ['Production start', 'Machine failure', 'Quality defect', 'Material shortage', 'Shift change'],
      dataSources: ['MES', 'SCADA', 'IoT sensors', 'ERP', 'Quality systems'],
      kpis: ['OEE', 'Downtime %', 'First-pass yield', 'Cycle time', 'Scrap rate'],
      humanInLoop: ['Supervisor approval', 'Maintenance scheduling', 'Quality inspection', 'Production adjustments'],
      integrationPoints: ['Siemens', 'Rockwell', 'GE Digital', 'SAP MES'],
    };
  }

  // Pharma + Compliance
  if (industry === 'Pharmaceuticals & Life Sciences' && department === 'Compliance / Risk') {
    return {
      industry,
      department,
      processDescription: 'GxP validation twin with batch traceability, deviation management, and regulatory compliance tracking',
      eventTriggers: ['Batch start', 'Deviation detected', 'Audit scheduled', 'Regulatory change', 'CAPA initiated'],
      dataSources: ['QMS', 'ERP', 'LIMS', 'Document management', 'Regulatory databases'],
      kpis: ['Compliance rate', 'Deviation count', 'CAPA closure time', 'Audit findings', 'Batch release time'],
      humanInLoop: ['QA approval', 'Deviation review', 'Regulatory filing', 'Management review'],
      integrationPoints: ['Veeva', 'MasterControl', 'TrackWise', 'SAP'],
    };
  }

  // Finance/Banking + Finance
  if ((industry === 'Financial Services / Banking' || industry === 'Insurance') && department === 'Finance') {
    return {
      industry,
      department,
      processDescription: 'Credit risk decisioning twin with underwriting automation, fraud detection, and portfolio monitoring',
      eventTriggers: ['Loan application', 'Payment received', 'Risk threshold breach', 'Fraud alert', 'Portfolio review'],
      dataSources: ['Core banking', 'Credit bureaus', 'Transaction data', 'Market data', 'Fraud signals'],
      kpis: ['Approval rate', 'Default rate', 'Processing time', 'Fraud detection rate', 'Portfolio NPL %'],
      humanInLoop: ['Underwriter approval', 'Exception review', 'Fraud investigation', 'Policy override'],
      integrationPoints: ['Fiserv', 'FIS', 'FICO', 'Experian', 'TransUnion'],
    };
  }

  // Logistics/3PL + Logistics
  if (industry === 'Logistics / Supply Chain / 3PL' && (department === 'Logistics / Fleet' || department === 'Operations')) {
    return {
      industry,
      department,
      processDescription: 'Fleet and freight management twin with route optimization, load matching, and carrier selection',
      eventTriggers: ['Shipment booked', 'Carrier assigned', 'Route start', 'Delay detected', 'Delivery complete'],
      dataSources: ['TMS', 'GPS/Telematics', 'WMS', 'Carrier networks', 'Weather/Traffic'],
      kpis: ['On-time pickup %', 'On-time delivery %', 'Cost per mile', 'Load factor', 'Carrier performance'],
      humanInLoop: ['Dispatcher approval', 'Exception handling', 'Carrier negotiations', 'Customer communications'],
      integrationPoints: ['Oracle TMS', 'Manhattan', 'Blue Yonder', 'Telematics platforms'],
    };
  }

  // Healthcare + Operations
  if (industry === 'Healthcare / Hospitals' && department === 'Operations') {
    return {
      industry,
      department,
      processDescription: 'Patient flow twin with bed management, surgical scheduling, staffing optimization, and emergency response',
      eventTriggers: ['Patient admission', 'Bed availability', 'Surgery scheduled', 'Emergency arrival', 'Discharge ready'],
      dataSources: ['EHR', 'ADT feeds', 'Staffing systems', 'OR scheduling', 'Supply chain'],
      kpis: ['Bed utilization', 'Wait times', 'Length of stay', 'Staff-to-patient ratio', 'Patient satisfaction'],
      humanInLoop: ['Charge nurse approval', 'Physician scheduling', 'Discharge planning', 'Emergency triage'],
      integrationPoints: ['Epic', 'Cerner', 'Meditech', 'Workday'],
    };
  }

  // Energy/Utilities + Operations
  if (industry === 'Energy / Utilities' && department === 'Operations') {
    return {
      industry,
      department,
      processDescription: 'Grid management twin with demand forecasting, outage response, renewable integration, and asset maintenance',
      eventTriggers: ['Demand spike', 'Outage detected', 'Renewable fluctuation', 'Maintenance due', 'Peak pricing'],
      dataSources: ['SCADA', 'Smart meters', 'Weather', 'Asset management', 'Market data'],
      kpis: ['Grid reliability', 'Outage duration', 'Renewable penetration', 'Peak demand', 'Asset availability'],
      humanInLoop: ['Control room operator', 'Maintenance scheduling', 'Emergency response', 'Load balancing'],
      integrationPoints: ['OSIsoft PI', 'GE Grid Solutions', 'Schneider Electric', 'Siemens'],
    };
  }

  // Software/SaaS + IT/Engineering
  if (industry === 'Software / Enterprise SaaS' && department === 'IT / Engineering') {
    return {
      industry,
      department,
      processDescription: 'Engineering velocity twin with sprint planning, deployment automation, incident response, and technical debt management',
      eventTriggers: ['Sprint start', 'Code commit', 'Build failure', 'Incident detected', 'Release scheduled'],
      dataSources: ['Git', 'JIRA', 'CI/CD', 'Monitoring', 'PagerDuty'],
      kpis: ['Deployment frequency', 'Lead time', 'MTTR', 'Defect escape rate', 'Sprint velocity'],
      humanInLoop: ['Engineering manager approval', 'Incident commander', 'Release approval', 'Tech debt prioritization'],
      integrationPoints: ['GitHub', 'GitLab', 'Jenkins', 'Datadog', 'PagerDuty'],
    };
  }

  // Fallback: Generate from base templates
  if (department === 'Supply Chain') {
    return { industry, department, ...baseTemplates.supplyChain } as TwinTemplateCore;
  }
  if (department === 'Operations') {
    return { industry, department, ...baseTemplates.operations } as TwinTemplateCore;
  }
  if (department === 'HR / People / Workforce') {
    return { industry, department, ...baseTemplates.workforce } as TwinTemplateCore;
  }
  if (department === 'Logistics / Fleet') {
    return { industry, department, ...baseTemplates.logistics } as TwinTemplateCore;
  }

  // Default template
  return {
    industry,
    department,
    processDescription: `${department} optimization for ${industry}`,
    eventTriggers: ['Process trigger', 'Threshold breach', 'Manual initiation'],
    dataSources: ['ERP', 'Core systems', 'Transaction data'],
    kpis: ['Efficiency', 'Cost reduction', 'Accuracy', 'Throughput'],
    humanInLoop: ['Manager approval', 'Exception handling'],
    integrationPoints: ['Enterprise systems'],
  };
}

/**
 * Get all relevant templates for an industry
 */
export function getTemplatesForIndustry(industry: Industry): TwinTemplate[] {
  const departments: Department[] = [
    'Supply Chain',
    'Operations',
    'Procurement',
    'Finance',
    'HR / People / Workforce',
    'IT / Engineering',
    'Compliance / Risk',
    'Customer Service',
    'Sales',
    'Marketing',
    'Manufacturing / Production',
    'Logistics / Fleet',
  ];

  return departments.map(dept => getTwinTemplate(industry, dept));
}
