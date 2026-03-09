import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingOverlay } from '@/components/feedback/LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders when show is true', () => {
    render(<LoadingOverlay show />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when show is false', () => {
    render(<LoadingOverlay show={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows default message', () => {
    render(<LoadingOverlay show />);
    expect(screen.getByText('กำลังดำเนินการ...')).toBeInTheDocument();
  });

  it('shows custom message', () => {
    render(<LoadingOverlay show message="กำลังส่งข้อมูล..." />);
    expect(screen.getByText('กำลังส่งข้อมูล...')).toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    render(<LoadingOverlay show />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'loading-message');
  });

  it('has spinner element', () => {
    render(<LoadingOverlay show />);
    expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
  });
});
