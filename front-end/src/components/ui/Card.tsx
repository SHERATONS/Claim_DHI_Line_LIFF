import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: IconDefinition;
}

export function Card({ children, className = '', title, icon }: CardProps) {
  return (
    <div className={`custom-card ${className}`}>
      {title && (
        <div className="section-header">
          {icon && <FontAwesomeIcon icon={icon} className="me-2" />}
          <span>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

Card.displayName = 'Card';
