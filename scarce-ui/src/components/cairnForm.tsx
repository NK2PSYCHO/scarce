/**
 * @packageDocumentation
 * Form for adding a Cairn, rendered in the sidebar.
 */

import { Controller, useForm } from 'react-hook-form';
import type { CairnSeverity } from '@models/cairn';
import type { CairnDraft, CairnInput } from '@models/messages';
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
   * Captured draft (root path, file path, snippet, line range) plus the initial comment and severity.
   */
  initialValues: CairnDraft & CairnFormFields;

  /**
   * Callback invoked when the form is submitted with valid values. The root path is not included.
   */
  onSubmit: (values: CairnInput) => void;

  /**
   * Callback invoked when the user cancels the form.
   */
  onCancel: () => void;

  /**
   * Callback invoked when the user asks to pick a different root folder.
   */
  onChangeRoot: () => void;
}

/**
 * Form for entering a Cairn's comment and severity. The root and relative path
 * are shown read-only, a `Change...` button calls onChangeRoot, and onSubmit
 * omits the root path. Line numbers are 0-indexed in the data and displayed
 * 1-indexed. The comment is required and trimmed on submit.
 *
 * @param props - See {@link CairnFormProps}.
 * @returns The rendered form.
 */
export function CairnForm({ initialValues, onSubmit, onCancel, onChangeRoot }: CairnFormProps) {
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
          onSubmit({
            filePath: initialValues.filePath,
            lineRange: initialValues.lineRange,
            codeSnippet: initialValues.codeSnippet,
            comment: fields.comment.trim(),
            severity: fields.severity,
          }),
        )(e)
      }
      className="flex flex-col gap-4 w-full"
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-none font-medium text-foreground">Root</p>
          <pre className="w-full overflow-x-auto border border-foreground p-2 text-sm">
            {initialValues.rootPath}
          </pre>
          <Button type="button" onClick={onChangeRoot}>
            Change...
          </Button>
        </div>
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
