/**
 * Blueprint Components Index
 * Exports all blueprint-related components
 * 
 * MODE SEPARATION:
 * - Designer components: Full editing capability (mode="designer")
 * - Design View components: Read-only summary (mode="designView")
 * - Simulation components: Frozen snapshot (mode="simulationSnapshot")
 */

// Core Blueprint Components
export { ExecutiveSummaryBlock } from './ExecutiveSummaryBlock';
export { DomainHealthMap } from './DomainHealthMap';
export { DependencyGraph } from './DependencyGraph';
export { ChangeLogPanel } from './ChangeLogPanel';
export { AgentHealthPanel } from './AgentHealthPanel';
export { KPIEnhancementsPanel } from './KPIEnhancementsPanel';
export { WorkflowEnhancementsPanel } from './WorkflowEnhancementsPanel';
export { WorkflowVersionControl } from './WorkflowVersionControl';
export { WorkflowStructureValidation } from './WorkflowStructureValidation';
export { BlueprintValidationPanel } from './BlueprintValidationPanel';
export { BlueprintDesignerWrapper } from './BlueprintDesignerWrapper';
export { BlueprintSnapshotCard } from './BlueprintSnapshotCard';
export { BlueprintSummaryCard } from './BlueprintSummaryCard';
export { BlueprintReviewSection } from './BlueprintReviewSection';
export { QuarantinedCapacityPanel } from './QuarantinedCapacityPanel';

// Stage 7K — Model operator workspace
export { BlueprintModelWorkspace } from './model/BlueprintModelWorkspace';
export { OperatorSummaryStrip } from './model/OperatorSummaryStrip';
export { RequiresAttentionPanel } from './model/RequiresAttentionPanel';
export { ModelDetailSection } from './model/ModelDetailSection';
export { EvidenceChip } from './model/EvidenceChip';
export { buildBlueprintCapacityRecords } from './blueprintCapacityRecords';

// Mode-specific Headers
export { DesignerModeHeader } from './DesignerModeHeader';
export { DesignViewHeader } from './DesignViewHeader';
export { ReadOnlyGuard, useReadOnlyMode, withReadOnlyDisabled } from './ReadOnlyGuard';

// Tab Components
export { BlueprintOverviewTab } from './tabs/BlueprintOverviewTab';
export { BlueprintAgentsTab } from './tabs/BlueprintAgentsTab';
export { BlueprintDataTab } from './tabs/BlueprintDataTab';
export { BlueprintKPIsTab } from './tabs/BlueprintKPIsTab';
export { BlueprintWorkflowsTab } from './tabs/BlueprintWorkflowsTab';
export { BlueprintRolesTab } from './tabs/BlueprintRolesTab';
export { SimulationHandoffDialog } from './SimulationHandoffDialog';
export type { SimulationHandoffPreview } from './SimulationHandoffDialog';
