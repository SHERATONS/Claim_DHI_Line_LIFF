/**
 * Fatal Error Screen
 * ลอกจาก LIFF_Form.page — errorScreen (บรรทัด 98-106)
 * แสดงเมื่อไม่สามารถ init ได้ (เช่น ไม่ได้รับ policy data)
 */

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

interface FatalErrorScreenProps {
  message?: string;
  onClose?: () => void;
}

export function FatalErrorScreen({
  message = 'เกิดข้อผิดพลาด',
  onClose,
}: FatalErrorScreenProps) {
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      window.close();
    }
  };

  return (
    <div className="fatal-error-screen">
      <div className="fatal-error-content">
        <div className="fatal-error-icon">
          <FontAwesomeIcon icon={faExclamationTriangle} />
        </div>
        <div className="fatal-error-title">ไม่สามารถเข้าถึงได้</div>
        <p className="fatal-error-message">{message}</p>
        <button
          type="button"
          className="btn-close-fatal"
          onClick={handleClose}
        >
          ปิด
        </button>
      </div>
    </div>
  );
}

FatalErrorScreen.displayName = 'FatalErrorScreen';
