// src/mainComponents/forms/AutosaveInput.tsx
import React from 'react';
import { InputField } from './InputField';
import { SelectField } from './SelectField';
import { useAutosaveField, type AutosaveField, type SaveResult } from './useAutosaveField';

const TEXTAREA_CLASSES =
  'block w-full px-3 py-2 border border-gray-300 hover:border-gray-400 rounded-md placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500';

const READ_ONLY_CLASSES = 'bg-gray-50 text-gray-700 cursor-default hover:border-gray-300';

const FieldMessage: React.FC<{ field: AutosaveField }> = ({ field }) => {
  if (!field.error) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-red-600">
      {field.error}
      {field.canRetry && (
        <button type="button" onClick={field.retry} className="ml-2 font-medium underline hover:text-red-800">
          Retry
        </button>
      )}
    </p>
  );
};

interface AutosaveControlProps {
  field: AutosaveField;
  multiline?: boolean;
  rows?: number;
  readOnly?: boolean;
  /** Reject keystrokes that don't match (numeric fields). */
  filter?: (next: string) => boolean;
  type?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  className?: string;
}

/** Renders a field driven by a `useAutosaveField` handle the caller owns. */
export const AutosaveControl: React.FC<AutosaveControlProps> = ({
  field,
  multiline,
  rows,
  readOnly,
  filter,
  className = '',
  ...rest
}) => {
  const inputProps = {
    ...field.inputProps,
    onChange: (e: { target: { value: string } }) => {
      if (filter && !filter(e.target.value)) return;
      field.inputProps.onChange(e);
    },
  };
  const invalid = Boolean(field.error);

  return (
    <div>
      {multiline ? (
        <textarea
          {...inputProps}
          rows={rows}
          readOnly={readOnly}
          placeholder={rest.placeholder}
          className={`${TEXTAREA_CLASSES} ${readOnly ? READ_ONLY_CLASSES : ''} ${invalid ? 'border-red-300' : ''} ${className}`}
        />
      ) : (
        <InputField
          {...inputProps}
          {...rest}
          readOnly={readOnly}
          error={invalid}
          className={`hover:border-gray-400 ${readOnly ? READ_ONLY_CLASSES : ''} ${className}`}
        />
      )}
      <FieldMessage field={field} />
    </div>
  );
};

interface AutosaveInputProps extends Omit<AutosaveControlProps, 'field'> {
  value: string;
  onCommit: (next: string) => Promise<SaveResult | void> | SaveResult | void;
  normalize?: (draft: string) => string;
  validate?: (next: string) => string | null;
  debounceMs?: number;
}

/** Text/number/date input or textarea that saves on blur (or Enter) when its value changed. */
export const AutosaveInput: React.FC<AutosaveInputProps> = ({
  value,
  onCommit,
  normalize,
  validate,
  debounceMs,
  multiline,
  readOnly,
  ...control
}) => {
  const field = useAutosaveField({
    value,
    onCommit,
    normalize,
    validate,
    debounceMs,
    multiline,
    disabled: readOnly,
  });
  return <AutosaveControl field={field} multiline={multiline} readOnly={readOnly} {...control} />;
};

interface AutosaveSelectProps {
  value: string;
  onCommit: (next: string) => Promise<SaveResult | void> | SaveResult | void;
  options: { value: string; label: string }[];
  placeholder?: string;
  readOnly?: boolean;
}

/** Select that saves as soon as the choice changes. */
export const AutosaveSelect: React.FC<AutosaveSelectProps> = ({ value, onCommit, options, placeholder, readOnly }) => {
  const field = useAutosaveField({ value, onCommit, disabled: readOnly });
  return (
    <div>
      <SelectField
        value={field.draft}
        onChange={(e) => field.commitValue(e.target.value)}
        options={options}
        placeholder={placeholder}
        disabled={readOnly}
        error={field.error ?? undefined}
        className={readOnly ? READ_ONLY_CLASSES : 'hover:border-gray-400'}
      />
      <FieldMessage field={field} />
    </div>
  );
};
