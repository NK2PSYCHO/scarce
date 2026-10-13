import type { ComponentProps } from 'react';
import { Label as UiLabel } from '@/components/ui/label';

/**
 * Thin wrapper over shadcn's Label component providing app-level indirection.
 * Exists to abstract the UI library and allow easy replacement if needed.
 */
export type LabelProps = ComponentProps<typeof UiLabel>;

/**
 * Renders a shadcn Label with all props passed through.
 *
 * @param props - LabelProps from the shadcn Label component.
 */
export function Label(props: LabelProps) {
  return <UiLabel {...props} />;
}
