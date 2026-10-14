/**
 * @packageDocumentation
 * App-level wrapper around shadcn's Input component.
 */

import type { ComponentProps } from 'react';
import { Input as UiInput } from '@/components/ui/input';

/**
 * Props accepted by {@link Input}; identical to the shadcn Input props.
 */
export type InputProps = ComponentProps<typeof UiInput>;

/**
 * Thin wrapper over shadcn's Input that passes every prop through. Gives the app
 * one import point so the UI library can be swapped without touching callers.
 *
 * @param props - See {@link InputProps}.
 * @returns The rendered Input.
 */
export function Input(props: InputProps) {
  return <UiInput {...props} />;
}
