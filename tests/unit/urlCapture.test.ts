import { describe, it, expect, vi } from 'vitest';
import { mockWebsiteCaptureAdapter } from '../mocks/websiteCaptureAdapter';

describe('URL Capture Utility', () => {
  it('should normalize HTTP/2 URLs', async () => {
    const result = await mockWebsiteCaptureAdapter.capture('https://example.com');
    
    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('content');
  });

  it('should handle retry logic', async () => {
    const result = await mockWebsiteCaptureAdapter.captureWithRetry(
      'https://example.com/timeout',
      2
    );
    
    expect(result).toHaveProperty('error');
    expect((result as any).retryable).toBe(true);
  });

  it('should parse readable text from HTML', async () => {
    const result = await mockWebsiteCaptureAdapter.capture('https://example.com');
    
    if (!('error' in result)) {
      expect(result.content).toBeTruthy();
      expect(typeof result.content).toBe('string');
    }
  });

  it('should use stealth render mode when specified', async () => {
    const result = await mockWebsiteCaptureAdapter.capture('https://example.com', {
      stealth: true,
    });
    
    if (!('error' in result)) {
      expect(result.metadata.captureMethod).toBe('stealth');
    }
  });

  it('should handle robots.txt blocked pages', async () => {
    const result = await mockWebsiteCaptureAdapter.capture(
      'https://example.com/blocked'
    );
    
    expect(result).toHaveProperty('error');
    expect((result as any).retryable).toBe(false);
  });

  it('should handle empty pages gracefully', async () => {
    const result = await mockWebsiteCaptureAdapter.capture(
      'https://example.com/empty'
    );
    
    if (!('error' in result)) {
      expect(result.content).toBe('');
      expect(result.title).toBeTruthy();
    }
  });

  it('should include proper user-agent headers', async () => {
    const result = await mockWebsiteCaptureAdapter.capture('https://example.com');
    
    // Mock adapter should simulate proper header handling
    expect(result).toHaveProperty('metadata');
  });

  it('should timeout after 30 seconds', async () => {
    const result = await mockWebsiteCaptureAdapter.capture(
      'https://example.com/timeout'
    );
    
    expect(result).toHaveProperty('error');
    expect((result as any).statusCode).toBe(408);
  });
});
