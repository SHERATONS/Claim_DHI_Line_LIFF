import type { InputHTMLAttributes, Ref } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  ref?: Ref<HTMLInputElement>;
}

export function Checkbox({
  label,
  className = '',
  id,
  ref,
  ...props
}: CheckboxProps) {
  const checkboxId = id || `checkbox-${label.replace(/\s/g, '-').toLowerCase()}`;

  return (
    <div className={`same-person-check ${className}`}>
      <label htmlFor={checkboxId}>
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          {...props}
        />
        {label}
      </label>
    </div>
  );
}

Checkbox.displayName = 'Checkbox';
