import type { ComponentProps } from 'react';
import { Input as UiInput } from '@/components/ui/input';

/**
 * Thin wrapper over shadcn's Input component providing app-level indirection.
 * Exists to abstract the UI library and allow easy replacement if needed.
 */
export type InputProps = ComponentProps<typeof UiInput>;

/**
 * Renders a shadcn Input with all props passed through.
 *
 * @param props - InputProps from the shadcn Input component.
 */
export function Input(props: InputProps) {
  return <UiInput {...props} />;
}
