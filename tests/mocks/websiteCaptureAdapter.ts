/**
 * Mock adapter for website capture
 * Handles success, error, and edge cases (HTTP/2, JS render, empty pages)
 */

export interface CaptureResult {
  url: string;
  title: string;
  content: string;
  metadata: {
    captureMethod: 'standard' | 'stealth';
    statusCode: number;
    contentType: string;
    timestamp: string;
  };
  classification?: {
    industry: string;
    department: string;
    contentType: string;
  };
}

export interface CaptureError {
  url: string;
  error: string;
  statusCode?: number;
  retryable: boolean;
}

class MockWebsiteCaptureAdapter {
  async capture(url: string, options?: { stealth?: boolean }): Promise<CaptureResult | CaptureError> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Simulate different scenarios based on URL patterns
    if (url.includes('timeout')) {
      return {
        url,
        error: 'Request timeout after 30 seconds',
        statusCode: 408,
        retryable: true,
      };
    }

    if (url.includes('blocked')) {
      return {
        url,
        error: 'Blocked by robots.txt',
        statusCode: 403,
        retryable: false,
      };
    }

    if (url.includes('empty')) {
      return {
        url,
        title: 'Empty Page',
        content: '',
        metadata: {
          captureMethod: options?.stealth ? 'stealth' : 'standard',
          statusCode: 200,
          contentType: 'text/html',
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Successful capture
    const captureMethod = options?.stealth ? 'stealth' : 'standard';
    
    return {
      url,
      title: 'Sample Page Title',
      content: `This is sample content from ${url}. It includes important information about products, services, and company policies.`,
      metadata: {
        captureMethod,
        statusCode: 200,
        contentType: 'text/html; charset=utf-8',
        timestamp: new Date().toISOString(),
      },
      classification: {
        industry: 'Technology',
        department: 'Engineering',
        contentType: 'Documentation',
      },
    };
  }

  async captureWithRetry(url: string, maxRetries = 3): Promise<CaptureResult | CaptureError> {
    let lastError: CaptureError | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.capture(url);

      if ('error' in result) {
        if (!result.retryable) {
          return result;
        }
        lastError = result;
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      } else {
        return result;
      }
    }

    return lastError!;
  }
}

export const mockWebsiteCaptureAdapter = new MockWebsiteCaptureAdapter();
