export type AuraDeploymentType =
  | 'shared_cloud'
  | 'dedicated_cloud'
  | 'private_cloud'
  | 'hybrid'
  | 'sovereign_air_gapped';

export type DeploymentCapabilityStatus = 'AVAILABLE' | 'PARTIAL' | 'PLANNED' | 'UNAVAILABLE';

export interface AuraDeploymentOffering {
  type: AuraDeploymentType;
  label: string;
  shortLabel: string;
  capabilityStatus: DeploymentCapabilityStatus;
  description: string;
  controlPlane: string;
  dataPlane: string;
  edgeRequired: boolean;
  customerManaged: boolean;
  automation: 'EXISTING_PLATFORM' | 'MANUAL' | 'PARTIAL' | 'AUTOMATED' | 'NOT_AVAILABLE';
  truthNote: string;
}

/**
 * Commercial deployment catalogue. Status is deliberately conservative:
 * availability means a runtime topology exists today, not that a UI option is
 * present or an infrastructure schema can describe it.
 */
export const AURA_DEPLOYMENT_OFFERINGS: readonly AuraDeploymentOffering[] = [
  {
    type: 'shared_cloud',
    label: 'AURA Cloud Shared',
    shortLabel: 'Shared Cloud',
    capabilityStatus: 'AVAILABLE',
    description: 'M2M-managed AURA application with logical organization isolation in the shared cloud control/data plane.',
    controlPlane: 'M2M-managed cloud',
    dataPlane: 'M2M-managed cloud',
    edgeRequired: false,
    customerManaged: false,
    automation: 'EXISTING_PLATFORM',
    truthNote: 'Current operating topology. Organization isolation is logical/RLS-based; this does not imply a dedicated customer VPC.',
  },
  {
    type: 'dedicated_cloud',
    label: 'AURA Cloud Dedicated',
    shortLabel: 'Dedicated Cloud',
    capabilityStatus: 'PLANNED',
    description: 'A dedicated customer cloud environment managed by M2M.',
    controlPlane: 'Dedicated customer environment',
    dataPlane: 'Dedicated customer environment',
    edgeRequired: false,
    customerManaged: false,
    automation: 'NOT_AVAILABLE',
    truthNote: 'Planned. No automated per-customer cloud provisioner is connected yet.',
  },
  {
    type: 'private_cloud',
    label: 'AURA Private',
    shortLabel: 'Private Cloud',
    capabilityStatus: 'PLANNED',
    description: 'AURA packaged for a customer-controlled VPC, private cloud, or on-premises platform.',
    controlPlane: 'Customer environment',
    dataPlane: 'Customer environment',
    edgeRequired: false,
    customerManaged: true,
    automation: 'NOT_AVAILABLE',
    truthNote: 'Planned. Portable application packaging, Helm and infrastructure modules are not yet release-qualified.',
  },
  {
    type: 'hybrid',
    label: 'AURA Hybrid',
    shortLabel: 'Hybrid',
    capabilityStatus: 'PARTIAL',
    description: 'AURA cloud control plane with an organization-bound edge gateway inside the customer network.',
    controlPlane: 'M2M-managed or dedicated cloud',
    dataPlane: 'Customer site + cloud',
    edgeRequired: true,
    customerManaged: false,
    automation: 'PARTIAL',
    truthNote: 'Partial architecture. MQTT/edge scaffolding exists, but the AURA Edge Gateway product contract is not yet deployment-qualified.',
  },
  {
    type: 'sovereign_air_gapped',
    label: 'AURA Sovereign / Air-Gapped',
    shortLabel: 'Sovereign',
    capabilityStatus: 'PLANNED',
    description: 'Offline or isolated deployment for sovereign and highly regulated environments.',
    controlPlane: 'Customer sovereign environment',
    dataPlane: 'Customer sovereign environment',
    edgeRequired: false,
    customerManaged: true,
    automation: 'NOT_AVAILABLE',
    truthNote: 'Planned. Offline registry, update, identity, backup and support procedures are not yet release-qualified.',
  },
] as const;

export function deploymentOffering(type: string | null | undefined): AuraDeploymentOffering {
  return AURA_DEPLOYMENT_OFFERINGS.find((offering) => offering.type === type)
    ?? AURA_DEPLOYMENT_OFFERINGS[0];
}
