export interface CredentialHealthEvidence {
  lastCheckStatus?: string | null;
  lastCheckStartedAt?: string | null;
  credentialStatus?: string | null;
  credentialRotatedAt?: string | null;
}

/**
 * A passing health check is valid only for the credential version that existed
 * when the check began. Credential rotation invalidates older health evidence.
 */
export function credentialHealthEvidenceIsCurrent(input: CredentialHealthEvidence): boolean {
  if (input.lastCheckStatus !== 'PASSED') return false;
  if (!input.credentialRotatedAt) return true;
  if (input.credentialStatus && input.credentialStatus !== 'ACTIVE') return false;
  if (!input.lastCheckStartedAt) return false;

  const checkTime = new Date(input.lastCheckStartedAt).getTime();
  const rotationTime = new Date(input.credentialRotatedAt).getTime();
  if (!Number.isFinite(checkTime) || !Number.isFinite(rotationTime)) return false;
  return checkTime >= rotationTime;
}
