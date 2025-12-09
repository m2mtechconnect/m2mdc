import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Plus, Edit, Trash2, Copy, CheckCircle2, XCircle } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { PolicyEditorDrawer } from './PolicyEditorDrawer';
import { usePolicies } from '@/hooks/usePolicies';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';
import { handleError } from '@/lib/errorHandlers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PolicyManagerProps {
  systemId: string;
}

interface Policy {
  id: string;
  name: string;
  description?: string;
  scope: 'model' | 'rag' | 'mcp' | 'workflow' | 'global';
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  binding_count?: number;
}

export function PolicyManager({ systemId }: PolicyManagerProps) {
  const { policies, isLoading, deletePolicy, duplicatePolicy, refetch } = usePolicies(systemId);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [deletingPolicyId, setDeletingPolicyId] = useState<string | null>(null);

  const handleEdit = (policy: Policy) => {
    setEditingPolicy(policy);
    setIsEditorOpen(true);
  };

  const handleDuplicate = async (policy: Policy) => {
    try {
      await duplicatePolicy(policy.id);
      toast.success(`Policy "${policy.name}" duplicated`);
      refetch();
    } catch (error) {
      handleError(error, {
        component: 'PolicyManager',
        action: 'handleDuplicate',
        fallbackMessage: 'Failed to duplicate policy'
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingPolicyId) return;
    
    try {
      await deletePolicy(deletingPolicyId);
      toast.success('Policy deleted');
      setDeletingPolicyId(null);
      refetch();
    } catch (error) {
      handleError(error, {
        component: 'PolicyManager',
        action: 'handleDelete',
        fallbackMessage: 'Failed to delete policy'
      });
    }
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setEditingPolicy(null);
    refetch();
  };

  const getScopeColor = (scope: string) => {
    const colors = {
      global: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      model: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      rag: 'bg-green-500/10 text-green-500 border-green-500/20',
      mcp: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      workflow: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    };
    return colors[scope as keyof typeof colors] || colors.global;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {policies.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No Policies Yet"
          description="Define your first governance rule for data access, compliance, and security."
          action={{
            label: "Create Policy",
            onClick: () => setIsEditorOpen(true)
          }}
        />
      ) : (
        <>
          {/* Header with conditional button */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-h3">Policy Inventory</h3>
              <p className="text-caption text-muted-foreground">
                {policies.length} {policies.length === 1 ? 'policy' : 'policies'} configured
              </p>
            </div>
            <Button onClick={() => setIsEditorOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Policy
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="flex items-center gap-3 flex-wrap">
            <Card className="px-4 py-2 bg-accent/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Total Policies:</span>
                <span className="text-sm font-bold text-foreground">{policies.length}</span>
              </div>
            </Card>
            <Card className="px-4 py-2 bg-accent/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Enabled:</span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  {policies.filter(p => p.is_enabled).length}
                </span>
              </div>
            </Card>
            <Card className="px-4 py-2 bg-accent/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Total Bindings:</span>
                <span className="text-sm font-bold text-primary">
                  {policies.reduce((sum, p) => sum + (p.binding_count || 0), 0)}
                </span>
              </div>
            </Card>
          </div>

          {/* Policy Table */}
        </>
      )}

      {policies.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Bound Resources</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow 
                  key={policy.id} 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleEdit(policy)}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{policy.name}</div>
                      {policy.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {policy.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getScopeColor(policy.scope)}>
                      {policy.scope}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {policy.is_enabled ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/20">
                        <XCircle className="h-3 w-3 mr-1" />
                        Disabled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {policy.binding_count || 0} {policy.binding_count === 1 ? 'resource' : 'resources'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(policy.updated_at, 'short')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(policy);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(policy);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingPolicyId(policy.id);
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Policy Editor Drawer */}
      <PolicyEditorDrawer
        open={isEditorOpen}
        onClose={handleEditorClose}
        systemId={systemId}
        policy={editingPolicy}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPolicyId} onOpenChange={() => setDeletingPolicyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the policy and all its bindings. Enforcement will stop immediately.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete Policy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
