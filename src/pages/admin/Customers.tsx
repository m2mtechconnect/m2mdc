import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, ChevronLeft, ChevronRight, Plus, RefreshCw, Search } from 'lucide-react';
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
import {
  AURA_DEPLOYMENT_OFFERINGS,
  deploymentOffering,
  type DeploymentCapabilityStatus,
} from '@/deployment/deploymentProfiles';

interface CustomerDeploymentProfile {
  type: string;
  capabilityStatus: DeploymentCapabilityStatus;
  lifecycleStatus: string;
  automationStatus: string;
  hostingProvider: string;
  preferredRegion: string | null;
  controlPlaneLocation: string;
  dataPlaneLocation: string;
  customerManaged: boolean;
  edgeRequired: boolean;
  dataResidency: string | null;
}

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
  edgeGatewayCount?: number;
  onlineEdgeGatewayCount?: number;
  deploymentProfile: CustomerDeploymentProfile | null;
  ownerInvite: {
    id: string | null;
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

interface CustomerPage {
  organizations: CustomerOrganization[];
  page: number;
  pageSize: number;
  total: number;
}

const EMPTY_FORM: ProvisionForm = {
  name: '',
  domain: '',
  industry: '',
  ownerEmail: '',
};

function isExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  const parsed = new Date(expiresAt).getTime();
  return Number.isFinite(parsed) && parsed <= Date.now();
}

function ownerState(organization: CustomerOrganization): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  if (organization.memberCount > 0) return { label: 'Active', variant: 'default' };
  if (organization.ownerInvite?.status === 'pending' && isExpired(organization.ownerInvite.expiresAt)) {
    return { label: 'Owner invite expired', variant: 'destructive' };
  }
  if (organization.ownerInvite?.status === 'pending') return { label: 'Awaiting owner', variant: 'secondary' };
  return { label: 'Provisioned', variant: 'outline' };
}

function capabilityVariant(status: DeploymentCapabilityStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'AVAILABLE') return 'default';
  if (status === 'PARTIAL') return 'secondary';
  return 'outline';
}

function deliveryToast(action: string, status: string) {
  if (status === 'sent') {
    toast.success(`${action}; invitation email sent.`);
  } else {
    toast.warning(`${action}; invitation email delivery is ${status.replace(/_/g, ' ')}.`);
  }
}

export default function Customers() {
  const [organizations, setOrganizations] = useState<CustomerOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendingOrgId, setResendingOrgId] = useState<string | null>(null);
  const [form, setForm] = useState<ProvisionForm>(EMPTY_FORM);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');

  const platformDb = supabase as unknown as {
    rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
  };

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await platformDb.rpc('platform_list_organizations', {
        _page: page,
        _page_size: pageSize,
        _search: search || null,
      });
      if (rpcError) throw new Error(rpcError.message || 'Failed to load customer organizations');
      const result = data as CustomerPage | null;
      setOrganizations(Array.isArray(result?.organizations) ? result.organizations : []);
      setTotal(Number(result?.total ?? 0));
      setPageSize(Number(result?.pageSize ?? pageSize));
    } catch (loadError) {
      console.error('Failed to load customer organizations:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load customer organizations');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, platformDb, search]);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const aggregate = useMemo(() => ({
    members: organizations.reduce((sum, organization) => sum + organization.memberCount, 0),
    facilities: organizations.reduce((sum, organization) => sum + organization.facilityCount, 0),
    connections: organizations.reduce((sum, organization) => sum + organization.connectionCount, 0),
  }), [organizations]);

  const updateField = (field: keyof ProvisionForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = searchDraft.trim();
    if (page !== 1) setPage(1);
    if (next !== search) setSearch(next);
    else void loadOrganizations();
  };

  const handleProvision = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('teams-invite', {
        body: {
          mode: 'platform_provision',
          name: form.name.trim(),
          domain: form.domain.trim() || null,
          industry: form.industry.trim() || null,
          ownerEmail: form.ownerEmail.trim().toLowerCase(),
        },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(String(data.error));

      const deliveryStatus = String(data?.ownerInvite?.delivery?.status ?? 'disabled');
      deliveryToast('Customer organization provisioned', deliveryStatus);
      setForm(EMPTY_FORM);
      setDialogOpen(false);
      setPage(1);
      await loadOrganizations();
    } catch (provisionError) {
      console.error('Failed to provision organization:', provisionError);
      toast.error(provisionError instanceof Error ? provisionError.message : 'Failed to provision organization');
    } finally {
      setSubmitting(false);
    }
  };

  const resendOwnerInvite = async (organization: CustomerOrganization) => {
    setResendingOrgId(organization.id);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('teams-invite', {
        body: { mode: 'platform_resend_owner', orgId: organization.id },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(String(data.error));
      const deliveryStatus = String(data?.ownerInvite?.delivery?.status ?? 'disabled');
      deliveryToast('Owner invitation reissued', deliveryStatus);
      await loadOrganizations();
    } catch (resendError) {
      toast.error(resendError instanceof Error ? resendError.message : 'Failed to reissue owner invitation');
    } finally {
      setResendingOrgId(null);
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
            <div className="flex flex-wrap items-center gap-2">
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
            <div className="v2-metric-secondary">{total}</div>
          </div>
          <div>
            <div className="v2-label">Active members on page</div>
            <div className="v2-metric-secondary">{aggregate.members}</div>
          </div>
          <div>
            <div className="v2-label">Facilities on page</div>
            <div className="v2-metric-secondary">{aggregate.facilities}</div>
          </div>
          <div>
            <div className="v2-label">Connections on page</div>
            <div className="v2-metric-secondary">{aggregate.connections}</div>
          </div>
        </Panel>

        <Panel>
          <div className="mb-3">
            <div className="v2-label">Deployment models</div>
            <p className="text-sm text-muted-foreground">
              Availability reflects verified runtime capability, not whether a configuration option exists in the UI.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {AURA_DEPLOYMENT_OFFERINGS.map((offering) => (
              <div key={offering.type} className="v2-subpanel min-w-0 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-foreground">{offering.shortLabel}</div>
                  <Badge variant={capabilityVariant(offering.capabilityStatus)}>{offering.capabilityStatus}</Badge>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{offering.truthNote}</p>
              </div>
            ))}
          </div>
        </Panel>

        <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Search customers"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search customer, domain, or industry"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">Search</Button>
          {search && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearchDraft('');
                setSearch('');
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </form>

        {loading ? (
          <StateView kind="loading" title="Loading customers" description="Reading the bounded platform customer inventory." />
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
            title={search ? 'No matching customers' : 'No customer organizations yet'}
            description={search ? 'Adjust the search query or clear the filter.' : 'Provision the first customer organization and owner invitation.'}
            action={!search ? <Button onClick={() => setDialogOpen(true)}>Add customer</Button> : undefined}
          />
        ) : (
          <OperationalTable aria-label="Customer organizations">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Status</th>
                <th>Deployment</th>
                <th>Members</th>
                <th>Facilities</th>
                <th>Twins</th>
                <th>Connections</th>
                <th>Owner invitation</th>
                <th>Identity</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((organization) => {
                const state = ownerState(organization);
                const hasDeploymentProfile = !!organization.deploymentProfile;
                const offering = hasDeploymentProfile ? deploymentOffering(organization.deploymentProfile?.type) : null;
                const capability = organization.deploymentProfile?.capabilityStatus ?? null;
                const canResend = organization.memberCount === 0 && !!organization.ownerInvite?.email;
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
                    <td>
                      {offering && capability ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{offering.shortLabel}</span>
                            <Badge variant={capabilityVariant(capability)}>{capability}</Badge>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {organization.deploymentProfile?.preferredRegion ?? 'Current managed region'} · {organization.deploymentProfile?.lifecycleStatus}
                          </div>
                        </>
                      ) : (
                        <div>
                          <Badge variant="destructive">Profile missing</Badge>
                          <div className="mt-1 text-xs text-muted-foreground">Deployment evidence is incomplete.</div>
                        </div>
                      )}
                    </td>
                    <td data-numeric="">{organization.memberCount}</td>
                    <td data-numeric="">{organization.facilityCount}</td>
                    <td data-numeric="">{organization.twinCount}</td>
                    <td data-numeric="">{organization.connectionCount}</td>
                    <td>
                      {organization.memberCount > 0 ? (
                        <span className="text-sm text-muted-foreground">Owner active</span>
                      ) : organization.ownerInvite ? (
                        <div className="space-y-1">
                          <div className="max-w-[220px] truncate text-sm text-foreground">{organization.ownerInvite.email ?? 'Email unavailable'}</div>
                          <div className="text-xs text-muted-foreground">
                            {organization.ownerInvite.expiresAt
                              ? `${isExpired(organization.ownerInvite.expiresAt) ? 'Expired' : 'Expires'} ${new Date(organization.ownerInvite.expiresAt).toLocaleString()}`
                              : 'Expiration unavailable'}
                          </div>
                          {canResend && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void resendOwnerInvite(organization)}
                              disabled={resendingOrgId === organization.id}
                            >
                              {resendingOrgId === organization.id ? 'Reissuing…' : 'Reissue invite'}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-destructive">Owner invite missing</span>
                      )}
                    </td>
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

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>Page {page} of {pageCount} · {total} organizations</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}>
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount || loading}>
              Next <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleProvision}>
            <DialogHeader>
              <DialogTitle>Add customer</DialogTitle>
              <DialogDescription>
                Creates an isolated organization and a seven-day owner invitation. New organizations start on the current AURA Cloud Shared profile; dedicated/private/hybrid infrastructure is configured only after the corresponding runtime capability is qualified.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="customer-name">Organization name</Label>
                <Input
                  id="customer-name"
                  required
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
                  pattern="([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}"
                  title="Enter a domain such as example.com"
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
                  required
                  value={form.ownerEmail}
                  onChange={(event) => updateField('ownerEmail', event.target.value)}
                  placeholder="owner@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Provisioning…' : 'Provision customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
