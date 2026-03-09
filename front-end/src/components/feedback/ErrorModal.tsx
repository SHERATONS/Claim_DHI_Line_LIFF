import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { mapErrorMessage } from '@/utils/errorMapping';

interface ErrorModalProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

export function ErrorModal({ show, message, onClose }: ErrorModalProps) {
  if (!show) return null;

  // Map technical error to user-friendly message
  const displayMessage = mapErrorMessage(message);

  return (
    <div
      className="error-modal show"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-title"
      aria-describedby="error-message"
    >
      <div className="error-content">
        <div className="error-icon" aria-hidden="true">
          <FontAwesomeIcon icon={faExclamationCircle} />
        </div>
        <h2 id="error-title" className="error-title">
          เกิดข้อผิดพลาด
        </h2>
        <p id="error-message" className="error-message">
          {displayMessage}
        </p>
        <button
          type="button"
          className="btn-close-error"
          onClick={onClose}
          autoFocus
        >
          ปิด
        </button>
      </div>
    </div>
  );
}

ErrorModal.displayName = 'ErrorModal';
