import { FileUpload } from '@/components/ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFile,
    faCheckCircle,
    faExclamationCircle,
    faTimes,
} from '@fortawesome/free-solid-svg-icons';
import type { UploadFile } from '@/hooks';

export interface FileUploadGroupProps {
    files: UploadFile[];
    onFilesAdd: (files: FileList | File[]) => Promise<void>;
    onFileRemove: (id: string) => void;
    canAddMore: boolean;
    maxFiles: number;
    errors?: string[];
}

function FilePreviewList({
    files,
    onFileRemove,
}: {
    files: UploadFile[];
    onFileRemove: (id: string) => void;
}) {
    if (files.length === 0) return null;

    return (
        <div className="file-preview-container">
            {files.map((file) => (
                <div key={file.id} className="file-preview-item">
                    {file.preview ? (
                        <img
                            src={file.preview}
                            alt={file.file.name}
                            className="file-thumbnail"
                        />
                    ) : (
                        <div className="file-icon-placeholder">
                            <FontAwesomeIcon icon={faFile} />
                        </div>
                    )}

                    <button
                        type="button"
                        className="file-remove-btn"
                        onClick={() => onFileRemove(file.id)}
                        aria-label={`ลบไฟล์ ${file.file.name}`}
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>

                    {file.status === 'uploading' && (
                        <div className="file-progress">
                            <div
                                className="file-progress-bar"
                                style={{ width: `${file.progress}%` }}
                            />
                        </div>
                    )}
                    {file.status === 'success' && (
                        <div className="file-status-icon success">
                            <FontAwesomeIcon icon={faCheckCircle} />
                        </div>
                    )}
                    {file.status === 'error' && (
                        <div className="file-status-icon error" title={file.error}>
                            <FontAwesomeIcon icon={faExclamationCircle} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export function ClaimFileUploadGroup({
    files,
    onFilesAdd,
    onFileRemove,
    canAddMore,
    maxFiles,
    errors,
}: FileUploadGroupProps) {
    const handleFilesChange = async (fileList: FileList | null) => {
        if (fileList && fileList.length > 0) {
            await onFilesAdd(fileList);
        }
    };

    return (
        <>
            <FileUpload
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                multiple
                onChange={handleFilesChange}
                disabled={!canAddMore}
                maxFiles={maxFiles}
            />

            <div className="file-count">
                {files.length}/{maxFiles} ไฟล์
            </div>

            {errors && errors.length > 0 && (
                <div className="alert alert-danger mt-2" role="alert">
                    <ul className="mb-0">
                        {errors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            <FilePreviewList files={files} onFileRemove={onFileRemove} />
        </>
    );
}
