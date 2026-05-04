/**
 * Grid Carbon Intensity Reference Map
 *
 * Source: IEA "Electricity Information 2024" + electricityMap CO2 signal API
 * (https://www.electricitymaps.com/methodology). Values are typical annual
 * averages of operational carbon intensity, expressed in gCO2eq per kWh.
 *
 * These constants are used as the baseline "Latest" value for the Carbon
 * Intensity KPI when no live grid feed is connected. When a grid API is
 * wired in, replace these with the latest signal at facility region grain.
 */

export interface GridCarbonRef {
  region: string;
  label: string;
  /** gCO2eq / kWh */
  intensity: number;
  source: string;
}

export const GRID_CARBON_REFERENCE: Record<string, GridCarbonRef> = {
  'qc': {
    region: 'qc',
    label: 'QC Grid',
    intensity: 1.5, // Hydro-Quebec, ~99% hydro
    source: 'Hydro-Quebec / IEA 2024',
  },
  'on': {
    region: 'on',
    label: 'ON Grid',
    intensity: 30, // IESO Ontario, mostly nuclear + hydro
    source: 'IESO / IEA 2024',
  },
  'bc': {
    region: 'bc',
    label: 'BC Grid',
    intensity: 12,
    source: 'BC Hydro / IEA 2024',
  },
  'ab': {
    region: 'ab',
    label: 'AB Grid',
    intensity: 510, // Alberta, fossil-heavy
    source: 'AESO / IEA 2024',
  },
  'all': {
    region: 'all',
    label: 'All regions',
    intensity: 32, // weighted Canadian average
    source: 'IEA 2024',
  },
};

/**
 * Threshold band for Carbon Intensity status pill.
 * Aligned with Green Software Foundation SCI categories.
 */
export const CARBON_INTENSITY_TARGET = 50; // gCO2/kWh, "low carbon"
export const CARBON_INTENSITY_WARNING = 200; // amber above this

export function getGridCarbon(regionKey: string | undefined): GridCarbonRef {
  if (!regionKey) return GRID_CARBON_REFERENCE.all;
  return GRID_CARBON_REFERENCE[regionKey] ?? GRID_CARBON_REFERENCE.all;
}