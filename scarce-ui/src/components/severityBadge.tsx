/**
 * @packageDocumentation
 * Small pill showing a Cairn's severity tier.
 */

import type { CairnSeverity } from '@models/cairn';
import { cn } from '@/lib/utils';

/**
 * Props for the SeverityBadge component.
 */
export interface SeverityBadgeProps {
  /**
   * Severity tier to display.
   */
  severity: CairnSeverity;

  /**
   * Optional extra class names merged onto the badge.
   */
  className?: string;
}

/**
 * Display label and theme-aware colour classes for each severity. The label is
 * always rendered as text so colour is never the only signal.
 */
const SEVERITY_STYLES: Record<CairnSeverity, { label: string; classes: string }> = {
  normal: {
    label: 'Normal',
    classes: 'text-muted-foreground border-border',
  },
  high: {
    label: 'High',
    classes:
      'text-(color:--vscode-editorWarning-foreground) border-(color:--vscode-editorWarning-foreground)',
  },
  critical: {
    label: 'Critical',
    classes:
      'text-(color:--vscode-editorError-foreground) border-(color:--vscode-editorError-foreground)',
  },
};

/**
 * Renders a Cairn severity as a small bordered label. Colours come from VS Code
 * theme variables so the badge follows light and dark themes.
 *
 * @param props - See {@link SeverityBadgeProps}.
 * @returns The rendered badge.
 */
export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const { label, classes } = SEVERITY_STYLES[severity];
  return (
    <span
      data-severity={severity}
      className={cn(
        'inline-flex items-center rounded-sm border px-1.5 py-0.5 text-xs leading-none font-medium',
        classes,
        className,
      )}
    >
      {label}
    </span>
  );
}
