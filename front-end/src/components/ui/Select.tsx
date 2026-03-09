import type { SelectHTMLAttributes, Ref } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  required?: boolean;
  loading?: boolean;
  placeholder?: string;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({
  label,
  options,
  error,
  required,
  loading = false,
  placeholder = '- เลือก -',
  className = '',
  id,
  disabled,
  ref,
  ...props
}: SelectProps) {
  const selectId = id || `select-${label.replace(/\s/g, '-').toLowerCase()}`;

  return (
    <div className="mb-3">
      <label htmlFor={selectId} className="form-label">
        {label}
        {required && <span className="required"> *</span>}
      </label>
      <select
        ref={ref}
        id={selectId}
        className={`form-select ${error ? 'is-invalid' : ''} ${className}`}
        disabled={disabled || loading}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        <option value="">
          {loading ? 'กำลังโหลด...' : placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <div id={`${selectId}-error`} className="invalid-feedback" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

Select.displayName = 'Select';
