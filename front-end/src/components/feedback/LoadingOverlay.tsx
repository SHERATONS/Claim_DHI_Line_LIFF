export interface LoadingOverlayProps {
  show?: boolean;
  message?: string;
}

export function LoadingOverlay({
  show = true,
  message = 'กำลังดำเนินการ...',
}: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      className="loading-overlay show"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-message"
    >
      <div className="loading-modal">
        <div className="loading-spinner" aria-hidden="true" />
        <div id="loading-message" className="loading-text">
          {message}
        </div>
      </div>
    </div>
  );
}
