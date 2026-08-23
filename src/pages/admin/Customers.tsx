import { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CommandHeader, OperationalTable, Panel, StateView } from '@/components/v2';

interface CustomerOrganization {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  mfa_enabled: boolean | null;
  sso_enabled: boolean | null;
  created_at: string;
  memberCount: number;
  facilityCount: number;
  twinCount: number;
  connectionCount: number;
  ownerInvite: {
    email: string | null;
    status: string | null;
    expiresAt: string | null;
  } | null;
}

interface ProvisionForm {
  name: string;
  domain: string;
  industry: string;
  ownerEmail: string;
}

const EMPTY_FORM: ProvisionForm = {
  name: '',
  domain: '',
  industry: '',
  ownerEmail: '',
};

function ownerState(organization: CustomerOrganization): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  if (organization.memberCount > 0) return { label: 'Active', variant: 'default' };
  if (organization.ownerInvite?.status === 'pending') return { label: 'Awaiting owner', variant: 'secondary' };
  return { label: 'Provisioned', variant: 'outline' };
}

export default function Customers() {
  const [organizations, setOrganizations] = useState<CustomerOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ProvisionForm>(EMPTY_FORM);

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('organization-list');
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(String(data.error));
      setOrganizations(Array.isArray(data?.organizations) ? data.organizations : []);
    } catch (loadError) {
      console.error('Failed to load customer organizations:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load customer organizations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  const updateField = (field: keyof ProvisionForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleProvision = async () => {
    if (!form.name.trim() || !form.ownerEmail.trim()) {
      toast.error('Organization name and owner email are required');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('organization-provision', {
        body: {
          name: form.name.trim(),
          domain: form.domain.trim() || null,
          industry: form.industry.trim() || null,
          ownerEmail: form.ownerEmail.trim().toLowerCase(),
        },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(String(data.error));

      toast.success('Customer organization provisioned');
      setForm(EMPTY_FORM);
      setDialogOpen(false);
      await loadOrganizations();
    } catch (provisionError) {
      console.error('Failed to provision organization:', provisionError);
      toast.error(provisionError instanceof Error ? provisionError.message : 'Failed to provision organization');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="v2-canvas min-h-full p-4 sm:p-6">
      <div className="mx-auto w-full max-w-screen-2xl space-y-5">
        <CommandHeader
          eyebrow="Platform Administration"
          title="Customers"
          subtitle="Provision and monitor isolated AURA customer organizations. Customer roles never grant platform administration."
          actions={(
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => void loadOrganizations()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                Refresh
              </Button>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add customer
              </Button>
            </div>
          )}
        />

        <Panel className="flex flex-wrap items-center gap-6">
          <div>
            <div className="v2-label">Organizations</div>
            <div className="v2-metric-secondary">{organizations.length}</div>
          </div>
          <div>
            <div className="v2-label">Active members</div>
            <div className="v2-metric-secondary">
              {organizations.reduce((sum, organization) => sum + organization.memberCount, 0)}
            </div>
          </div>
          <div>
            <div className="v2-label">Facilities</div>
            <div className="v2-metric-secondary">
              {organizations.reduce((sum, organization) => sum + organization.facilityCount, 0)}
            </div>
          </div>
          <div>
            <div className="v2-label">Connections</div>
            <div className="v2-metric-secondary">
              {organizations.reduce((sum, organization) => sum + organization.connectionCount, 0)}
            </div>
          </div>
        </Panel>

        {loading ? (
          <StateView kind="loading" title="Loading customers" description="Reading the platform customer inventory." />
        ) : error ? (
          <StateView
            kind="error"
            title="Customer inventory unavailable"
            description={error}
            action={<Button variant="outline" onClick={() => void loadOrganizations()}>Retry</Button>}
          />
        ) : organizations.length === 0 ? (
          <StateView
            kind="empty"
            title="No customer organizations yet"
            description="Provision the first customer organization and owner invitation."
            action={<Button onClick={() => setDialogOpen(true)}>Add customer</Button>}
          />
        ) : (
          <OperationalTable aria-label="Customer organizations">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Status</th>
                <th>Members</th>
                <th>Facilities</th>
                <th>Twins</th>
                <th>Connections</th>
                <th>Identity</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((organization) => {
                const state = ownerState(organization);
                return (
                  <tr key={organization.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">{organization.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {organization.domain ?? 'No domain'}{organization.industry ? ` · ${organization.industry}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><Badge variant={state.variant}>{state.label}</Badge></td>
                    <td data-numeric="">{organization.memberCount}</td>
                    <td data-numeric="">{organization.facilityCount}</td>
                    <td data-numeric="">{organization.twinCount}</td>
                    <td data-numeric="">{organization.connectionCount}</td>
                    <td>
                      <div className="text-sm text-foreground">
                        {organization.sso_enabled ? 'SSO enabled' : 'Password / federated-ready'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {organization.mfa_enabled ? 'MFA policy enabled' : 'MFA policy not enabled'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </OperationalTable>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add customer</DialogTitle>
            <DialogDescription>
              Creates an isolated organization and a seven-day owner invitation. Infrastructure deployment is configured separately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="customer-name">Organization name</Label>
              <Input
                id="customer-name"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Example Data Centre Group"
                autoComplete="organization"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer-domain">Primary domain</Label>
              <Input
                id="customer-domain"
                value={form.domain}
                onChange={(event) => updateField('domain', event.target.value)}
                placeholder="example.com"
                inputMode="url"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer-industry">Industry</Label>
              <Input
                id="customer-industry"
                value={form.industry}
                onChange={(event) => updateField('industry', event.target.value)}
                placeholder="Data centres"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer-owner">Customer owner email</Label>
              <Input
                id="customer-owner"
                type="email"
                value={form.ownerEmail}
                onChange={(event) => updateField('ownerEmail', event.target.value)}
                placeholder="owner@example.com"
                autoComplete="email"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={() => void handleProvision()} disabled={submitting}>
              {submitting ? 'Provisioning…' : 'Provision customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
