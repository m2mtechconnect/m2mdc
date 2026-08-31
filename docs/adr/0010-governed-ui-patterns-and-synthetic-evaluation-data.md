# ADR-0010: Governed UI patterns and synthetic evaluation data

Status: Accepted
Date: 2026-08-31

## Context

The enterprise readiness supervisor gained an engineering knowledge plane:
a retrieval-grounded corpus covering simulator/data-centre engineering,
OpenUSD/asset structure, governed UI/UX patterns and synthetic-data
governance, plus an evaluation suite that exercises retrieval and claim
guardrails. Three risks follow from adding any knowledge corpus to a
truth-governed product:

1. Corpus prose can drift into claims the repository cannot evidence
   (vendor integration, calibration, deployment, schema safety, production
   readiness).
2. Evaluation data can be mistaken for, or leak into, operational data.
3. Untracked corpus edits can silently change retrieval behaviour that
   tests and downstream consumers rely on.

Prior decisions already bind the product to truth-first rendering
(ADR-0006) and provenance-carrying data (ADR-0004). This ADR extends those
rules to knowledge and evaluation material.

## Decision

### 1. Retrieval grounding only, never fine-tuning

Engineering knowledge ships as a static, deterministic retrieval corpus
(`src/supervisor/knowledge/auraEngineeringKnowledge.ts`). No model weights
are trained or adjusted. Retrieval takes no tenant context, performs no
network or database IO, and a query the corpus cannot support returns an
explicit `no-grounding` result instead of a fabricated answer.

### 2. Version-pinned corpus

The corpus carries a manifest with a semantic version, pin date, entry
count and FNV-1a checksum. Contract tests recompute the checksum; any
content change without a version bump and re-pin fails qualification.
Evaluation expectations are re-reviewed against each new pin.

### 3. Original, provider-neutral prose with citations

Every entry is original prose written for AURA and cites public
specifications, documentation, research or repository artifacts. No
third-party code is copied. Public simulators and research projects
(for example OpenDC/OpenDT literature) may be cited as methodology
references only; no entry may state or imply that an external simulator or
vendor platform is embedded or wired in. Provider-neutral wording is
mandatory wherever runtime evidence is absent.

### 4. Evidence guardrails on restricted claims

Five claim categories are restricted: integration, calibration,
deployment, schema safety and production readiness. A grounded answer that
makes such a claim is blocked unless a valid evidence artifact of a class
that can actually prove that category is supplied
(`src/supervisor/knowledge/evidenceGuardrails.ts`). The corpus itself is
audited with the same scanner, so its own prose stays claim-free. The
default outcome is blocked; prose, intent or retrieved guidance never
upgrade a claim.

### 5. Synthetic evaluation data, labelled and separated

The evaluation suite (`src/supervisor/evals/supervisor-engineering-evals.json`)
declares `dataClass: synthetic-evaluation-data` in its header. All cases,
statements and artifact references in it are authored synthetic material:
never telemetry, never tenant or personal data, never an assertion about
production state. Evaluation data must not be rendered, exported or
summarized as operational data, mirroring the demonstration-fixture rules
in ADR-0006.

### 6. Governed UI patterns are corpus content, not new chrome

The UI/UX corpus entries encode the already-enforced product rules
(truth-first provenance labels, five-destination lifecycle navigation,
progressive disclosure, WCAG AA contrast). They exist so retrieval answers
match the contract tests; they do not authorize new routes, navigation or
visual-system changes, which remain governed by the existing
information-architecture rules.

## Consequences

- Corpus edits are deliberate: version bump, checksum re-pin and
  evaluation review travel together in one change.
- Downstream consumers can cite retrieval results with corpus version and
  citations attached, and can never pass an unevidenced restricted claim
  through the guardrails.
- The knowledge registry indexes the corpus, this ADR and the evaluation
  suite as approved-redacted sources, keeping the supervisor's ingestion
  rules (no secrets, no tenant data, explicit dispositions) intact.

## Enforcement

- `tests/unit/aura-engineering-knowledge-contract.test.ts` — corpus
  versioning, checksum pin, citation and tenant-safety invariants,
  deterministic retrieval and anti-fabrication behaviour.
- `tests/unit/evidence-guardrails-contract.test.ts` — fail-closed claim
  evaluation for all five restricted categories and vendor-term handling.
- `tests/unit/supervisor-engineering-evals.test.ts` — suite shape, the
  synthetic data-class declaration and all fourteen evaluation cases.
