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

  it('applies the theme colour classes to high and critical', () => {
    const { unmount } = render(<SeverityBadge severity="high" />);
    const high = screen.getByText('High');
    expect(high).toHaveClass('text-(color:--vscode-editorWarning-foreground)');
    expect(high).not.toHaveClass('text-muted-foreground');
    unmount();

    render(<SeverityBadge severity="critical" />);
    const critical = screen.getByText('Critical');
    expect(critical).toHaveClass('text-(color:--vscode-editorError-foreground)');
    expect(critical).not.toHaveClass('text-muted-foreground');
  });

  it('merges an extra className onto the badge', () => {
    render(<SeverityBadge severity="high" className="ml-2" />);
    expect(screen.getByText('High')).toHaveClass('ml-2');
  });
});
