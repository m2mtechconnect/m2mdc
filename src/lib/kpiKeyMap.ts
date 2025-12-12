/**
 * Centralized KPI Key Mapping Utility
 * Single source of truth for KPI key normalization across the simulation engine,
 * visualization layer, and UI components.
 * 
 * This ensures consistent KPI identification regardless of which key format
 * is used by scenarios, engines, or display components.
 */

/**
 * Map of canonical KPI keys to their aliases.
 * The canonical key is the "preferred" form used internally.
 * All aliases are treated as equivalent to the canonical key.
 */
export const KPI_KEY_ALIASES: Record<string, string[]> = {
  // Power Usage Effectiveness
  pue: ['effectivePue', 'pue_value', 'powerUsageEffectiveness'],
  
  // GPU Utilization
  gpuUtilization: ['avgGpuUtilization', 'gpuUtil', 'gpu_utilization', 'avgGpuUtil'],
  
  // Thermal
  thermalStabilityScore: ['thermalScore', 'thermal_stability', 'thermalStability'],
  
  // Power
  powerReliabilityScore: ['powerScore', 'power_reliability', 'powerReliability'],
  
  // Carbon / Emissions
  carbonIntensity: ['co2PerKWh', 'carbonPerKwh', 'gCo2PerKwh', 'carbon_intensity'],
  gCo2PerGpuHour: ['carbonPerGpuHour', 'co2PerGpuHour'],
  
  // Sovereignty
  sovereignComplianceScore: ['sovereignScore', 'sovereignty', 'sovereigntyScore', 'sovereigntyIndex', 'sovereignCompute'],
  sovereigntyRiskScore: ['sovereignRisk', 'sovereignty_risk'],
  dataSovereigntyScore: ['dataSovereignty'],
  
  // Cooling
  coolingEfficiencyIndex: ['coolingEfficiency', 'cooling_efficiency', 'coolingScore'],
  
  // Network
  networkIntegrityScore: ['networkScore', 'network_integrity', 'networkIntegrity'],
  
  // Environmental / Emissions
  emissionsVsTarget: ['emissionsTarget', 'emissions_vs_target'],
  carbonNeutralProgress: ['carbonProgress', 'carbon_neutral_progress'],
  environmentalSafetyScore: ['environmentalScore', 'environmental_safety'],
  
  // UPS / Power
  avgUpsRuntime: ['upsRuntime', 'ups_runtime', 'avgUps'],
  
  // Economic
  economicEfficiencyScore: ['economicScore', 'economic_efficiency'],
  
  // Energy
  renewablePct: ['renewablePercent', 'renewable_pct', 'greenEnergyPct'],
};

// Build reverse lookup map for O(1) lookups
const aliasToCanonicalMap: Record<string, string> = {};

// Initialize the reverse map
Object.entries(KPI_KEY_ALIASES).forEach(([canonical, aliases]) => {
  // The canonical key maps to itself
  aliasToCanonicalMap[canonical.toLowerCase()] = canonical;
  
  // Each alias maps to the canonical key
  aliases.forEach(alias => {
    aliasToCanonicalMap[alias.toLowerCase()] = canonical;
  });
});

/**
 * Normalize a KPI key to its canonical form.
 * Case-insensitive, trims whitespace.
 * 
 * @param key - The KPI key to normalize
 * @returns The canonical key, or the original key if no mapping exists
 * 
 * @example
 * normalizeKpiKey('effectivePue') // Returns 'pue'
 * normalizeKpiKey('avgGpuUtilization') // Returns 'gpuUtilization'
 * normalizeKpiKey('unknownKey') // Returns 'unknownKey'
 */
export function normalizeKpiKey(key: string): string {
  if (!key) return key;
  
  const normalized = key.trim().toLowerCase();
  return aliasToCanonicalMap[normalized] || key;
}

/**
 * Check if two KPI keys are equivalent (same canonical form).
 * 
 * @param key1 - First KPI key
 * @param key2 - Second KPI key
 * @returns true if the keys normalize to the same canonical form
 */
export function areKpiKeysEquivalent(key1: string, key2: string): boolean {
  return normalizeKpiKey(key1) === normalizeKpiKey(key2);
}

/**
 * Get all aliases for a KPI key, including the canonical key itself.
 * 
 * @param key - Any KPI key (canonical or alias)
 * @returns Array of all equivalent keys (canonical + aliases), or just the key if no mapping
 */
export function expandKpiKey(key: string): string[] {
  const canonical = normalizeKpiKey(key);
  const aliases = KPI_KEY_ALIASES[canonical] || [];
  
  // Return canonical key first, then all aliases
  return [canonical, ...aliases];
}

/**
 * Get a KPI value from a record, checking all possible key aliases.
 * 
 * @param record - The KPI record to search
 * @param key - The KPI key to look up (any alias)
 * @param defaultValue - Value to return if not found
 * @returns The KPI value or defaultValue
 */
export function getKpiValue(
  record: Record<string, number> | undefined | null,
  key: string,
  defaultValue: number = 0
): number {
  if (!record) return defaultValue;
  
  // First try exact key
  if (key in record && record[key] !== undefined && !isNaN(record[key])) {
    return record[key];
  }
  
  // Normalize key and try canonical
  const canonical = normalizeKpiKey(key);
  if (canonical in record && record[canonical] !== undefined && !isNaN(record[canonical])) {
    return record[canonical];
  }
  
  // Then try all aliases
  const allKeys = expandKpiKey(key);
  for (const k of allKeys) {
    if (k in record && record[k] !== undefined && !isNaN(record[k])) {
      return record[k];
    }
  }
  
  return defaultValue;
}

/**
 * Set a KPI value in a record, also setting all aliases to maintain consistency.
 * 
 * @param record - The KPI record to update
 * @param key - The KPI key to set (any alias)
 * @param value - The value to set
 * @returns The updated record
 */
export function setKpiValue(
  record: Record<string, number>,
  key: string,
  value: number
): Record<string, number> {
  const allKeys = expandKpiKey(key);
  
  // Set the value for all equivalent keys
  allKeys.forEach(k => {
    record[k] = value;
  });
  
  return record;
}

/**
 * Normalize all keys in a KPI record to their canonical forms,
 * and ensure all aliases are populated with the same values.
 * 
 * @param record - The KPI record to normalize
 * @returns A new record with normalized keys and populated aliases
 */
export function normalizeKpiRecord(
  record: Record<string, number> | undefined | null
): Record<string, number> {
  if (!record) return {};
  
  const result: Record<string, number> = {};
  
  // First pass: copy all values with their canonical keys
  Object.entries(record).forEach(([key, value]) => {
    if (value !== undefined) {
      const canonical = normalizeKpiKey(key);
      // If we haven't seen this canonical key yet, or if this is the canonical key itself
      if (!(canonical in result) || key === canonical) {
        result[canonical] = value;
      }
    }
  });
  
  // Second pass: populate all aliases
  Object.entries(result).forEach(([canonical, value]) => {
    const aliases = KPI_KEY_ALIASES[canonical] || [];
    aliases.forEach(alias => {
      result[alias] = value;
    });
  });
  
  return result;
}

/**
 * Deep clone a state object, ensuring KPIs are deeply copied.
 * This prevents React from missing state updates due to reference equality.
 */
export function deepCloneState<T extends Record<string, unknown>>(state: T): T {
  return JSON.parse(JSON.stringify(state)) as T;
}
