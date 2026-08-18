/**
 * Phase 2 - canonical simulation execution taxonomy.
 *
 * This is the ONLY place an execution class may be defined. A renderer mode
 * (`src/renderer/rendererModes.ts`) is a different axis and must never be
 * mixed into this union.
 */

export const SIMULATION_EXECUTION_CLASSES = [
  /** AURA code, no randomness at all: identical input gives identical output. */
  'aura-deterministic',
  /** AURA code with randomness, driven exclusively by a recorded seed. */
  'aura-stochastic-seeded',
  /** Scripted fixtures replayed for preview. Never a run of record. */
  'fixture-preview',
  /** A non-NVIDIA third-party solver executed outside AURA. */
  'external-solver',
  /** An NVIDIA solver service executed outside AURA. */
  'nvidia-solver',
  /** Values measured from a verified live source. */
  'measured-live',
  /** No execution happened; the result carries no values. */
  'unavailable',
] as const;

export type SimulationExecutionClass = (typeof SIMULATION_EXECUTION_CLASSES)[number];

export function isSimulationExecutionClass(value: unknown): value is SimulationExecutionClass {
  return (
    typeof value === 'string' &&
    (SIMULATION_EXECUTION_CLASSES as readonly string[]).includes(value)
  );
}

/** Classes that require an external runtime to have actually executed. */
export const EXTERNAL_EXECUTION_CLASSES: readonly SimulationExecutionClass[] = [
  'external-solver',
  'nvidia-solver',
  'measured-live',
];

export function requiresExternalRuntime(cls: SimulationExecutionClass): boolean {
  return EXTERNAL_EXECUTION_CLASSES.includes(cls);
}