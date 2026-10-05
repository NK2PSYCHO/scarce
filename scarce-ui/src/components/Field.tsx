import { Label } from '@/components/Label';

export interface FieldProps {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  error?: string;
}

export function Field({ label, htmlFor, children, error }: FieldProps) {
  return (
    <div>
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
