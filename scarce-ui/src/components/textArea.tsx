import type { ComponentProps } from 'react';
import { Textarea as UiTextarea } from '@/components/ui/textarea';

/**
 * Thin wrapper over shadcn's Textarea component providing app-level indirection.
 * Exists to abstract the UI library and allow easy replacement if needed.
 */
export type TextAreaProps = ComponentProps<typeof UiTextarea>;

/**
 * Renders a shadcn Textarea with all props passed through.
 *
 * @param props - TextAreaProps from the shadcn Textarea component.
 */
export function TextArea(props: TextAreaProps) {
  return <UiTextarea {...props} />;
}
