/**
 * WCAG 2.4.1 bypass block. Visually hidden until focused, then rendered as a
 * standard focusable control anchored to the single `main` landmark that each
 * shell already declares.
 */
export const MAIN_CONTENT_ID = 'main-content';

export function SkipToContent() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      data-testid="skip-to-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}
