/**
 * Scanner Components Index
 * Exports all scanner-related components and hooks
 */

// Main scanner component
export { WebsiteScanner } from './WebsiteScanner';

// Scanner controller hook and types
export { useScannerController } from './ScannerController';
export type { ScanResult, ScannerState, ScannerControllerProps } from './ScannerController';

// Re-export for backward compatibility
export { useScannerController as useScanner } from './ScannerController';
