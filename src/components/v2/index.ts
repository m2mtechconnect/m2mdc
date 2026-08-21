/**
 * AURA DC Visual System V2 — shared presentation primitives.
 * Pages should compose these instead of one-off page CSS.
 */
export { Panel, SubPanel, TelemetryRail } from './Panel';
export type { PanelElevation, PanelProps } from './Panel';

export { Instrument, InstrumentGrid } from './Instrument';
export type { InstrumentLevel, InstrumentState, InstrumentProps } from './Instrument';

export { ProvenanceBadgeV2 } from './ProvenanceBadgeV2';
export type { TruthState, ProvenanceBadgeV2Props } from './ProvenanceBadgeV2';

export { CommandHeader, SectionHeader } from './CommandHeader';
export type { CommandHeaderProps } from './CommandHeader';

export { InspectorPanel, InspectorField } from './InspectorPanel';
export type { InspectorPanelProps } from './InspectorPanel';

export { OperationalTable, OperationalRow, NumericCell } from './OperationalTable';

export { StateView, SkeletonBlock } from './StateView';
export type { StateKind, StateViewProps } from './StateView';

export { useAuraV2Theme, AURA_V2_CLASS } from './useAuraV2Theme';
