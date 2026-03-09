import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: IconDefinition;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseClass = variant === 'primary'
    ? 'btn-submit'
    : variant === 'error'
    ? 'btn-close-error'
    : 'btn-close-success';

  const sizeClass = size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : '';
  const widthClass = fullWidth ? 'w-100' : '';

  return (
    <button
      className={`${baseClass} ${sizeClass} ${widthClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          />
          กำลังดำเนินการ...
        </>
      ) : (
        <>
          {icon && <FontAwesomeIcon icon={icon} className="me-2" />}
          {children}
        </>
      )}
    </button>
  );
}

Button.displayName = 'Button';
