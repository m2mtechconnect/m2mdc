/**
 * Centralized formatting utilities
 * Provides consistent formatting for numbers, dates, percentages, etc.
 */

/**
 * Format a number as a percentage
 */
export function formatPercentage(value: number | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a number with commas as thousands separators
 */
export function formatNumber(value: number | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency (USD) - supports compact mode for large values
 */
export function formatCurrency(value: number | null | undefined, decimals: number = 0, compact: boolean = false): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0';
  }
  if (compact) {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${formatNumber(value, decimals)}`;
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: string | Date | null | undefined, format: 'short' | 'long' = 'short'): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  if (format === 'short') {
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  
  return formatDate(dateObj, 'short');
}

/**
 * Format duration in milliseconds to readable string
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || isNaN(ms)) {
    return 'N/A';
  }

  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string | null | undefined, maxLength: number = 100): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Format file size in bytes to readable string
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) {
    return 'N/A';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

// ============================================================================
// UI FORMATTING HELPERS
// ============================================================================

/**
 * Format agent ID for UI display (kebab-case/snake_case to Title Case)
 * @example thermal_agent → Thermal Agent
 * @example cooling-optimizer → Cooling Optimizer
 */
export function formatAgentIdForUI(id: string): string {
  if (!id) return '';
  return id
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Format scenario ID for UI display
 */
export function formatScenarioIdForUI(id: string): string {
  if (!id) return '';
  return id
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Format KPI ID for UI display with proper acronym handling
 */
export function formatKpiIdForUI(id: string): string {
  if (!id) return '';
  const acronyms = ['pue', 'gpu', 'ups', 'kpi', 'roi', 'sla', 'ai'];
  return id
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => {
      const lower = word.toLowerCase();
      if (acronyms.includes(lower)) {
        return lower.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Format domain key for UI display
 */
export function formatDomainForUI(domain: string): string {
  const domainLabels: Record<string, string> = {
    thermal: 'Thermal & Hardware',
    power: 'Power & UPS',
    cooling: 'Cooling Systems',
    network: 'Network Infrastructure',
    facility: 'Facility & Safety',
    workload: 'Workload & GPU',
    sovereignty: 'Sovereignty & Compliance',
    financial: 'Financial & Carbon',
  };
  return domainLabels[domain] || formatAgentIdForUI(domain);
}

/**
 * Format carbon emissions
 */
export function formatCarbon(tonnes: number): string {
  if (tonnes >= 1_000_000) return `${(tonnes / 1_000_000).toFixed(1)}M tonnes CO₂e`;
  if (tonnes >= 1_000) return `${(tonnes / 1_000).toFixed(1)}K tonnes CO₂e`;
  return `${tonnes.toLocaleString()} tonnes CO₂e`;
}

/**
 * Format power capacity
 */
export function formatPower(kw: number): string {
  if (kw >= 1_000) return `${(kw / 1_000).toFixed(1)} MW`;
  return `${kw} kW`;
}

/**
 * Normalize backend agent ID to UI format (underscore to kebab)
 */
export function normalizeAgentId(id: string): string {
  return id.replace(/_/g, '-').toLowerCase();
}

/**
 * Normalize scenario ID
 */
export function normalizeScenarioId(id: string): string {
  return id.replace(/_/g, '-').toLowerCase();
}
