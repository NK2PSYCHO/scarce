/**
 * @packageDocumentation
 * Component tests for `CollapsibleSection`: default state, toggling and count.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleSection } from '@/components/collapsibleSection';

describe('CollapsibleSection', () => {
  it('starts expanded by default and shows its content', () => {
    render(<CollapsibleSection title="Group">content</CollapsibleSection>);
    expect(screen.getByRole('button', { name: /Group/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('starts collapsed with defaultOpen false and hides its content', () => {
    render(
      <CollapsibleSection title="Group" defaultOpen={false}>
        content
      </CollapsibleSection>,
    );
    expect(screen.getByRole('button', { name: /Group/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('content')).toBeNull();
  });

  it('toggles on click', async () => {
    const user = userEvent.setup();
    render(<CollapsibleSection title="Group">content</CollapsibleSection>);
    const toggle = screen.getByRole('button', { name: /Group/ });
    await user.click(toggle);
    expect(screen.queryByText('content')).toBeNull();
    await user.click(toggle);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('shows the count and tooltip', () => {
    render(
      <CollapsibleSection title="Group" count={3} tooltip="/full/path">
        content
      </CollapsibleSection>,
    );
    const toggle = screen.getByRole('button', { name: 'Group (3)' });
    expect(toggle).toHaveAttribute('title', '/full/path');
  });
});
