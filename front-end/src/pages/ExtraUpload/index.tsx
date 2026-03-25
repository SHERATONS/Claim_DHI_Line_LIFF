import { useState } from 'react';
import { useLiff, useFileUpload } from '@/hooks';
import { LoadingOverlay, SuccessScreen, ErrorModal } from '@/components';
import { submitClaim } from '@/services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faFileUpload } from '@fortawesome/free-solid-svg-icons';
import { Card, Input } from '@/components/ui';
import { PersonalDocumentUpload } from '@/components/features/claim/PersonalDocumentUpload';

export default function ExtraUploadPage() {
    const { getAccessToken, closeWindow } = useLiff();

    // Robust parsing for notificationNo to handle LIFF/HashRouter quirks
    // Hardcoded for prototype as requested
    const notificationNo = 'FIR-26-N-C0086';
    const notificationNoParam = notificationNo;

    const docUpload = useFileUpload({ maxFiles: 10, autoCompress: true });
    const [docFileErrors, setDocFileErrors] = useState<string[]>([]);

    const [submitState, setSubmitState] = useState({
        loading: false,
        success: false,
        error: null as string | null,
    });

    const handleDocFilesAdd = async (files: FileList | File[]) => {
        const results = await docUpload.addFiles(files);
        const newErrors: string[] = [];
        results.forEach((res) => {
            if (!res.valid && res.error) newErrors.push(res.error);
        });
        setDocFileErrors(newErrors);
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (docUpload.files.length === 0) {
            setSubmitState(s => ({ ...s, error: 'กรุณาอัปโหลดไฟล์อย่างน้อย 1 ไฟล์' }));
            return;
        }

        const token = getAccessToken() ?? (import.meta.env.DEV ? 'dev-bypass' : null);
        if (!token) {
            setSubmitState(s => ({ ...s, error: 'ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาลองใหม่อีกครั้ง' }));
            return;
        }

        setSubmitState({ loading: true, success: false, error: null });

        try {
            const formData = new FormData();
            formData.append('notificationNo', notificationNo);
            docUpload.files.forEach((file) => formData.append('files', file.file));

            await submitClaim('/api/extra-upload', formData, token);

            setSubmitState({
                loading: false,
                success: true,
                error: null,
            });
        } catch (err) {
            setSubmitState({
                loading: false,
                success: false,
                error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการส่งข้อมูล',
            });
        }
    };

    if (submitState.success) {
        return (
            <SuccessScreen
                notificationNo={notificationNo}
                onClose={closeWindow}
            />
        );
    }

    return (
        <>
            {(submitState.loading || !notificationNoParam) && (
                <LoadingOverlay message={submitState.loading ? "กำลังส่งข้อมูล..." : "กรุณารอสักครู่..."} />
            )}

            <ErrorModal
                show={!!submitState.error}
                message={submitState.error || ''}
                onClose={() => setSubmitState(s => ({ ...s, error: null }))}
            />

            <div className="header-section">
                <div className="header-logo">DHIPAYA INSURANCE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: 10 }}>
                    อัปโหลดเอกสารเพิ่มเติม
                </div>
            </div>

            <div className="form-container">
                <form onSubmit={handleSubmit} noValidate>
                    <Card title="ข้อมูลการแจ้งเคลม" icon={faFileUpload}>
                        <Input
                            label="เลขที่รับแจ้ง (Notification No.)"
                            value={notificationNo}
                            readOnly
                            placeholder="ระบบจะดึงข้อมูลอัตโนมัติจากลิงก์"
                        />
                    </Card>

                    <PersonalDocumentUpload
                        files={docUpload.files}
                        onFilesAdd={handleDocFilesAdd}
                        onFileRemove={docUpload.removeFile}
                        canAddMore={docUpload.canAddMore}
                        maxFiles={10}
                        errors={docFileErrors}
                        instructions={[
                            "1. ตรวจสอบเลขที่รับแจ้งด้านบนให้ถูกต้อง",
                            "2. เลือกไฟล์รูปภาพหรือเอกสารที่ต้องการอัปโหลด (สูงสุด 10 ไฟล์)",
                            "3. กดปุ่ม 'ยืนยันเพื่ออัปโหลดเอกสาร' ด้านล่าง",
                        ]}
                    />

                    <button type="submit" className="btn-submit" disabled={submitState.loading || !notificationNo}>
                        {submitState.loading ? (
                            'กำลังส่ง...'
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faPaperPlane} style={{ marginRight: 8 }} />
                                ยืนยันเพื่ออัปโหลดเอกสาร
                            </>
                        )}
                    </button>
                </form>
            </div>
        </>
    );
}
