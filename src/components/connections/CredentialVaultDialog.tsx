/**
 * Credential vault dialog: store, rotate and revoke the credential for one
 * connection. The dialog can display metadata only — fingerprint, version,
 * rotation date and expiry. No endpoint returns the stored value, so there is
 * deliberately no "reveal" affordance to build.
 */
import { useEffect, useState } from 'react';
import { KeyRound, Loader2, ShieldAlert } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import {
  getConnectionCredentialStatus,
  revokeConnectionCredential,
  storeConnectionCredential,
  type CredentialMetadata,
} from '@/connections/api';
import { MIN_CREDENTIAL_LENGTH } from '@/connections/wizardModel';
import type { ConnectionInstance } from '@/connections/model';

function fmt(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not set';
}

export function CredentialVaultDialog({
  connection,
  open,
  onOpenChange,
  onChanged,
}: {
  connection: ConnectionInstance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [credential, setCredential] = useState<CredentialMetadata | null>(null);
  const [secret, setSecret] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !connection) return;
    setSecret('');
    setExpiresAt('');
    setLoadError(null);
    setLoading(true);
    getConnectionCredentialStatus(connection.id)
      .then((result) => {
        setCredential(result);
        setExpiresAt(result?.expires_at ? result.expires_at.slice(0, 10) : '');
      })
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : 'Vault status unavailable.'))
      .finally(() => setLoading(false));
  }, [open, connection]);

  const authMethod = credential?.auth_method
    ?? (connection?.configuration as { auth_method?: string } | null)?.auth_method
    ?? '';
  const tooShort = secret.trim().length > 0 && secret.trim().length < MIN_CREDENTIAL_LENGTH;

  async function handleSubmit() {
    if (!connection) return;
    setBusy(true);
    try {
      const saved = await storeConnectionCredential(connection.id, secret, {
        authMethod,
        expiresAt: expiresAt ? new Date(`${expiresAt}T00:00:00Z`).toISOString() : null,
        rotate: Boolean(credential),
      });
      setCredential(saved);
      setSecret('');
      toast({
        title: credential ? 'Credential rotated' : 'Credential stored',
        description: `Version ${saved.version}, fingerprint ${saved.fingerprint}. The value cannot be displayed again.`,
      });
      onChanged();
    } catch (error) {
      toast({
        title: 'Vault refused the credential',
        description: error instanceof Error ? error.message : 'The server rejected the request.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    if (!connection || !credential) return;
    if (!window.confirm('Revoke this credential? The stored material is destroyed and the connection is disabled.')) return;
    setBusy(true);
    try {
      await revokeConnectionCredential(connection.id);
      setCredential(null);
      toast({ title: 'Credential revoked', description: 'The connection was disabled until a new credential is stored.' });
      onChanged();
    } catch (error) {
      toast({
        title: 'Revocation refused',
        description: error instanceof Error ? error.message : 'The server rejected the request.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" aria-hidden />
            Credential vault
          </DialogTitle>
          <DialogDescription className="text-xs">
            {connection?.display_name}. Credentials are encrypted server-side and stored in a table
            no signed-in user can read. AURA can show the fingerprint, version and rotation date only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Reading vault status
            </p>
          )}
          {loadError && (
            <p className="flex items-start gap-2 text-xs text-destructive">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {loadError}
            </p>
          )}

          {!loading && (
            <dl className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 text-xs">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                {credential
                  ? <Badge variant="outline" className="text-xs">{credential.status} · v{credential.version}</Badge>
                  : <Badge variant="outline" className="text-xs">No credential stored</Badge>}
              </dd>
              <dt className="text-muted-foreground">Authentication method</dt>
              <dd>{authMethod || 'Unknown'}</dd>
              <dt className="text-muted-foreground">Fingerprint</dt>
              <dd className="font-mono">{credential?.fingerprint ?? 'Not applicable'}</dd>
              <dt className="text-muted-foreground">Last rotated</dt>
              <dd>{fmt(credential?.last_rotated_at ?? null)}</dd>
              <dt className="text-muted-foreground">Expires</dt>
              <dd>{fmt(credential?.expires_at ?? null)}</dd>
            </dl>
          )}

          <div className="space-y-2">
            <Label htmlFor="vault-secret" className="text-xs">
              {credential ? 'New credential' : 'Credential'}
            </Label>
            <Input
              id="vault-secret"
              type="password"
              autoComplete="new-password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="h-9 text-sm"
              placeholder="Paste the credential issued by the source system"
            />
            {tooShort && (
              <p className="text-xs text-destructive">
                The vault requires at least {MIN_CREDENTIAL_LENGTH} characters.
              </p>
            )}
            <Label htmlFor="vault-expiry" className="text-xs">Expiry (optional)</Label>
            <Input
              id="vault-expiry"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="h-9 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Rotation replaces the stored material in place and increments the version. The previous
              value is destroyed, not archived, and every change is written to the audit trail.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {credential && (
            <Button variant="outline" size="sm" className="min-h-[32px]" onClick={handleRevoke} disabled={busy}>
              Revoke
            </Button>
          )}
          <Button
            size="sm"
            className="min-h-[32px]"
            onClick={handleSubmit}
            disabled={busy || secret.trim().length < MIN_CREDENTIAL_LENGTH}
          >
            {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {credential ? 'Rotate credential' : 'Store credential'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
