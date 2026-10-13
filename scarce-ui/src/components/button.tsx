import type { ComponentProps } from 'react';
import { Button as UiButton } from '@/components/ui/button';

/**
 * Thin wrapper over shadcn's Button component providing app-level indirection.
 * Exists to abstract the UI library and allow easy replacement if needed.
 */
export type ButtonProps = ComponentProps<typeof UiButton>;

/**
 * Renders a shadcn Button with all props passed through.
 *
 * @param props - ButtonProps from the shadcn Button component.
 */
export function Button(props: ButtonProps) {
  return <UiButton {...props} />;
}
