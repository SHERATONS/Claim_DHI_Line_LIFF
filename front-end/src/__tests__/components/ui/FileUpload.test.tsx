import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '@/components/ui/FileUpload';

describe('FileUpload', () => {
  const defaultProps = {
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload area with instructions', () => {
    render(<FileUpload {...defaultProps} />);
    expect(screen.getByText(/แตะหรือลากไฟล์/)).toBeInTheDocument();
  });

  it('has accessible upload button', () => {
    render(<FileUpload {...defaultProps} />);
    expect(screen.getByRole('button', { name: /อัปโหลด/ })).toBeInTheDocument();
  });

  it('accepts file input', () => {
    render(<FileUpload {...defaultProps} />);
    const input = screen.getByTestId('file-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('multiple');
  });

  it('shows max files info', () => {
    render(<FileUpload {...defaultProps} maxFiles={5} />);
    expect(screen.getByText(/สูงสุด 5 ไฟล์/)).toBeInTheDocument();
  });

  it('calls onChange when files are selected', () => {
    const onChange = vi.fn();
    render(<FileUpload {...defaultProps} onChange={onChange} />);

    const input = screen.getByTestId('file-input');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);
    expect(onChange).toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<FileUpload {...defaultProps} disabled />);
    const input = screen.getByTestId('file-input');
    expect(input).toBeDisabled();
  });

  it('has disabled class when disabled', () => {
    render(<FileUpload {...defaultProps} disabled />);
    const uploadBox = document.querySelector('.upload-box');
    expect(uploadBox).toHaveClass('disabled');
  });

  it('handles drag over state', () => {
    render(<FileUpload {...defaultProps} />);
    const uploadBox = document.querySelector('.upload-box');

    fireEvent.dragOver(uploadBox!);
    expect(uploadBox).toHaveClass('drag-over');

    fireEvent.dragLeave(uploadBox!);
    expect(uploadBox).not.toHaveClass('drag-over');
  });

  it('handles drop event', () => {
    const onChange = vi.fn();
    render(<FileUpload {...defaultProps} onChange={onChange} />);

    const uploadBox = document.querySelector('.upload-box')!;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    const dataTransfer = {
      files: [file],
    };

    fireEvent.drop(uploadBox, { dataTransfer });
    expect(onChange).toHaveBeenCalled();
  });

  it('does not handle drop when disabled', () => {
    const onChange = vi.fn();
    render(<FileUpload {...defaultProps} onChange={onChange} disabled />);

    const uploadBox = document.querySelector('.upload-box')!;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    const dataTransfer = {
      files: [file],
    };

    fireEvent.drop(uploadBox, { dataTransfer });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses custom accept attribute', () => {
    render(<FileUpload {...defaultProps} accept=".pdf" />);
    const input = screen.getByTestId('file-input');
    expect(input).toHaveAttribute('accept', '.pdf');
  });

  it('can be single file mode', () => {
    render(<FileUpload {...defaultProps} multiple={false} />);
    const input = screen.getByTestId('file-input');
    expect(input).not.toHaveAttribute('multiple');
  });
});
