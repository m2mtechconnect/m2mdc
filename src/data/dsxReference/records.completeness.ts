import type { ReferenceDataClass, ReferenceRecord, SourceConsistency } from './types';

const REPO = 'https://github.com/NVIDIA-Omniverse-blueprints/omniverse-dsx-blueprint-for-ai-factories';
const COMMIT = 'd940314d0593bbba1bae51e40ae7f9fd48358e18';
const RETRIEVED_AT = '2026-08-17T02:44:43.424Z';
export const DSX_COMPLETE_DATASET_VERSION = '2.0.0-source-complete@d940314';

const CHECKSUMS: Record<string, string> = {
  'web/src/data/options.ts': '3c51421116da7c366dfc9e34ed29de03cbbdae5da50b3b6381ab24777c3bac80',
  'web/src/data/kpis.ts': 'c40c7f91e7ba8a3ff27121667d8372822601c6161e4f8c7971c1c81bbb342adc',
  'web/src/data/configs.ts': 'ee4ae99c177874631131628a6773079349e176a2ecca041cddeace3cb86001e9',
};

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface RecordInput {
  recordId: string;
  file: keyof typeof CHECKSUMS;
  path: string;
  dataClass: ReferenceDataClass;
  label: string;
  value: number | string | null;
  unit?: string | null;
  formula?: string | null;
  metricKey?: string | null;
  configId?: string | null;
  site?: string | null;
  compute?: string | null;
  power?: string | null;
  variant: string;
  consistency?: SourceConsistency;
  conflictGroup?: string | null;
  scope?: string | null;
  transformation?: string;
}

function record(input: RecordInput): ReferenceRecord {
  return {
    record_id: input.recordId,
    dataset_id: 'nvidia-dsx-blueprint',
    dataset_version: DSX_COMPLETE_DATASET_VERSION,
    publisher: 'NVIDIA Corporation',
    source_url: `${REPO}/blob/${COMMIT}/${input.file}`,
    source_repository: REPO,
    source_commit: COMMIT,
    source_file: input.file,
    source_record_path: input.path,
    source_checksum: CHECKSUMS[input.file],
    retrieved_at: RETRIEVED_AT,
    licence_status: 'APPROVED_AUTHENTICATED_DEMO',
    data_class: input.dataClass,
    operational_status: 'REFERENCE_ONLY',
    configuration_id: input.configId ?? null,
    site: input.site ?? null,
    compute_platform: input.compute ?? null,
    power_generation: input.power ?? null,
    metric_key: input.metricKey ?? slug(input.label),
    metric_label: input.label,
    formula: input.formula ?? null,
    original_value: input.value,
    normalized_value: input.value,
    unit: input.unit ?? null,
    transformation_record: input.transformation ?? 'verbatim normalized metadata; no engineering inference applied',
    validation_status: 'PARSED_CHECKSUM_VERIFIED',
    is_reference: true,
    is_measured: false,
    is_simulated: false,
    is_operational: false,
    source_variant: input.variant,
    source_consistency: input.consistency ?? 'UNIQUE',
    source_conflict_group: input.conflictGroup ?? null,
    source_scope: input.scope ?? null,
  };
}

const optionRecords: ReferenceRecord[] = [];
for (const [group, values] of Object.entries({
  gpu: ['NVIDIA GB300', 'NVIDIA GB200'],
  site: ['Virginia', 'New Mexico', 'Sweden'],
  power: ['Grid', 'Hybrid', 'On-Prem'],
})) {
  values.forEach((value, index) => {
    optionRecords.push(record({
      recordId: `option:${group}:${slug(value)}`,
      file: 'web/src/data/options.ts',
      path: `CONFIGURATOR_OPTIONS.${group}Options[${index}]`,
      dataClass: 'REFERENCE_OPTION',
      label: `${group} option: ${value}`,
      value,
      metricKey: `${group}_option`,
      variant: 'options.ts:configurator',
      scope: 'configurator-option',
    }));
  });
}

optionRecords.push(
  record({
    recordId: 'option:site-hierarchy:sweden',
    file: 'web/src/data/options.ts',
    path: 'SITE_OPTIONS["Sweden"]',
    dataClass: 'REFERENCE_OPTION',
    label: 'Site hierarchy: Sweden',
    value: JSON.stringify([]),
    variant: 'options.ts:site-hierarchy',
    scope: 'site-hierarchy',
  }),
  record({
    recordId: 'option:site-hierarchy:united-states',
    file: 'web/src/data/options.ts',
    path: 'SITE_OPTIONS["United States"]',
    dataClass: 'REFERENCE_OPTION',
    label: 'Site hierarchy: United States',
    value: JSON.stringify(['New Mexico', 'Virginia']),
    variant: 'options.ts:site-hierarchy',
    scope: 'site-hierarchy',
  }),
);

const simulationVariables = [
  ['thermal', 'Temperature', '25 °C', '45 °C'],
  ['thermal', 'Velocity', ' fps', ' fps'],
  ['thermal', 'Pressure', ' Pa', 'Pa'],
  ['electrical', 'Voltage', 'kV', 'kV'],
  ['electrical', 'Current', 'kA', 'kA'],
  ['electrical', 'P', 'MW', 'MW'],
  ['electrical', 'Q', 'MVAr', 'MVAr'],
  ['electrical', 'Power Factor', '%', '%'],
  ['electrical', 'THDi', '%', '%'],
  ['electrical', 'THDv', '%', '%'],
  ['electrical', 'Availability', '%', '%'],
] as const;

const simulationVariableRecords = simulationVariables.map(([category, name, start, end]) =>
  record({
    recordId: `simulation-variable:${category}:${slug(name)}`,
    file: 'web/src/data/options.ts',
    path: `SIMULATION_OPTIONS["${category}"].variables["${name}"]`,
    dataClass: 'REFERENCE_SIMULATION_VARIABLE',
    label: `${category} variable: ${name}`,
    value: JSON.stringify({ start, end }),
    metricKey: slug(name),
    variant: 'options.ts:simulation-variable',
    scope: category,
  }),
);

const kpiChartRecords = [
  ['Cost by Subcategory', 7401791000, '$', 97, 'COST'],
  ['Total Energy Use by Asset', 186, 'MWh', 99, 'POWER'],
] as const;

const chartRecords = kpiChartRecords.flatMap(([name, value, unit, score, icon], index) => [
  record({
    recordId: `kpi-chart:${slug(name)}`,
    file: 'web/src/data/kpis.ts',
    path: `KPI_CHARTS[${index}]`,
    dataClass: 'REFERENCE_KPI_VALUE',
    label: name,
    value,
    unit,
    variant: 'kpis.ts:global-chart',
    consistency: 'SCOPED_VARIANT',
    scope: 'global-chart',
  }),
  record({
    recordId: `kpi-chart-meta:${slug(name)}`,
    file: 'web/src/data/kpis.ts',
    path: `KPI_CHARTS[${index}].score`,
    dataClass: 'REFERENCE_KPI_METADATA',
    label: `${name} display metadata`,
    value: JSON.stringify({ score, icon }),
    variant: 'kpis.ts:global-chart-metadata',
    consistency: 'SCOPED_VARIANT',
    scope: 'global-chart',
  }),
]);

const gpuPresetData = [
  {
    gpu: 'NVIDIA GB300',
    kpis: [
      ['Token Efficiency', 'Total Facility Power / Tokens generated', 0.0003, 'kWh / token', 95],
      ['Power Usage Effectiveness (PUE)', 'Total Facility Power / IT Power', 1.2, 'ratio', 85],
      ['Water Usage Effectiveness (WUE)', 'Total Water usage / IT Power', 1.5, 'm³/MWh', 85],
      ['Carbon Usage Effectiveness (CUE)', 'Total Carbon Emissions / IT Power', 0.05, 'Kg/kWh', 65],
    ],
  },
  {
    gpu: 'NVIDIA GB200',
    kpis: [
      ['Token Efficiency', 'Total Facility Power / Tokens generated', 0.0003, 'kWh / token', 65],
      ['Power Usage Effectiveness (PUE)', 'Total Facility Power / IT Power', 1.2, 'ratio', 95],
      ['Water Usage Effectiveness (WUE)', 'Total Water usage / IT Power', 1.5, 'm³/MWh', 55],
      ['Carbon Usage Effectiveness (CUE)', 'Total Carbon Emissions / IT Power', 0.05, 'Kg/kWh', 75],
    ],
  },
] as const;

const gpuPresetRecords: ReferenceRecord[] = [];
gpuPresetData.forEach((entry, gpuIndex) => {
  entry.kpis.forEach(([name, formula, value, unit, score], kpiIndex) => {
    const key = slug(name);
    gpuPresetRecords.push(
      record({
        recordId: `gpu-preset:${slug(entry.gpu)}:${key}`,
        file: 'web/src/data/kpis.ts',
        path: `KPI_DATA[${gpuIndex}].kpis[${kpiIndex}]`,
        dataClass: 'REFERENCE_KPI_VALUE',
        label: name,
        value,
        unit,
        formula,
        compute: entry.gpu,
        variant: 'kpis.ts:gpu-preset',
        consistency: 'SCOPED_VARIANT',
        scope: 'gpu-preset',
      }),
      record({
        recordId: `gpu-preset-meta:${slug(entry.gpu)}:${key}`,
        file: 'web/src/data/kpis.ts',
        path: `KPI_DATA[${gpuIndex}].kpis[${kpiIndex}].score`,
        dataClass: 'REFERENCE_KPI_METADATA',
        label: `${entry.gpu} ${name} score`,
        value: score,
        compute: entry.gpu,
        variant: 'kpis.ts:gpu-preset-metadata',
        consistency: 'SCOPED_VARIANT',
        scope: 'gpu-preset',
      }),
    );
  });
});

const gpuSpecsKpis = {
  'NVIDIA GB300': [
    ['Configuration', '72 NVIDIA Blackwell Ultra GPUs, 36 NVIDIA Grace CPUs'],
    ['NVLink Bandwidth', '130 TB/s'],
    ['Fast Memory', '37 TB'],
    ['GPU Memory | Bandwidth', '20 TB | Up to 576 TB/s'],
    ['CPU Memory | Bandwidth', '17 TB LPDDR5X | 14 TB/s'],
    ['CPU Core Count', '2,592 Arm Neoverse V2 cores'],
    ['FP4 Tensor Core', '1440 | 1080² PFLOPS'],
    ['FP8/FP6 Tensor Core', '720 PFLOPS'],
    ['INT8 Tensor Core', '24 POPS'],
    ['FP16/BF Tensor Core', '360 PFLOPS'],
    ['TF32 Tensor Core', '180 PFLOPS'],
    ['FP32', '6 PFLOPS'],
    ['FP64 / FP64 Tensor Core', '100 TFLOPS'],
  ],
  'NVIDIA GB200': [
    ['Configuration', '36 Grace CPU : 72 Blackwell GPUs'],
    ['FP4 Tensor Core', '1,440 PFLOPS'],
    ['FP8/FP6 Tensor Core', '720 PFLOPS'],
    ['INT8 Tensor Core', '720 POPS'],
    ['FP16/BF16 Tensor Core', '360 PFLOPS'],
    ['TF32 Tensor Core', '180 PFLOPS'],
    ['FP32', '5,760 TFLOPS'],
    ['FP64', '2,880 TFLOPS'],
    ['FP64 Tensor Core', '2,880 TFLOPS'],
    ['GPU Memory | Bandwidth', 'Up to 13.4 TB HBM3e | 576 TB/s'],
    ['NVLink Bandwidth', '130 TB/s'],
    ['CPU Core Count', '2,592 Arm Neoverse V2 cores'],
    ['CPU Memory | Bandwidth', 'Up to 17 TB LPDDR5X | Up to 18.4 TB/s'],
  ],
} as const;

const gpuSpecsConfigs = {
  'NVIDIA GB300': [
    ['Configuration', '72 NVIDIA Blackwell Ultra GPUs, 36 NVIDIA Grace CPUs'],
    ['NVLink Bandwidth', '130 TB/s'],
    ['Fast Memory', '37 TB'],
    ['GPU Memory | Bandwidth', '20 TB | Up to 576 TB/s'],
    ['CPU Memory | Bandwidth', '17 TB LPDDR5X | 14 TB/s'],
    ['CPU Core Count', '2,592 Arm Neoverse V2 cores'],
    ['FP4 Tensor Core', '1440 | 1080² PFLOPS'],
    ['FP8/FP6 Tensor Core', '720 PFLOPS'],
    ['INT8 Tensor Core', '24 POPS'],
    ['FP16/BF Tensor Core', '360 PFLOPS'],
    ['TF32 Tensor Core', '180 PFLOPS'],
    ['FP32', '6 PFLOPS'],
    ['FP64 / FP64 Tensor Core', '100 TFLOPS'],
  ],
  'NVIDIA GB200': [
    ['Configuration', '48 NVIDIA Blackwell GPUs, 24 Grace CPUs'],
    ['NVLink Bandwidth', '80 TB/s'],
    ['Fast Memory', '24 TB'],
    ['GPU Memory | Bandwidth', '12 TB | Up to 420 TB/s'],
    ['CPU Memory | Bandwidth', '9 TB LPDDR5X | 9 TB/s'],
    ['CPU Core Count', '1,728 Arm Neoverse V2 cores'],
    ['FP4 Tensor Core', '1020 PFLOPS'],
    ['FP8/FP6 Tensor Core', '520 PFLOPS'],
    ['INT8 Tensor Core', '18 POPS'],
    ['FP16/BF Tensor Core', '250 PFLOPS'],
    ['TF32 Tensor Core', '125 PFLOPS'],
    ['FP32', '4 PFLOPS'],
    ['FP64 / FP64 Tensor Core', '80 TFLOPS'],
  ],
} as const;

const gpuSpecRecords: ReferenceRecord[] = [];
for (const [gpu, specs] of Object.entries(gpuSpecsKpis)) {
  specs.forEach(([name, description], index) => {
    gpuSpecRecords.push(record({
      recordId: `gpu-spec:kpis:${slug(gpu)}:${slug(name)}`,
      file: 'web/src/data/kpis.ts',
      path: `KPI_DATA[${gpu === 'NVIDIA GB300' ? 0 : 1}].specSets[0].specs[${index}]`,
      dataClass: 'REFERENCE_GPU_SPECIFICATION',
      label: name,
      value: description,
      compute: gpu,
      variant: 'kpis.ts:gpu-spec',
      consistency: gpu === 'NVIDIA GB300' ? 'DUPLICATE' : 'SOURCE_CONFLICT',
      conflictGroup: `gpu-spec:${slug(gpu)}:${slug(name)}`,
      scope: 'gpu-hardware',
    }));
  });
}
for (const [gpu, specs] of Object.entries(gpuSpecsConfigs)) {
  specs.forEach(([name, description], index) => {
    gpuSpecRecords.push(record({
      recordId: `gpu-spec:configs:${slug(gpu)}:${slug(name)}`,
      file: 'web/src/data/configs.ts',
      path: `${gpu === 'NVIDIA GB300' ? 'GPU_GB300' : 'GPU_GB200'}.specs[${index}]`,
      dataClass: 'REFERENCE_GPU_SPECIFICATION',
      label: name,
      value: description,
      compute: gpu,
      variant: 'configs.ts:gpu-spec',
      consistency: gpu === 'NVIDIA GB300' ? 'DUPLICATE' : 'SOURCE_CONFLICT',
      conflictGroup: `gpu-spec:${slug(gpu)}:${slug(name)}`,
      scope: 'gpu-hardware',
    }));
  });
}

const genericBuilding = [
  ['Building Height', '22m'],
  ['Building Perimeter', '280m'],
  ['Floor Area', '12,000m²'],
  ['Footprint Area', '6,000m²'],
  ['Roof Area', '6,200m²'],
  ['Cladding Area', '8,000m²'],
  ['Building Volume', '150,000m³'],
  ['Rack Conditioning Area', '4,500m²'],
  ['Compute to Leaf', '0.3ms'],
  ['Leaf to Core', '0.6ms'],
] as const;

const siteBuildings = {
  Virginia: genericBuilding,
  'New Mexico': [
    ['Building Height', '20m'], ['Building Perimeter', '240m'], ['Floor Area', '10,500m²'],
    ['Footprint Area', '5,300m²'], ['Roof Area', '5,400m²'], ['Cladding Area', '7,200m²'],
    ['Building Volume', '120,000m³'], ['Rack Conditioning Area', '3,900m²'],
    ['Compute to Leaf', '0.28ms'], ['Leaf to Core', '0.55ms'],
  ],
  Sweden: [
    ['Building Height', '18m'], ['Building Perimeter', '220m'], ['Floor Area', '9,800m²'],
    ['Footprint Area', '4,700m²'], ['Roof Area', '4,900m²'], ['Cladding Area', '6,500m²'],
    ['Building Volume', '100,000m³'], ['Rack Conditioning Area', '3,400m²'],
    ['Compute to Leaf', '0.32ms'], ['Leaf to Core', '0.58ms'],
  ],
} as const;

const buildingRecords: ReferenceRecord[] = [];
(['NVIDIA GB300', 'NVIDIA GB200'] as const).forEach((gpu, gpuIndex) => {
  genericBuilding.forEach(([name, description], index) => {
    buildingRecords.push(record({
      recordId: `building-spec:kpis:${slug(gpu)}:${slug(name)}`,
      file: 'web/src/data/kpis.ts',
      path: `KPI_DATA[${gpuIndex}].specSets[1].specs[${index}]`,
      dataClass: 'REFERENCE_BUILDING_SPECIFICATION',
      label: name,
      value: description,
      compute: gpu,
      variant: 'kpis.ts:gpu-scoped-building',
      consistency: 'SCOPED_VARIANT',
      conflictGroup: `building-spec:${slug(name)}`,
      scope: `gpu:${slug(gpu)}`,
    }));
  });
});
for (const [site, specs] of Object.entries(siteBuildings)) {
  specs.forEach(([name, description], index) => {
    buildingRecords.push(record({
      recordId: `building-spec:configs:${slug(site)}:${slug(name)}`,
      file: 'web/src/data/configs.ts',
      path: `BUILDING_${slug(site).replace(/-/g, '_').toUpperCase()}.specs[${index}]`,
      dataClass: 'REFERENCE_BUILDING_SPECIFICATION',
      label: name,
      value: description,
      site,
      variant: 'configs.ts:site-building',
      consistency: 'SCOPED_VARIANT',
      conflictGroup: `building-spec:${slug(name)}`,
      scope: `site:${slug(site)}`,
    }));
  });
}

const configSiteSpecs = {
  Virginia: [
    ['Power Capacity', '1-gigawatt (GW) capacity. Dedicated, on-site electrical substation with direct, high-voltage connection to the grid.'],
    ['Land Area', '1,200 acres.'],
    ['Water Supply', 'Site has a reliable water source from city water system.'],
    ['Building Size', '2,000,000 sq ft.'],
    ['Internal Architecture', '800V DC power distribution and new Open Compute Project (OCP) standards for power and cooling.'],
    ['Permits', 'The location is already zoned for industrial use.'],
    ['Connectivity', 'The site has access to high-speed, high-capacity fiber optic network infrastructure for the necessary data transmission needs.'],
  ],
  'New Mexico': [
    ['Power Capacity', '800 MW capacity with on-site solar farm and grid tie-in via dedicated substation.'],
    ['Land Area', '1,500 acres.'],
    ['Water Supply', 'Reclaimed water supply with on-site treatment and closed-loop cooling to minimize consumption in arid climate.'],
    ['Building Size', '1,500,000 sq ft.'],
    ['Internal Architecture', '400V/800V mixed DC distribution and liquid cooling loops.'],
    ['Permits', 'Zoned for industrial; environmental approvals in place.'],
    ['Connectivity', 'Multiple Tier-1 fiber providers with diverse path entries.'],
  ],
  Sweden: [
    ['Power Capacity', '600 MW capacity with high renewable penetration from the Nordic grid (hydro and wind).'],
    ['Land Area', '700 acres.'],
    ['Water Supply', 'Municipal water with conservation measures; cold climate reduces cooling water demand.'],
    ['Building Size', '1,200,000 sq ft.'],
    ['Internal Architecture', 'OCP-compliant racks with rear-door heat exchangers optimized for free-air cooling.'],
    ['Permits', 'Industrial zoning and EU environmental compliance.'],
    ['Connectivity', 'Direct backhaul to major European IXPs; dual diverse fiber paths.'],
  ],
} as const;

const siteVariantRecords: ReferenceRecord[] = [];
for (const [site, specs] of Object.entries(configSiteSpecs)) {
  specs.forEach(([name, description], index) => {
    const consistency: SourceConsistency = site === 'Virginia' ? 'DUPLICATE' : 'SOURCE_CONFLICT';
    siteVariantRecords.push(record({
      recordId: `site-spec:configs:${slug(site)}:${slug(name)}`,
      file: 'web/src/data/configs.ts',
      path: `SITE_${slug(site).replace(/-/g, '_').toUpperCase()}.specs[${index}]`,
      dataClass: 'REFERENCE_SITE_SPECIFICATION_VARIANT',
      label: name,
      value: description,
      site,
      variant: 'configs.ts:site-spec',
      consistency,
      conflictGroup: `site-spec:${slug(site)}:${slug(name)}`,
      scope: `site:${slug(site)}`,
    }));
  });
}

const configMeta = [
  ['Virginia / GB300', 95, [85, 152, 5], 85, [65, 152, 5], 99, 97],
  ['Virginia / GB200', 90, [83, 152, 5], 83, [63, 152, 5], 97, 95],
  ['New Mexico / GB300', 93, [88, 96, 12], 90, [72, 96, 12], 98, 95],
  ['New Mexico / GB200', 89, [86, 96, 12], 88, [70, 96, 12], 96, 93],
  ['Sweden / GB300', 96, [92, 201, 8], 92, [80, 201, 8], 97, 94],
  ['Sweden / GB200', 92, [90, 201, 8], 90, [78, 201, 8], 95, 92],
] as const;
const configKpiNames = [
  'Token Efficiency',
  'Power Usage Effectiveness (PUE)',
  'Water Usage Effectiveness (WUE)',
  'Carbon Usage Effectiveness (CUE)',
  'Total Energy Use by Asset',
  'Cost by Subcategory',
] as const;

const configMetadataRecords: ReferenceRecord[] = [];
configMeta.forEach(([config, tokenScore, pueMeta, wueScore, cueMeta, energyScore, costScore], configIndex) => {
  const metadata = [
    { score: tokenScore },
    { score: pueMeta[0], day: pueMeta[1], hour: pueMeta[2] },
    { score: wueScore },
    { score: cueMeta[0], day: cueMeta[1], hour: cueMeta[2] },
    { score: energyScore },
    { score: costScore },
  ];
  metadata.forEach((meta, kpiIndex) => {
    const [site, gpuShort] = config.split(' / ');
    configMetadataRecords.push(record({
      recordId: `config-kpi-meta:${slug(config)}:${slug(configKpiNames[kpiIndex])}`,
      file: 'web/src/data/configs.ts',
      path: `CONFIGS_DATA[${configIndex}].kpis[${kpiIndex}]`,
      dataClass: 'REFERENCE_KPI_METADATA',
      label: `${configKpiNames[kpiIndex]} display metadata`,
      value: JSON.stringify(meta),
      configId: slug(config),
      site,
      compute: `NVIDIA ${gpuShort}`,
      variant: 'configs.ts:kpi-metadata',
      consistency: 'UNIQUE',
      scope: `configuration:${slug(config)}`,
    }));
  });
});

export const DSX_COMPLETENESS_RECORDS: readonly ReferenceRecord[] = [
  ...optionRecords,
  ...simulationVariableRecords,
  ...chartRecords,
  ...gpuPresetRecords,
  ...gpuSpecRecords,
  ...buildingRecords,
  ...siteVariantRecords,
  ...configMetadataRecords,
].sort((a, b) => a.record_id.localeCompare(b.record_id));
