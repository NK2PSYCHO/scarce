import { Label } from '@/components/label';

/**
 * Props for the Field component.
 */
export interface FieldProps {
  /**
   * Label text to display above the field.
   */
  label: string;

  /**
   * ID of the input element this label is associated with.
   */
  htmlFor: string;

  /**
   * The form control children to render below the label.
   */
  children: React.ReactNode;

  /**
   * Optional error message to display below the control.
   */
  error?: string;
}

/**
 * Combines a Label, form control, and optional error message into a single
 * field group with consistent spacing and accessibility.
 *
 * @param props - FieldProps for configuring the field layout.
 */
export function Field({ label, htmlFor, children, error }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
