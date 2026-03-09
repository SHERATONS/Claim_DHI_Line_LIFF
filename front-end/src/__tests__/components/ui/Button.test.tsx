import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>ส่งข้อมูล</Button>);
    expect(screen.getByRole('button', { name: 'ส่งข้อมูล' })).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<Button loading>ส่งข้อมูล</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('กำลังดำเนินการ...');
    // Spinner has aria-hidden so we query by class
    expect(document.querySelector('.spinner-border')).toBeInTheDocument();
  });

  it('is disabled when loading', () => {
    render(<Button loading>ส่งข้อมูล</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>ส่งข้อมูล</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>ส่งข้อมูล</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire click when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button disabled onClick={handleClick}>ส่งข้อมูล</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with icon', () => {
    render(<Button icon={faPaperPlane}>ส่งข้อมูล</Button>);
    // FontAwesome React uses svg-inline--fa class
    expect(document.querySelector('svg.svg-inline--fa')).toBeInTheDocument();
  });

  it('applies correct variant class', () => {
    const { rerender } = render(<Button variant="primary">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-submit');

    rerender(<Button variant="error">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-close-error');
  });

  it('applies full width when fullWidth is true', () => {
    render(<Button fullWidth>ส่งข้อมูล</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-100');
  });
});
