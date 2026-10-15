/**
 * @packageDocumentation
 * App-level wrapper around shadcn's Label component.
 */

import type { ComponentProps } from 'react';
import { Label as UiLabel } from '@/components/ui/label';

/**
 * Props accepted by {@link Label}; identical to the shadcn Label props.
 */
export type LabelProps = ComponentProps<typeof UiLabel>;

/**
 * Thin wrapper over shadcn's Label that passes every prop through. Gives the app
 * one import point so the UI library can be swapped without touching callers.
 *
 * @param props - See {@link LabelProps}.
 * @returns The rendered Label.
 */
export function Label(props: LabelProps) {
  return <UiLabel {...props} />;
}
