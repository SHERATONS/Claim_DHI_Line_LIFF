import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';

interface SuccessScreenProps {
  show?: boolean;
  caseNumber?: string;
  contactEmail?: string;
  onClose: () => void;
}

export function SuccessScreen({ show = true, caseNumber, contactEmail, onClose }: SuccessScreenProps) {
  if (!show) return null;

  return (
    <div
      className="success-screen show"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-title"
    >
      <div className="success-content">
        <div className="success-icon" aria-hidden="true">
          <FontAwesomeIcon icon={faCheckCircle} />
        </div>
        <h2 id="success-title" className="success-title">
          ส่งข้อมูลสำเร็จ!
        </h2>
        <div className="success-case">
          เลขที่รับแจ้ง: {caseNumber || '-'}
        </div>
        <p className="success-message">
          บริษัทฯ ได้รับข้อมูลของท่านแล้ว
          <br />
          จะดำเนินการพิจารณาสินไหมโดยเร็วที่สุด
        </p>
        {contactEmail && (
          <p className="text-muted small">
            สอบถามเพิ่มเติม: {contactEmail}
          </p>
        )}
        <p className="text-muted small">
          หากต้องการสอบถามข้อมูลเพิ่มเติม กรุณาติดต่อ Call Center 1736
        </p>
        <button
          type="button"
          className="btn-close-success"
          onClick={onClose}
          autoFocus
        >
          ปิด
        </button>
      </div>
    </div>
  );
}
