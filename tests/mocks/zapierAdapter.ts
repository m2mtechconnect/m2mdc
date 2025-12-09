/**
 * Mock adapter for Zapier integrations
 * Simulates connect/disconnect and action webhooks
 */

export interface ZapierConnection {
  id: string;
  app: string;
  status: 'connected' | 'disconnected' | 'error';
  error?: string;
}

export interface ZapierAction {
  id: string;
  type: 'create_ticket' | 'write_record' | 'send_notification';
  data: Record<string, any>;
  status: 'success' | 'error';
  result?: Record<string, any>;
}

class MockZapierAdapter {
  private connections: Map<string, ZapierConnection> = new Map();

  async connect(app: string): Promise<ZapierConnection> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const connection: ZapierConnection = {
      id: `conn_${Date.now()}`,
      app,
      status: 'connected',
    };

    this.connections.set(connection.id, connection);
    return connection;
  }

  async disconnect(connectionId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.status = 'disconnected';
    }
  }

  async executeAction(action: Omit<ZapierAction, 'status' | 'result'>): Promise<ZapierAction> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Simulate different outcomes based on action type
    const result: ZapierAction = {
      ...action,
      status: 'success',
      result: {},
    };

    switch (action.type) {
      case 'create_ticket':
        result.result = {
          ticketId: `JIRA-${Math.floor(Math.random() * 10000)}`,
          url: `https://example.atlassian.net/browse/JIRA-${Math.floor(Math.random() * 10000)}`,
        };
        break;
      case 'write_record':
        result.result = {
          recordId: `rec_${Date.now()}`,
          success: true,
        };
        break;
      case 'send_notification':
        result.result = {
          messageId: `msg_${Date.now()}`,
          channel: action.data.channel || 'general',
        };
        break;
    }

    return result;
  }

  getConnection(connectionId: string): ZapierConnection | undefined {
    return this.connections.get(connectionId);
  }

  getAllConnections(): ZapierConnection[] {
    return Array.from(this.connections.values());
  }
}

export const mockZapierAdapter = new MockZapierAdapter();
