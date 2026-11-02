/**
 * @packageDocumentation
 * Component tests for `SeverityBadge`: label text and severity marker per tier.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CairnSeverity } from '@models/cairn';
import { SeverityBadge } from '@/components/severityBadge';

describe('SeverityBadge', () => {
  it.each<[CairnSeverity, string]>([
    ['normal', 'Normal'],
    ['high', 'High'],
    ['critical', 'Critical'],
  ])('shows the %s severity as the text "%s"', (severity, label) => {
    render(<SeverityBadge severity={severity} />);
    expect(screen.getByText(label)).toHaveAttribute('data-severity', severity);
  });

  it('merges an extra className onto the badge', () => {
    render(<SeverityBadge severity="high" className="ml-2" />);
    expect(screen.getByText('High')).toHaveClass('ml-2');
  });
});
