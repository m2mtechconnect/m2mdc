export type AuraBillingProvider = 'none' | 'chargebee' | 'stripe' | 'paddle';
export type AuraBillingCapabilityStatus = 'CONNECTOR_AVAILABLE' | 'NOT_CONFIGURED';

export interface AuraBillingProviderCapability {
  provider: Exclude<AuraBillingProvider, 'none'>;
  label: string;
  status: AuraBillingCapabilityStatus;
  liveSideEffectsEnabled: false;
  truthNote: string;
}

export const AURA_BILLING_PROVIDERS: readonly AuraBillingProviderCapability[] = [
  {
    provider: 'chargebee',
    label: 'Chargebee',
    status: 'CONNECTOR_AVAILABLE',
    liveSideEffectsEnabled: false,
    truthNote: 'Workspace connector is available; no AURA subscription or billing automation is configured by this phase.',
  },
  {
    provider: 'stripe',
    label: 'Stripe',
    status: 'CONNECTOR_AVAILABLE',
    liveSideEffectsEnabled: false,
    truthNote: 'Workspace connector is available; no checkout, customer, subscription or charge is created by this phase.',
  },
  {
    provider: 'paddle',
    label: 'Paddle',
    status: 'CONNECTOR_AVAILABLE',
    liveSideEffectsEnabled: false,
    truthNote: 'Workspace connector is available; no live billing workflow is enabled by this phase.',
  },
] as const;

export function billingProviderCapability(provider: string | null | undefined) {
  return AURA_BILLING_PROVIDERS.find((entry) => entry.provider === provider) ?? null;
}
