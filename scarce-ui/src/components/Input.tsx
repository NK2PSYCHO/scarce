import type { ComponentProps } from 'react';
import { Input as UiInput } from '@/components/ui/input';

export type InputProps = ComponentProps<typeof UiInput>;

export function Input(props: InputProps) {
  return <UiInput {...props} />;
}
