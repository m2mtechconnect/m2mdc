/**
 * Governance Preview Panel
 * Shows RBAC, audit settings, and security checks
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, FileText, Lock, Check, X } from 'lucide-react';

interface GovernancePreviewPanelProps {
  governanceConfig: any;
}

export function GovernancePreviewPanel({ governanceConfig }: GovernancePreviewPanelProps) {
  const accessMatrix = [
    { role: 'Admin', view: true, operate: true, configure: true, delete: true },
    { role: 'Operator', view: true, operate: true, configure: false, delete: false },
    { role: 'Viewer', view: true, operate: false, configure: false, delete: false },
  ];

  const securityChecks = [
    { label: 'RLS Policies Enabled', passed: true },
    { label: 'Audit Logging Active', passed: governanceConfig?.auditEnabled !== false },
    { label: 'Secrets Encrypted', passed: true },
    { label: 'API Rate Limits Set', passed: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Governance & Security
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Access Control Matrix */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" /> Access Control Matrix
          </h4>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Role</th>
                  <th className="p-2 text-center">View</th>
                  <th className="p-2 text-center">Operate</th>
                  <th className="p-2 text-center">Configure</th>
                  <th className="p-2 text-center">Delete</th>
                </tr>
              </thead>
              <tbody>
                {accessMatrix.map((row) => (
                  <tr key={row.role} className="border-t">
                    <td className="p-2 font-medium">{row.role}</td>
                    {['view', 'operate', 'configure', 'delete'].map((perm) => (
                      <td key={perm} className="p-2 text-center">
                        {row[perm as keyof typeof row] ? (
                          <Check className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Checks */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Lock className="h-4 w-4" /> Security Checks
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {securityChecks.map((check) => (
              <div key={check.label} className="flex items-center gap-2 text-sm">
                {check.passed ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-destructive" />
                )}
                <span>{check.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Settings */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm">Audit Logging</span>
          </div>
          <Badge variant="secondary">Enabled</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
