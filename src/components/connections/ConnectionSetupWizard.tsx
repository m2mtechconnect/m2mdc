/**
 * Connection setup wizard. Drafts are non-destructive, cancellation discards
 * nothing already proven, and activation is only offered after a passing
 * server-side health check. Credential material, when the method needs one, is
 * held in component state, submitted once to the vault edge function, and
 * cleared immediately; it is never persisted or read back in the browser.
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, CircleAlert, Loader2 } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  activateConnection,
  createConnection,
  runHealthCheck,
  storeConnectionCredential,
  useFacilityOptions,
  useTenantOptions,
  type HealthCheckResult,
} from '@/connections/api';
import type { ConnectionInstance, ConnectorDefinition } from '@/connections/model';
import { useManagedConnectorCapabilities } from '@/connections/managedConnectorApi';
import {
  CONNECTION_CLASS_DESCRIPTION,
  CONNECTION_CLASS_LABEL,
  ELIGIBILITY_LABEL,
  EXTERNAL_AUTHORIZATION_NOTICE,
} from '@/connections/managedConnectors';
import {
  DIRECTIONS,
  ENVIRONMENTS,
  WIZARD_STEPS,
  emptyWizardDraft,
  requiresVaultCredential,
  selectableConnectors,
  validateStep,
  type WizardDraft,
  type WizardStepId,
} from '@/connections/wizardModel';

const NONE = '__none__';

export function ConnectionSetupWizard({
  open,
  onOpenChange,
  definitions,
  connections,
  presetConnectorId,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definitions: ConnectorDefinition[];
  connections: ConnectionInstance[];
  presetConnectorId?: string;
  onCompleted: () => void;
}) {
  const { toast } = useToast();
  const tenants = useTenantOptions();
  const facilities = useFacilityOptions();
  const capabilities = useManagedConnectorCapabilities();

  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<WizardDraft>(() => emptyWizardDraft());
  const [created, setCreated] = useState<ConnectionInstance | null>(null);
  const [check, setCheck] = useState<HealthCheckResult | null>(null);
  const [busy, setBusy] = useState(false);

  const options = useMemo(() => selectableConnectors(definitions), [definitions]);
  const definition = useMemo(
    () => definitions.find((d) => d.id === draft.connector_id),
    [definitions, draft.connector_id],
  );
  // Implementation class for the selected connector, resolved server-side.
  const capability = useMemo(
    () => capabilities.data?.entries.find((e) => e.connector_definition_id === draft.connector_id) ?? null,
    [capabilities.data, draft.connector_id],
  );

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setCreated(null);
    setCheck(null);
    setDraft({ ...emptyWizardDraft(), connector_id: presetConnectorId ?? '' });
  }, [open, presetConnectorId]);

  const step = WIZARD_STEPS[stepIndex];
  const lastCheckPassed = check?.status === 'PASSED';
  const validation = validateStep(step.id as WizardStepId, draft, definition, connections, lastCheckPassed);

  const set = <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  async function handleNext() {
    if (!validation.complete) return;
    // Persist the draft when leaving the authentication step.
    if (step.id === 'authentication' && !created) {
      setBusy(true);
      try {
        const connection = await createConnection({
          connector_id: draft.connector_id,
          tenant_id: draft.tenant_id,
          facility_id: draft.facility_id,
          environment: draft.environment,
          display_name: draft.display_name.trim(),
          data_direction: draft.data_direction,
          data_classes: draft.data_classes,
          auth_method: draft.auth_method,
        });
        if (requiresVaultCredential(draft.auth_method)) {
          await storeConnectionCredential(connection.id, draft.credential_secret, {
            authMethod: draft.auth_method,
          });
          // The plaintext never survives the submission.
          set('credential_secret', '');
        }
        setCreated(connection);
        setStepIndex((i) => i + 1);
      } catch (error) {
        toast({
          title: 'Connection could not be created',
          description: error instanceof Error ? error.message : 'The server rejected the request.',
          variant: 'destructive',
        });
      } finally {
        setBusy(false);
      }
      return;
    }
    setStepIndex((i) => Math.min(i + 1, WIZARD_STEPS.length - 1));
  }

  async function handleTest() {
    if (!created) return;
    setBusy(true);
    try {
      const result = await runHealthCheck(created.id);
      setCheck(result);
      toast({
        title: result.status === 'PASSED' ? 'Health check passed' : 'Health check failed',
        description: result.safe_message ?? '',
        variant: result.status === 'PASSED' ? undefined : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Health check could not run',
        description: error instanceof Error ? error.message : 'The server-side probe was rejected.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleActivate() {
    if (!created) return;
    setBusy(true);
    try {
      const status = await activateConnection(created.id);
      toast({ title: 'Connection activated', description: `Status is now ${status}.` });
      onCompleted();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Activation refused',
        description: error instanceof Error ? error.message : 'The server rejected activation.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && created) onCompleted(); onOpenChange(next); }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add connection</DialogTitle>
          <DialogDescription className="text-xs">
            Step {stepIndex + 1} of {WIZARD_STEPS.length}: {step.description} Credentials go straight
            to the encrypted server-side vault and no connection is activated without a passing
            server-side check.
          </DialogDescription>
        </DialogHeader>

        <ol className="flex flex-wrap gap-1.5" aria-label="Setup steps">
          {WIZARD_STEPS.map((s, i) => (
            <li key={s.id}>
              <Badge
                variant={i === stepIndex ? 'default' : 'outline'}
                className="text-xs"
                aria-current={i === stepIndex ? 'step' : undefined}
              >
                {i < stepIndex && <Check className="mr-1 h-3 w-3" aria-hidden />}
                {s.title}
              </Badge>
            </li>
          ))}
        </ol>

        <div className="space-y-4 py-2">
          {step.id === 'connector' && (
            <div className="space-y-2">
              <Label htmlFor="wizard-connector" className="text-xs">Connector</Label>
              <Select value={draft.connector_id || undefined} onValueChange={(v) => { set('connector_id', v); set('auth_method', ''); set('data_classes', []); }}>
                <SelectTrigger id="wizard-connector" className="h-9 text-sm"><SelectValue placeholder="Select a connector" /></SelectTrigger>
                <SelectContent>
                  {options.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only connectors with an implemented runtime adapter are listed. {definitions.length - options.length} catalogue
                entries cannot be instantiated because no adapter exists.
              </p>
              {definition && (
                <p className="text-xs text-muted-foreground">
                  {definition.provider} · protocols {definition.supported_protocols.join(', ') || 'none'} · adapter {definition.runtime_adapter}
                </p>
              )}
              {capability && (
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {CONNECTION_CLASS_LABEL[capability.connection_class]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{ELIGIBILITY_LABEL[capability.eligibility]}</Badge>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {CONNECTION_CLASS_DESCRIPTION[capability.connection_class]}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Data classes requested: {capability.data_classes.join(', ') || 'none declared'}.
                    {capability.operations.length > 0 &&
                      ` Permissions: ${capability.operations
                        .map((op) => `${op.label} (${op.classification === 'WRITE' ? 'write, approval required' : 'read'})`)
                        .join('; ')}.`}
                  </p>
                  {capability.native_required_reason && (
                    <p className="mt-1.5 text-xs text-muted-foreground">{capability.native_required_reason}</p>
                  )}
                  {(capability.connection_class === 'MANAGED_USER' || capability.connection_class === 'MANAGED_SHARED') && (
                    <p className="mt-1.5 text-xs text-muted-foreground">{EXTERNAL_AUTHORIZATION_NOTICE}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {step.id === 'scope' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="wizard-tenant" className="text-xs">Tenant</Label>
                <Select
                  value={draft.tenant_id ?? NONE}
                  onValueChange={(v) => set('tenant_id', v === NONE ? null : v)}
                >
                  <SelectTrigger id="wizard-tenant" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Platform-wide (no tenant)</SelectItem>
                    {(tenants.data ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-facility" className="text-xs">Facility</Label>
                <Select
                  value={draft.facility_id ?? NONE}
                  onValueChange={(v) => set('facility_id', v === NONE ? null : v)}
                >
                  <SelectTrigger id="wizard-facility" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>All facilities</SelectItem>
                    {(facilities.data ?? []).map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-environment" className="text-xs">Environment</Label>
                <Select value={draft.environment} onValueChange={(v) => set('environment', v)}>
                  <SelectTrigger id="wizard-environment" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENTS.map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-3">
                Tenant scoping is enforced. Only tenants you belong to are listed, reads and writes are
                restricted to your tenant by row-level security, and the server re-checks the scope on
                every provisioning call. Platform-wide connections stay visible to all signed-in users.
              </p>
            </div>
          )}

          {step.id === 'contract' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wizard-name" className="text-xs">Connection name</Label>
                <Input
                  id="wizard-name"
                  value={draft.display_name}
                  onChange={(e) => set('display_name', e.target.value)}
                  className="h-9 text-sm"
                  placeholder="Montreal DSX ingest"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-direction" className="text-xs">Direction</Label>
                <Select value={draft.data_direction} onValueChange={(v) => set('data_direction', v)}>
                  <SelectTrigger id="wizard-direction" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIRECTIONS.map((d) => (<SelectItem key={d} value={d}>{d.replace('_', ' / ')}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-xs font-medium">Data classes</legend>
                <div className="flex flex-wrap gap-3">
                  {(definition?.supported_data_classes ?? []).map((cls) => (
                    <label key={cls} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={draft.data_classes.includes(cls)}
                        onCheckedChange={(checked) =>
                          set('data_classes', checked
                            ? [...draft.data_classes, cls]
                            : draft.data_classes.filter((c) => c !== cls))
                        }
                        aria-label={cls}
                      />
                      {cls}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {step.id === 'authentication' && (
            <div className="space-y-2">
              <Label htmlFor="wizard-auth" className="text-xs">Authentication method</Label>
              <Select value={draft.auth_method || undefined} onValueChange={(v) => set('auth_method', v)}>
                <SelectTrigger id="wizard-auth" className="h-9 text-sm"><SelectValue placeholder="Select a method" /></SelectTrigger>
                <SelectContent>
                  {(definition?.supported_auth_methods ?? []).map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {requiresVaultCredential(draft.auth_method) && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="wizard-credential" className="text-xs">Credential</Label>
                  <Input
                    id="wizard-credential"
                    type="password"
                    autoComplete="new-password"
                    value={draft.credential_secret}
                    onChange={(e) => set('credential_secret', e.target.value)}
                    className="h-9 text-sm"
                    placeholder="Paste the credential issued by the source system"
                  />
                  <p className="text-xs text-muted-foreground">
                    Submitted once to the credential vault, encrypted with AES-GCM server-side and
                    stored in a table no signed-in user can read. AURA shows only a fingerprint,
                    version and rotation date afterwards. It cannot be displayed again; rotate it to
                    replace it.
                  </p>
                </div>
              )}
              {!requiresVaultCredential(draft.auth_method) && (
                <p className="text-xs text-muted-foreground">
                  This method authenticates without a stored secret, so nothing is written to the vault.
                </p>
              )}
            </div>
          )}

          {step.id === 'test' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                The connection record has been created as {created?.status ?? 'READY_TO_TEST'}. The probe runs
                entirely server-side against a fixed AURA-owned target.
              </p>
              <Button size="sm" variant="outline" className="min-h-[32px]" onClick={handleTest} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                Run health check
              </Button>
              {check && (
                <div className="rounded-md border border-border p-3 text-xs">
                  <p className="font-medium">{check.status}</p>
                  <p className="text-muted-foreground">
                    network {check.network_result ?? 'n/a'} · auth {check.auth_result ?? 'n/a'} · data {check.data_availability ?? 'n/a'} · {check.latency_ms ?? '—'} ms
                  </p>
                  <p className="text-muted-foreground">{check.safe_message}</p>
                  <p className="text-muted-foreground">Correlation {check.correlation_id}</p>
                </div>
              )}
            </div>
          )}

          {step.id === 'activate' && (
            <div className="space-y-3 text-xs text-muted-foreground">
              <p>
                Activation enables the connection and records an audit event. A passing check proves
                reachability and authorisation, not data flow: the status becomes
                &quot;Connected, no data&quot; until records are actually received.
              </p>
              <Button size="sm" className="min-h-[32px]" onClick={handleActivate} disabled={busy || !lastCheckPassed}>
                {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                Activate connection
              </Button>
            </div>
          )}

          {validation.reason && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground" role="status">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {validation.reason}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[32px]"
            onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
            disabled={stepIndex === 0 || busy || Boolean(created && stepIndex <= 4)}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="min-h-[32px]" onClick={() => onOpenChange(false)} disabled={busy}>
              {created ? 'Close' : 'Cancel'}
            </Button>
            {stepIndex < WIZARD_STEPS.length - 1 && (
              <Button size="sm" className="min-h-[32px]" onClick={handleNext} disabled={!validation.complete || busy}>
                {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                {step.id === 'authentication' && !created ? 'Create connection' : 'Continue'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
