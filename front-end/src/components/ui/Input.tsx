import type { InputHTMLAttributes, Ref } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
  helpText?: string;
  ref?: Ref<HTMLInputElement>;
}

// React 19: ref as prop - ไม่ต้องใช้ forwardRef แล้ว
export function Input({
  label,
  error,
  required,
  helpText,
  className = '',
  id,
  ref,
  ...props
}: InputProps) {
  const inputId = id || `input-${label.replace(/\s/g, '-').toLowerCase()}`;

  return (
    <div className="mb-3">
      <label htmlFor={inputId} className="form-label">
        {label}
        {required && <span className="required"> *</span>}
        {helpText && (
          <FontAwesomeIcon
            icon={faInfoCircle}
            className="info-icon"
            title={helpText}
            aria-label={helpText}
          />
        )}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={`form-control ${error ? 'is-invalid' : ''} ${props.readOnly ? 'form-readonly' : ''} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <div id={`${inputId}-error`} className="invalid-feedback" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

Input.displayName = 'Input';
