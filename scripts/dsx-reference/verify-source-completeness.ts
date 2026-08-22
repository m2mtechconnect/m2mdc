import { createHash } from 'node:crypto';
import {
  NVIDIA_PUBLIC_DEMO_EXPECTED_RECORD_COUNT,
  NVIDIA_PUBLIC_DEMO_EXPECTED_SOURCE_CONFLICT_GROUPS,
  NVIDIA_PUBLIC_DEMO_EXPECTED_SOURCE_CONFLICT_RECORDS,
  sourceCoverageSummary,
} from '../../src/data/dsxReference/sourceCoverage';
import { DSX_REFERENCE_RECORDS, DSX_SOURCE_COMMIT } from '../../src/data/dsxReference/records';

const OWNER = 'NVIDIA-Omniverse-blueprints';
const REPO = 'omniverse-dsx-blueprint-for-ai-factories';
const SOURCE_FILES: Record<string, string> = {
  'web/src/data/options.ts': '3c51421116da7c366dfc9e34ed29de03cbbdae5da50b3b6381ab24777c3bac80',
  'web/src/data/kpis.ts': 'c40c7f91e7ba8a3ff27121667d8372822601c6161e4f8c7971c1c81bbb342adc',
  'web/src/data/configs.ts': 'ee4ae99c177874631131628a6773079349e176a2ecca041cddeace3cb86001e9',
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'aura-dsx-reference-verifier' },
  });
  if (!response.ok) throw new Error(`fetch failed ${response.status}: ${url}`);
  return response.text();
}

async function main() {
  const branch = JSON.parse(
    await fetchText(`https://api.github.com/repos/${OWNER}/${REPO}/branches/main`),
  ) as { commit?: { sha?: string } };
  const currentMain = branch.commit?.sha;
  if (currentMain !== DSX_SOURCE_COMMIT) {
    throw new Error(
      `NVIDIA demo source moved: pinned=${DSX_SOURCE_COMMIT} current-main=${currentMain ?? '<missing>'}. ` +
        'Re-audit before changing the pinned reference dataset.',
    );
  }

  for (const [path, expected] of Object.entries(SOURCE_FILES)) {
    const content = await fetchText(
      `https://raw.githubusercontent.com/${OWNER}/${REPO}/${DSX_SOURCE_COMMIT}/${path}`,
    );
    const actual = sha256(content);
    if (actual !== expected) {
      throw new Error(`checksum mismatch ${path}: expected=${expected} actual=${actual}`);
    }
  }

  const summary = sourceCoverageSummary(DSX_REFERENCE_RECORDS);
  if (summary.records !== NVIDIA_PUBLIC_DEMO_EXPECTED_RECORD_COUNT) {
    throw new Error(
      `reference record count mismatch: expected=${NVIDIA_PUBLIC_DEMO_EXPECTED_RECORD_COUNT} actual=${summary.records}`,
    );
  }
  if (summary.byConsistency.SOURCE_CONFLICT !== NVIDIA_PUBLIC_DEMO_EXPECTED_SOURCE_CONFLICT_RECORDS) {
    throw new Error(
      `source-conflict record mismatch: expected=${NVIDIA_PUBLIC_DEMO_EXPECTED_SOURCE_CONFLICT_RECORDS} actual=${summary.byConsistency.SOURCE_CONFLICT}`,
    );
  }
  if (summary.conflictGroups !== NVIDIA_PUBLIC_DEMO_EXPECTED_SOURCE_CONFLICT_GROUPS) {
    throw new Error(
      `source-conflict group mismatch: expected=${NVIDIA_PUBLIC_DEMO_EXPECTED_SOURCE_CONFLICT_GROUPS} actual=${summary.conflictGroups}`,
    );
  }

  const expectedByFile: Record<string, number> = {
    'web/src/data/options.ts': 23,
    'web/src/data/kpis.ts': 87,
    'web/src/data/configs.ts': 155,
  };
  for (const [file, expected] of Object.entries(expectedByFile)) {
    if (summary.bySourceFile[file] !== expected) {
      throw new Error(
        `source coverage mismatch ${file}: expected=${expected} actual=${summary.bySourceFile[file] ?? 0}`,
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        status: 'AURA_NVIDIA_PUBLIC_DEMO_REFERENCE_SOURCE_COMPLETE',
        pinnedCommit: DSX_SOURCE_COMMIT,
        currentNvidiaMain: currentMain,
        records: summary.records,
        sourceConflictRecords: summary.byConsistency.SOURCE_CONFLICT,
        sourceConflictGroups: summary.conflictGroups,
        sourceFiles: summary.bySourceFile,
        measured: false,
        operational: false,
        currentDsxReferenceDesignParityClaimed: false,
        ngcDatasetIncluded: false,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
