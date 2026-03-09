import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorModal } from '@/components/feedback/ErrorModal';

describe('ErrorModal', () => {
  const defaultProps = {
    show: true,
    message: 'เกิดข้อผิดพลาดในการส่งข้อมูล',
    onClose: vi.fn(),
  };

  it('renders when show is true', () => {
    render(<ErrorModal {...defaultProps} />);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('does not render when show is false', () => {
    render(<ErrorModal {...defaultProps} show={false} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<ErrorModal {...defaultProps} />);
    expect(screen.getByText('เกิดข้อผิดพลาดในการส่งข้อมูล')).toBeInTheDocument();
  });

  it('shows default message when message is empty', () => {
    render(<ErrorModal {...defaultProps} message="" />);
    expect(screen.getByText(/ไม่สามารถดำเนินการได้/)).toBeInTheDocument();
  });

  it('shows error title', () => {
    render(<ErrorModal {...defaultProps} />);
    expect(screen.getByText('เกิดข้อผิดพลาด')).toBeInTheDocument();
  });

  it('calls onClose when button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<ErrorModal {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'ปิด' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has correct ARIA attributes', () => {
    render(<ErrorModal {...defaultProps} />);
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'error-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'error-message');
  });

  it('has error icon', () => {
    render(<ErrorModal {...defaultProps} />);
    // FontAwesome React renders as SVG with data-icon attribute
    expect(document.querySelector('svg[data-icon="circle-exclamation"]')).toBeInTheDocument();
  });
});
