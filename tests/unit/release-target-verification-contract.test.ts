import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import {
  LESSON_REGISTRY_VERSION,
  lessonById,
  verifyLessonRegistryIntegrity,
} from '../../supabase/functions/_shared/learning/lessonRegistry';
import { retrieveApprovedLessons } from '../../supabase/functions/_shared/learning/lessonRetrieval';
import { TRUTH_EVAL_CASES } from '../../supabase/functions/_shared/learning/truthEvalCases';
import { runTruthEvals } from '../../supabase/functions/_shared/learning/truthEvalRunner';

interface WorkflowStep {
  name?: string;
  shell?: string;
  run?: string;
}

interface WorkflowJob {
  steps?: WorkflowStep[];
}

interface WorkflowDocument {
  jobs?: Record<string, WorkflowJob>;
}

const WORKFLOW_PATH = path.resolve('.github/workflows/release-target-verification.yml');

function workflow(): WorkflowDocument {
  return parse(fs.readFileSync(WORKFLOW_PATH, 'utf8')) as WorkflowDocument;
}

function steps(): WorkflowStep[] {
  return Object.values(workflow().jobs ?? {}).flatMap((job) => job.steps ?? []);
}

function unterminatedHeredocs(script: string): string[] {
  const lines = script.split(/\r?\n/);
  const failures: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/<<(-?)\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\2/);
    if (!match) continue;

    const allowsTabs = match[1] === '-';
    const marker = match[3];
    const terminator = allowsTabs ? new RegExp(`^\\t*${marker}$`) : new RegExp(`^${marker}$`);
    const terminated = lines.slice(index + 1).some((line) => terminator.test(line));
    if (!terminated) failures.push(`line ${index + 1}: ${marker}`);
  }

  return failures;
}

describe('release target verification workflow contract', () => {
  it('keeps every Bash heredoc terminator valid after YAML indentation is removed', () => {
    const failures = steps()
      .filter((step) => step.shell === 'bash' && typeof step.run === 'string')
      .flatMap((step) => unterminatedHeredocs(step.run!).map((failure) => `${step.name}: ${failure}`));

    expect(failures).toEqual([]);
  });

  it('keeps the published-route smoke gate fail-closed on cross-origin redirects', () => {
    const step = steps().find((candidate) =>
      candidate.name === 'Smoke published routes without cross-origin redirects');

    expect(step?.shell).toBe('bash');
    expect(step?.run).toContain('"/" "/manage/integrations" "/admin/platform-readiness"');
    expect(step?.run).toContain('APPROVED_ORIGIN');
    expect(step?.run).toContain('EFFECTIVE_URL');
    expect(step?.run).toContain('effective.origin !== approved.origin');
    expect(step?.run).toContain('DEPLOYMENT_BLOCKED');
  });
});

describe('release workflow shell-syntax governed lesson', () => {
  const lessonId = 'release-workflow-shell-syntax-parity.v1';
  const evalId = 'lesson-release-workflow-shell-syntax-active';

  it('is reviewed, active, versioned and keeps the registry valid', () => {
    const lesson = lessonById(lessonId);
    expect(LESSON_REGISTRY_VERSION).toBe('2026-09-02.1');
    expect(lesson?.status).toBe('active');
    expect(lesson?.origin).toBe('confirmed-miss');
    expect(lesson?.dataClass).toBe('reviewed-lesson');
    expect(verifyLessonRegistryIntegrity()).toMatchObject({ ok: true, problems: [] });
  });

  it('is retrievable for the confirmed failure mechanism', () => {
    const result = retrieveApprovedLessons(
      'Why did the GitHub Actions release workflow route smoke fail with a heredoc unexpected end of file?',
    );
    expect(result.lessonIds).toContain(lessonId);
  });

  it('is exercised by the shared synthetic truth-evaluation runner', () => {
    const evalCase = TRUTH_EVAL_CASES.find((candidate) => candidate.id === evalId);
    const result = runTruthEvals().results.find((candidate) => candidate.id === evalId);
    expect(evalCase?.dataClass).toBe('synthetic-evaluation-data');
    expect(result).toMatchObject({ passed: true, failures: [] });
  });
});
