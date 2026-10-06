import type { ComponentProps } from 'react';
import { Textarea as UiTextarea } from '@/components/ui/textarea';

export type TextAreaProps = ComponentProps<typeof UiTextarea>;

export function TextArea(props: TextAreaProps) {
  return <UiTextarea {...props} />;
}
