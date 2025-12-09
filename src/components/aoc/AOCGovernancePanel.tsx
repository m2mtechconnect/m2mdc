import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, History, Key } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useEffect } from 'react';

interface AOCGovernancePanelProps {
  agentId: string;
}

export function AOCGovernancePanel({ agentId }: AOCGovernancePanelProps) {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent('governance_accessed', { agentId });
  }, [agentId]);

  const useMock = import.meta.env.VITE_USE_MOCK_AOC === 'true' && import.meta.env.DEV;

  const { data: auditLogs } = useQuery({
    queryKey: ['aoc-audit-logs', agentId],
    queryFn: async () => {
      if (useMock) {
        const { mockAuditLogs } = await import('@/lib/mock/aocMockData');
        return mockAuditLogs;
      }

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if ((!data || data.length === 0) && import.meta.env.DEV) {
        console.warn('[AOC Demo] No audit logs found – falling back to mock');
        const mod = await import('@/lib/mock/aocMockData');
        return mod.mockAuditLogs;
      }

      return data || [];
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ['aoc-user-roles', agentId],
    queryFn: async () => {
      if (useMock) {
        const { mockUserRoles } = await import('@/lib/mock/aocMockData');
        return mockUserRoles;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('scope', `agent:${agentId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if ((!data || data.length === 0) && import.meta.env.DEV) {
        console.warn('[AOC Demo] No user roles found – falling back to mock');
        const mod = await import('@/lib/mock/aocMockData');
        return mod.mockUserRoles;
      }

      return data || [];
    },
  });

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Governance & Compliance</h3>
      </div>

      <Tabs defaultValue="audit" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="rbac">Access Control</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {!auditLogs || auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No audit logs available</p>
                </div>
              ) : (
                auditLogs.map((log) => (
                  <Card key={log.id} className="p-3 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline">{log.action}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{log.entity_type}</p>
                    {log.details && (
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer hover:text-primary">Details</summary>
                        <pre className="mt-1 p-2 rounded bg-muted overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="rbac" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {!userRoles || userRoles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No user roles configured</p>
                </div>
              ) : (
                userRoles.map((role) => (
                  <Card key={role.id} className="p-3 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Badge variant="outline" className="mb-1">{role.role}</Badge>
                        <p className="text-xs text-muted-foreground">User ID: {role.user_id.slice(0, 8)}...</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(role.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Scope: {role.scope}</p>
                    {role.expires_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Expires: {formatDistanceToNow(new Date(role.expires_at), { addSuffix: true })}
                      </p>
                    )}
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <div className="space-y-3">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" />
                  <span className="font-medium">API Keys</span>
                </div>
                <Badge variant="outline">2 Active</Badge>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-medium">Data Encryption</span>
                </div>
                <Badge variant="default">Enabled</Badge>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}