/**
 * Curated axe rule list shared by the a11y specs.
 *
 * Enforce (merge-blocking):
 *   • Labeled form controls.
 *   • Accessible names on interactive widgets.
 *   • ARIA attribute name/value correctness.
 *
 * Excluded on purpose (high-noise on Radix/shadcn primitives, still
 * worth manual review — just not merge-blocking):
 *   • aria-allowed-attr  — Radix combobox trips this with aria-expanded.
 *   • aria-required-children / aria-required-parent — Radix menus and
 *     tabs re-parent into portals, tripping the DOM-shape checks.
 *   • aria-hidden-focus / aria-hidden-body — dialogs briefly toggle
 *     aria-hidden on siblings during open/close animations.
 *   • aria-roles — Radix Slot/asChild re-applies roles that axe
 *     misreads on custom triggers.
 */
export const A11Y_BLOCKING_RULES = [
  // Labeled form controls.
  'label',
  'form-field-multiple-labels',
  'select-name',
  'aria-input-field-name',
  // Accessible names on interactive widgets.
  'button-name',
  'link-name',
  'image-alt',
  // ARIA attribute correctness (name/value shape, not structure).
  'aria-required-attr',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'duplicate-id-aria',
];