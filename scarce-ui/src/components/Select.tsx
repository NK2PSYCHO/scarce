import {
  Select as UiSelect,
  SelectContent as UiSelectContent,
  SelectItem as UiSelectItem,
  SelectTrigger as UiSelectTrigger,
  SelectValue as UiSelectValue,
} from '@/components/ui/select';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  id?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({ id, value, onValueChange, options, placeholder }: SelectProps) {
  return (
    <UiSelect value={value} onValueChange={onValueChange}>
      <UiSelectTrigger id={id}>
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
