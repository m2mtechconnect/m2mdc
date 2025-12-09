/**
 * Mock for Gemini document analysis
 * Returns deterministic responses for testing
 */

import type { DocumentAnalysisResult } from '@/hooks/useDocumentAnalysis';
import { 
  smallDocumentAnalysis, 
  largeDocumentAnalysis,
  minimalDocumentAnalysis 
} from '../fixtures/document-analysis';

export class MockDocumentAnalyzer {
  private mockDelay: number;

  constructor(mockDelay: number = 100) {
    this.mockDelay = mockDelay;
  }

  async analyzeDocument(file: File): Promise<DocumentAnalysisResult> {
    // Simulate processing time
    await this.delay(this.mockDelay);

    // Return different results based on filename
    if (file.name.includes('large')) {
      return largeDocumentAnalysis;
    } else if (file.name.includes('minimal')) {
      return minimalDocumentAnalysis;
    } else {
      return smallDocumentAnalysis;
    }
  }

  simulateProgress(onProgress: (progress: number, phase: string) => void) {
    const phases = [
      { progress: 10, phase: 'Extracting text from file...' },
      { progress: 30, phase: 'Analyzing document structure...' },
      { progress: 50, phase: 'Gemini analyzing content...' },
      { progress: 70, phase: 'Detecting KPIs and workflows...' },
      { progress: 90, phase: 'Generating recommendations...' },
      { progress: 100, phase: 'Analysis complete!' },
    ];

    let currentPhase = 0;
    const interval = setInterval(() => {
      if (currentPhase < phases.length) {
        const { progress, phase } = phases[currentPhase];
        onProgress(progress, phase);
        currentPhase++;
      } else {
        clearInterval(interval);
      }
    }, this.mockDelay);

    return interval;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const mockDocumentAnalyzer = new MockDocumentAnalyzer();
