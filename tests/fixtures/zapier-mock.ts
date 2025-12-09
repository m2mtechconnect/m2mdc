/**
 * Mock Zapier OAuth and API calls for testing
 */

export interface ZapierOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface ZapierApp {
  id: string;
  name: string;
  category: string;
  icon_url: string;
}

export class MockZapierAPI {
  private validTokens = new Set<string>(['test-token-valid']);
  private expiredTokens = new Set<string>(['test-token-expired']);

  getAuthUrl(redirectUri: string, state: string): string {
    return `https://zapier.com/oauth/authorize?client_id=test-client&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  }

  async exchangeCode(code: string): Promise<ZapierOAuthResponse> {
    if (code === 'invalid-code') {
      throw new Error('Invalid authorization code');
    }

    return {
      access_token: 'test-token-valid',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test-refresh-token'
    };
  }

  async getApps(token: string): Promise<ZapierApp[]> {
    if (this.expiredTokens.has(token)) {
      throw new Error('Token expired');
    }

    if (!this.validTokens.has(token)) {
      throw new Error('Invalid token');
    }

    return [
      {
        id: 'slack',
        name: 'Slack',
        category: 'Communication',
        icon_url: 'https://example.com/slack.png'
      },
      {
        id: 'salesforce',
        name: 'Salesforce',
        category: 'CRM',
        icon_url: 'https://example.com/salesforce.png'
      },
      {
        id: 'jira',
        name: 'Jira',
        category: 'Project Management',
        icon_url: 'https://example.com/jira.png'
      }
    ];
  }

  async testConnection(token: string): Promise<{ success: boolean; message: string }> {
    if (this.expiredTokens.has(token)) {
      return { success: false, message: 'Token expired' };
    }

    if (!this.validTokens.has(token)) {
      return { success: false, message: 'Invalid token' };
    }

    return { success: true, message: 'Connection successful' };
  }

  simulateRateLimit(): never {
    throw new Error('Rate limit exceeded: 429');
  }
}

export const mockZapierAPI = new MockZapierAPI();
