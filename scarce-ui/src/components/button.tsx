import type { ComponentProps } from 'react';
import { Button as UiButton } from '@/components/ui/button';

export type ButtonProps = ComponentProps<typeof UiButton>;

export function Button(props: ButtonProps) {
  return <UiButton {...props} />;
}
