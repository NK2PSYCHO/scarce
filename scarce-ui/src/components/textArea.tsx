/**
 * @packageDocumentation
 * App-level wrapper around shadcn's Textarea component.
 */

import type { ComponentProps } from 'react';
import { Textarea as UiTextarea } from '@/components/ui/textarea';

/**
 * Props accepted by {@link TextArea}; identical to the shadcn Textarea props.
 */
export type TextAreaProps = ComponentProps<typeof UiTextarea>;

/**
 * Thin wrapper over shadcn's Textarea that passes every prop through. Gives the app
 * one import point so the UI library can be swapped without touching callers.
 *
 * @param props - See {@link TextAreaProps}.
 * @returns The rendered Textarea.
 */
export function TextArea(props: TextAreaProps) {
  return <UiTextarea {...props} />;
}
