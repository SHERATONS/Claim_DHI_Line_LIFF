import { useState, useId, type DragEvent, type ChangeEvent } from 'react';
import { FILE_LIMITS, ALLOWED_EXTENSIONS } from '@/config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudUploadAlt } from '@fortawesome/free-solid-svg-icons';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  onChange: (files: FileList | null) => void;
  disabled?: boolean;
  maxFiles?: number;
}

// React Compiler จัดการ memoization ให้อัตโนมัติ
export function FileUpload({
  accept = ALLOWED_EXTENSIONS,
  multiple = true,
  onChange,
  disabled = false,
  maxFiles = FILE_LIMITS.MAX_FILES,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const uniqueId = useId();
  const inputId = `file-upload-${uniqueId}`;

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled) {
      onChange(e.dataTransfer.files);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.files);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="mb-3">
      <div
        className={`upload-box ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById(inputId)?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="อัปโหลดไฟล์"
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            document.getElementById(inputId)?.click();
          }
        }}
      >
        <FontAwesomeIcon icon={faCloudUploadAlt} size="2x" className="text-muted mb-2" />
        <p className="mb-0 small text-muted">
          แตะหรือลากไฟล์มาวางที่นี่
        </p>
        <p className="mb-0 small text-muted">
          สูงสุด {maxFiles} ไฟล์
        </p>
        <input
          type="file"
          id={inputId}
          multiple={multiple}
          accept={accept}
          onChange={handleChange}
          disabled={disabled}
          style={{ display: 'none' }}
          data-testid="file-input"
        />
      </div>
    </div>
  );
}

FileUpload.displayName = 'FileUpload';
