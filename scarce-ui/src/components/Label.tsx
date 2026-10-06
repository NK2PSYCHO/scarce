import type { ComponentProps } from 'react';
import { Label as UiLabel } from '@/components/ui/label';

export type LabelProps = ComponentProps<typeof UiLabel>;

export function Label(props: LabelProps) {
  return <UiLabel {...props} />;
}
