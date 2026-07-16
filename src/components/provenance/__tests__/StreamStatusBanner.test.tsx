import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreamStatusBanner } from '@/components/provenance/ProvenanceBadge';

describe('StreamStatusBanner — cause-specific messaging (Phase 1A.1)', () => {
  it('renders the verbatim invalid-response string', () => {
    render(<StreamStatusBanner reason="kit-invalid" />);
    expect(
      screen.getByText('Kit response invalid — displaying local demonstration data.'),
    ).toBeInTheDocument();
  });

  it('renders the verbatim unavailable string', () => {
    render(<StreamStatusBanner reason="kit-unavailable" />);
    expect(
      screen.getByText('Kit unavailable — displaying local demonstration data.'),
    ).toBeInTheDocument();
  });

  it('renders a distinct disabled message', () => {
    render(<StreamStatusBanner reason="kit-disabled" />);
    expect(
      screen.getByText(/Kit disabled by configuration/i),
    ).toBeInTheDocument();
  });

  it('is hidden when reason is null', () => {
    const { container } = render(<StreamStatusBanner reason={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('does NOT collapse invalid and unavailable into the same string', () => {
    const { unmount } = render(<StreamStatusBanner reason="kit-invalid" />);
    const invalid = document.body.textContent;
    unmount();
    render(<StreamStatusBanner reason="kit-unavailable" />);
    const unavailable = document.body.textContent;
    expect(invalid).not.toEqual(unavailable);
  });
});