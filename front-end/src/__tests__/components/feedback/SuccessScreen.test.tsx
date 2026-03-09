import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuccessScreen } from '@/components/feedback/SuccessScreen';

describe('SuccessScreen', () => {
  const defaultProps = {
    show: true,
    caseNumber: 'CL-2024-001',
    onClose: vi.fn(),
  };

  it('renders when show is true', () => {
    render(<SuccessScreen {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when show is false', () => {
    render(<SuccessScreen {...defaultProps} show={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays case number', () => {
    render(<SuccessScreen {...defaultProps} />);
    expect(screen.getByText(/CL-2024-001/)).toBeInTheDocument();
  });

  it('displays fallback when case number is empty', () => {
    render(<SuccessScreen {...defaultProps} caseNumber="" />);
    expect(screen.getByText(/เลขที่รับแจ้ง: -/)).toBeInTheDocument();
  });

  it('shows success message', () => {
    render(<SuccessScreen {...defaultProps} />);
    expect(screen.getByText(/ส่งข้อมูลสำเร็จ/)).toBeInTheDocument();
  });

  it('shows confirmation message', () => {
    render(<SuccessScreen {...defaultProps} />);
    expect(screen.getByText(/บริษัทฯ ได้รับข้อมูล/)).toBeInTheDocument();
  });

  it('shows contact info', () => {
    render(<SuccessScreen {...defaultProps} />);
    expect(screen.getByText(/1736/)).toBeInTheDocument();
  });

  it('calls onClose when button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<SuccessScreen {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'ปิด' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has correct ARIA attributes', () => {
    render(<SuccessScreen {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'success-title');
  });

  it('has success icon', () => {
    render(<SuccessScreen {...defaultProps} />);
    // FontAwesome React renders as SVG with data-icon attribute
    expect(document.querySelector('svg[data-icon="circle-check"]')).toBeInTheDocument();
  });
});
