import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="ชื่อ" />);
    expect(screen.getByLabelText('ชื่อ')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<Input label="ชื่อ" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not show required indicator when not required', () => {
    render(<Input label="ชื่อ" />);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('displays error message when error prop is set', () => {
    render(<Input label="ชื่อ" error="กรุณากรอกชื่อ" />);
    expect(screen.getByRole('alert')).toHaveTextContent('กรุณากรอกชื่อ');
  });

  it('marks input as invalid when error exists', () => {
    render(<Input label="ชื่อ" error="error" />);
    expect(screen.getByLabelText('ชื่อ')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows help text tooltip when provided', () => {
    render(<Input label="ชื่อ" helpText="กรอกชื่อจริง" />);
    // FontAwesome React uses aria-label instead of title
    expect(screen.getByLabelText('กรอกชื่อจริง')).toBeInTheDocument();
  });

  it('accepts user input', async () => {
    const user = userEvent.setup();
    render(<Input label="ชื่อ" />);

    const input = screen.getByLabelText('ชื่อ');
    await user.type(input, 'สมชาย');

    expect(input).toHaveValue('สมชาย');
  });

  it('passes through HTML attributes', () => {
    render(<Input label="อีเมล" type="email" placeholder="test@example.com" />);

    const input = screen.getByLabelText('อีเมล');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'test@example.com');
  });

  it('applies is-invalid class when error exists', () => {
    render(<Input label="ชื่อ" error="error" />);
    expect(screen.getByLabelText('ชื่อ')).toHaveClass('is-invalid');
  });

  it('can be disabled', () => {
    render(<Input label="ชื่อ" disabled />);
    expect(screen.getByLabelText('ชื่อ')).toBeDisabled();
  });
});
