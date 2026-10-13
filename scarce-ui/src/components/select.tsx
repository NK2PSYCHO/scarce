/**
 * Thin wrapper over shadcn's Select component and its subcomponents.
 * Provides an app-level interface that accepts an options array instead of
 * requiring consumers to render each SelectItem manually.
 *
 * @packageDocumentation
 */

import {
  Select as UiSelect,
  SelectContent as UiSelectContent,
  SelectItem as UiSelectItem,
  SelectTrigger as UiSelectTrigger,
  SelectValue as UiSelectValue,
} from '@/components/ui/select';

/**
 * Represents a single option in the select dropdown.
 */
export interface SelectOption {
  /**
   * The value to be used when this option is selected.
   */
  value: string;

  /**
   * The display text shown for this option.
   */
  label: string;
}

/**
 * Props for the Select component.
 */
export interface SelectProps {
  /**
   * Unique identifier for the select element.
   */
  id?: string;

  /**
   * Currently selected value.
   */
  value?: string;

  /**
   * Callback invoked when the selected value changes.
   */
  onValueChange?: (value: string) => void;

  /**
   * List of options to display in the dropdown.
   */
  options: SelectOption[];

  /**
   * Placeholder text shown when no value is selected.
   */
  placeholder?: string;
}

/**
 * Renders a shadcn Select with an options array, providing a simpler API
 * than using the shadcn primitives directly.
 *
 * @param props - SelectProps for configuring the select behavior.
 */
export function Select({ id, value, onValueChange, options, placeholder }: SelectProps) {
  return (
    <UiSelect value={value} onValueChange={onValueChange}>
      <UiSelectTrigger id={id} className="w-full">
        <UiSelectValue placeholder={placeholder} />
      </UiSelectTrigger>
      <UiSelectContent>
        {options.map((option) => (
          <UiSelectItem key={option.value} value={option.value}>
            {option.label}
          </UiSelectItem>
        ))}
      </UiSelectContent>
    </UiSelect>
  );
}
