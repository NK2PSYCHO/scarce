/**
 * @packageDocumentation
 * App-level wrapper around shadcn's Button component.
 */

import type { ComponentProps } from 'react';
import { Button as UiButton } from '@/components/ui/button';

/**
 * Props accepted by {@link Button}; identical to the shadcn Button props.
 */
export type ButtonProps = ComponentProps<typeof UiButton>;

/**
 * Thin wrapper over shadcn's Button that passes every prop through. Gives the app
 * one import point so the UI library can be swapped without touching callers.
 *
 * @param props - See {@link ButtonProps}.
 * @returns The rendered Button.
 */
export function Button(props: ButtonProps) {
  return <UiButton {...props} />;
}
