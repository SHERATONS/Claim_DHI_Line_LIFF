import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '@/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Card className="custom-class">Content</Card>);
    expect(document.querySelector('.custom-card.custom-class')).toBeInTheDocument();
  });

  it('has default card class', () => {
    render(<Card>Content</Card>);
    expect(document.querySelector('.custom-card')).toBeInTheDocument();
  });
});
