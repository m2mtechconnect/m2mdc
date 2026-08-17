# Assistant grounding

## Required behaviour

The AURA Assistant must cite the dataset/source record, distinguish NVIDIA
sample values from AURA results, refuse to describe reference data as live,
refuse to infer missing operational values, state the mismatch rather than
answering a Montreal question with another site's values, and preserve role and
tenant restrictions.

## Status: NOT IMPLEMENTED

The grounding contract exists in data (`ReferenceRecord` carries the citation
fields, `MONTREAL_DERIVED_SCENARIO.missingInputs` enumerates what must be
refused), but the assistant has not been rewired to the reference dataset. No
grounding test was run and no grounding claim is made.
