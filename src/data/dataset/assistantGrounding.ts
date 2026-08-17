/**
 * Dataset-aware grounding for the AURA Assistant.
 *
 * The Assistant may answer a reference question ONLY from the normalized
 * records the caller is authorized to read. It cites record IDs, keeps units,
 * distinguishes NVIDIA reference facts from AURA-derived conclusions, and
 * abstains rather than guessing. General model knowledge may never be used to
 * fill a field blocked behind the NGC authorization wall.
 */
import {
  CLASSIFIED_FACILITIES,
  DSX_REFERENCE_RECORDS,
  MONTREAL_DERIVED_SCENARIO,
  type DatasetMode,
  type ReferenceRecord,
} from '@/data/dsxReference';
import { NGC_UNAVAILABLE, isNgcDependent } from './valueClassification';

export interface GroundingContext {
  dataset: DatasetMode;
  /** Facility currently in scope. Records outside it are never cited. */
  facilityId: string | null;
  isAdmin: boolean;
}

export type GroundingOutcome =
  | 'GROUNDED_REFERENCE'
  | 'AURA_DERIVED'
  | 'ABSTAIN_UNAVAILABLE'
  | 'ABSTAIN_UNAUTHORIZED'
  | 'ABSTAIN_OUT_OF_DATASET'
  | 'ABSTAIN_NO_MATCH';

export interface GroundedAnswer {
  outcome: GroundingOutcome;
  answer: string;
  citations: {
    recordId: string;
    datasetId: string;
    datasetVersion: string;
    sourceCommit: string;
    checksum: string;
    classification: string;
    value: string | null;
    unit: string | null;
  }[];
  /** Never true for an NVIDIA reference citation. */
  auraDerived: boolean;
}

const ABSTAIN_UNAVAILABLE_TEXT =
  `Unavailable. Required dataset ${NGC_UNAVAILABLE.requiredDataset} ${NGC_UNAVAILABLE.requiredVersion}; ` +
  `blocker: ${NGC_UNAVAILABLE.blocker}; last result ${NGC_UNAVAILABLE.lastAttemptedStatus}; ` +
  'no value substituted. I will not estimate this figure.';

function cite(record: ReferenceRecord) {
  return {
    recordId: record.record_id,
    datasetId: record.dataset_id,
    datasetVersion: record.dataset_version,
    sourceCommit: record.source_commit,
    checksum: record.source_checksum,
    classification: record.data_class,
    value: record.normalized_value === null ? null : String(record.normalized_value),
    unit: record.unit,
  };
}

/** Records the caller may read in the current context. No leakage across facilities. */
export function authorizedRecords(ctx: GroundingContext): ReferenceRecord[] {
  if (ctx.dataset !== 'nvidia-dsx-reference') return [];
  if (!ctx.isAdmin) return [];
  const facility = CLASSIFIED_FACILITIES.find((f) => f.id === ctx.facilityId) ?? null;
  if (!facility) return DSX_REFERENCE_RECORDS.slice();
  if (facility.facilityClass !== 'REFERENCE') return [];
  return DSX_REFERENCE_RECORDS.filter(
    (r) =>
      (facility.configurationId && r.configuration_id === facility.configurationId) ||
      (facility.site && r.site === facility.site) ||
      r.data_class === 'REFERENCE_SCENARIO',
  );
}

function tokens(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function scoreRecord(record: ReferenceRecord, terms: string[]): number {
  const haystack = [
    record.metric_label,
    record.metric_key ?? '',
    record.site ?? '',
    record.configuration_id ?? '',
    record.record_id,
  ]
    .join(' ')
    .toLowerCase();
  return terms.reduce((n, t) => (haystack.includes(t) ? n + 1 : n), 0);
}

/**
 * Answer a question strictly from the dataset in context.
 * Deterministic: the same question and context always produce the same answer.
 */
export function answerFromDataset(question: string, ctx: GroundingContext): GroundedAnswer {
  const empty: GroundedAnswer['citations'] = [];
  const terms = tokens(question);

  if (ctx.dataset !== 'nvidia-dsx-reference') {
    return {
      outcome: 'ABSTAIN_OUT_OF_DATASET',
      answer:
        'The NVIDIA DSX reference dataset is not active. I will not answer reference questions from another dataset.',
      citations: empty,
      auraDerived: false,
    };
  }

  if (!ctx.isAdmin) {
    return {
      outcome: 'ABSTAIN_UNAUTHORIZED',
      answer: 'The reference dataset is restricted to platform administrators.',
      citations: empty,
      auraDerived: false,
    };
  }

  // Montreal is AURA-authored: no NVIDIA fact may ever be attributed to it.
  if (terms.includes('montreal')) {
    const missing = MONTREAL_DERIVED_SCENARIO.missingInputs;
    return {
      outcome: 'AURA_DERIVED',
      answer:
        `${MONTREAL_DERIVED_SCENARIO.name} is AURA-authored, derived and simulated. It is not commissioned and ` +
        `not connected. ${missing.length} inputs are Not supplied: ${missing.join('; ')}. ` +
        'No NVIDIA site fact is attributed to this scenario.',
      citations: empty,
      auraDerived: true,
    };
  }

  const pool = authorizedRecords(ctx);
  if (pool.length === 0) {
    return {
      outcome: 'ABSTAIN_UNAUTHORIZED',
      answer: 'No reference records are readable in the current facility and dataset context.',
      citations: empty,
      auraDerived: false,
    };
  }

  // Explicitly blocked classes abstain before any matching is attempted.
  if (
    terms.some((t) => ['cfd', 'telemetry', 'history', 'historical', 'measured', 'live'].includes(t))
  ) {
    return {
      outcome: 'ABSTAIN_UNAVAILABLE',
      answer: ABSTAIN_UNAVAILABLE_TEXT,
      citations: empty,
      auraDerived: false,
    };
  }

  // A single weak term match is not grounding: it would let a plausible-looking
  // but unsupported question borrow an unrelated record.
  const minScore = terms.length >= 3 ? 2 : 1;
  const ranked = pool
    .map((r) => ({ r, score: scoreRecord(r, terms) }))
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score || a.r.record_id.localeCompare(b.r.record_id));

  if (ranked.length === 0) {
    return {
      outcome: 'ABSTAIN_NO_MATCH',
      answer:
        'No normalized reference record matches that question. I will not answer from general model knowledge.',
      citations: empty,
      auraDerived: false,
    };
  }

  const top = ranked.slice(0, 3).map((x) => x.r);
  if (top.every((r) => isNgcDependent(r.data_class))) {
    return {
      outcome: 'ABSTAIN_UNAVAILABLE',
      answer: ABSTAIN_UNAVAILABLE_TEXT,
      citations: empty,
      auraDerived: false,
    };
  }

  const lines = top.map((r) => {
    const v = r.normalized_value === null ? 'Not supplied' : String(r.normalized_value);
    const unit = r.unit ? ` ${r.unit}` : '';
    return `${r.metric_label}: ${v}${unit} (${r.record_id}, ${r.data_class})`;
  });

  return {
    outcome: 'GROUNDED_REFERENCE',
    answer:
      `NVIDIA DSX reference data, not measured and not live:\n${lines.join('\n')}\n` +
      `Source commit ${top[0].source_commit.slice(0, 8)}; dataset ${top[0].dataset_id}@${top[0].dataset_version}.`,
    citations: top.map(cite),
    auraDerived: false,
  };
}

/** Deterministic evaluation set covering each record type and both isolation rules. */
export interface GroundingEval {
  id: string;
  question: string;
  context: Partial<GroundingContext>;
  expect: GroundingOutcome;
}

export const GROUNDING_EVALS: readonly GroundingEval[] = [
  { id: 'kpi', question: 'What is the PUE for Virginia GB300?', context: {}, expect: 'GROUNDED_REFERENCE' },
  { id: 'spec', question: 'What is the Virginia power capacity specification?', context: {}, expect: 'GROUNDED_REFERENCE' },
  { id: 'config', question: 'List the Sweden GB200 configuration', context: {}, expect: 'GROUNDED_REFERENCE' },
  { id: 'scenario', question: 'Which electrical scenario operations exist?', context: {}, expect: 'GROUNDED_REFERENCE' },
  { id: 'montreal', question: 'What is the Montreal facility PUE?', context: {}, expect: 'AURA_DERIVED' },
  { id: 'ngc', question: 'Show the measured CFD telemetry history', context: {}, expect: 'ABSTAIN_UNAVAILABLE' },
  { id: 'nomatch', question: 'What is the canteen seating capacity?', context: {}, expect: 'ABSTAIN_NO_MATCH' },
  { id: 'nonadmin', question: 'What is the PUE?', context: { isAdmin: false }, expect: 'ABSTAIN_UNAUTHORIZED' },
  {
    id: 'legacy-dataset',
    question: 'What is the PUE?',
    context: { dataset: 'legacy-synthetic' },
    expect: 'ABSTAIN_OUT_OF_DATASET',
  },
];

export const DEFAULT_GROUNDING_CONTEXT: GroundingContext = {
  dataset: 'nvidia-dsx-reference',
  facilityId: null,
  isAdmin: true,
};