/**
 * @packageDocumentation
 * Form for adding a Cairn, rendered in the sidebar.
 */

import { Controller, useForm } from 'react-hook-form';
import type { Cairn, CairnSeverity } from '@models/cairn';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Select } from '@/components/select';
import { TextArea } from '@/components/textArea';

/**
 * Form fields editable by the user when creating or editing a Cairn.
 */
export interface CairnFormFields {
  /**
   * User-provided comment explaining why the code snippet was flagged.
   */
  comment: string;

  /**
   * Severity level for the Cairn (normal, high, or critical).
   */
  severity: CairnSeverity;
}

/**
 * Props for the CairnForm component.
 */
export interface CairnFormProps {
  /**
   * Initial values for the form, excluding the auto-generated id.
   */
  initialValues: Omit<Cairn, 'id'>;

  /**
   * Callback invoked when the form is submitted with valid values.
   */
  onSubmit: (values: Omit<Cairn, 'id'>) => void;

  /**
   * Callback invoked when the user cancels the form.
   */
  onCancel: () => void;
}

/**
 * Form for entering a Cairn's comment and severity. The file path, line range
 * and snippet are shown read-only. Line numbers are 0-indexed in the data and
 * displayed 1-indexed. The comment is required and trimmed on submit.
 *
 * @param props - See {@link CairnFormProps}.
 * @returns The rendered form.
 */
export function CairnForm({ initialValues, onSubmit, onCancel }: CairnFormProps) {
  const {
    register,
    formState: { errors },
    handleSubmit,
    control,
  } = useForm<CairnFormFields>({
    defaultValues: {
      comment: initialValues.comment,
      severity: initialValues.severity,
    },
  });

  return (
    <form
      onSubmit={(e) =>
        void handleSubmit((fields) =>
          onSubmit({ ...initialValues, comment: fields.comment.trim(), severity: fields.severity }),
        )(e)
      }
      className="flex flex-col gap-4 w-full"
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-none font-medium text-foreground">File path</p>
          <pre className="w-full overflow-x-auto border border-foreground p-2 text-sm">
            {initialValues.filePath}
          </pre>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-none font-medium text-foreground">
            Code Snippet ({initialValues.lineRange[0] + 1} - {initialValues.lineRange[1] + 1})
          </p>
          <pre className="w-full max-h-48 overflow-auto border border-foreground p-2">
            {initialValues.codeSnippet}
          </pre>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Field label="Comment" htmlFor="cairn-comment" error={errors.comment?.message}>
          <TextArea
            id="cairn-comment"
            {...register('comment', { validate: (v) => v.trim() !== '' || 'Comment is required' })}
          />
        </Field>
        <Field label="Severity" htmlFor="cairn-severity">
          <Controller
            control={control}
            name="severity"
            render={({ field }) => (
              <Select
                id="cairn-severity"
                value={field.value}
                onValueChange={field.onChange}
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' },
                ]}
              />
            )}
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Save
        </Button>
        <Button type="button" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
