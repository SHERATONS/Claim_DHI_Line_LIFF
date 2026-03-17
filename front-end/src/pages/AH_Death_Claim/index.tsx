/**
 * Claim Form Page (A&H / Death)
 * Based on CAR_EAR_CPM_Claim structure
 */

import { useState } from 'react';
import { useLiff, useFileUpload } from '@/hooks';
import { ahDeathSchema } from '@/utils/validation';
import { scrollToFirstError } from '@/utils/dom';
import { ClaimDetailsSection } from './ClaimDetailsSection';
import { LoadingOverlay, SuccessScreen, ErrorModal } from '@/components';
import { submitClaim } from '@/services/api';
import { getContactEmail } from '@/config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { InsuredInfoSection, PersonalDocumentUpload } from '@/components/features/claim';

// Placeholder policy data — will be replaced by Loxley API integration.
const MOCK_POLICY_DATA = {
    policyNumber: '14025-799-170001123',
    policyHolder: 'นายใจดี มีประกัน',
    idcard: '1-1234-56789-01-2',
};

interface FormValues {
    notifierName: string;
    phone: string;
    email: string;
    accidentDate: string;
    lossPlace: string;
    treatmentDate: string;
    treatmentHospital: string;
    causeOfDeath: string;
    lossReserve: string;
}

interface FormErrors {
    notifierName?: string;
    phone?: string;
    email?: string;
    accidentDate?: string;
    lossPlace?: string;
    treatmentDate?: string;
    treatmentHospital?: string;
    causeOfDeath?: string;
    lossReserve?: string;
}

export default function ClaimForm() {
    const { getAccessToken, closeWindow } = useLiff();

    // Policy data — placeholder until Loxley integration
    const policyNumber = MOCK_POLICY_DATA.policyNumber;
    const policyHolder = MOCK_POLICY_DATA.policyHolder;
    const idcard = MOCK_POLICY_DATA.idcard;

    const [values, setValues] = useState<FormValues>({
        notifierName: '',
        phone: '',
        email: '',
        accidentDate: '',
        lossPlace: '',
        treatmentDate: '',
        treatmentHospital: '',
        causeOfDeath: '',
        lossReserve: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});

    const docUpload = useFileUpload({ maxFiles: 10, autoCompress: true, filePrefix: 'document' });
    const [docFileErrors, setDocFileErrors] = useState<string[]>([]);

    const [submitState, setSubmitState] = useState<{
        loading: boolean;
        success: boolean;
        error: string | null;
        caseNumber: string | null;
        notificationNo: string | null;
    }>({
        loading: false,
        success: false,
        error: null,
        caseNumber: null,
        notificationNo: null,
    });

    const handleChange = (field: string, value: string) => {
        setValues((prev) => ({ ...prev, [field]: value }));
        if (errors[field as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const result = ahDeathSchema.safeParse(values);
        if (result.success) {
            setErrors({});
            return true;
        }

        const newErrors: FormErrors = {};
        const errorFields: string[] = [];
        for (const issue of result.error.issues) {
            const field = issue.path[0] as keyof FormErrors;
            if (field && !newErrors[field]) {
                newErrors[field] = issue.message;
                errorFields.push(field);
            }
        }
        setErrors(newErrors);

        if (errorFields.length > 0) {
            scrollToFirstError(errorFields);
        }

        return false;
    };

    const convertBEtoCE = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length >= 1) {
            const yearStr = parts[0];
            if (yearStr) {
                const year = parseInt(yearStr, 10);
                if (year > 2400) {
                    return `${year - 543}-${parts.slice(1).join('-')}`;
                }
            }
        }
        return dateStr;
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!validateForm()) return;

        const token = getAccessToken();
        if (!token) {
            setSubmitState((s) => ({ ...s, error: 'ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาลองใหม่อีกครั้ง' }));
            return;
        }

        setSubmitState({ loading: true, success: false, error: null, caseNumber: null, notificationNo: null });

        try {
            const accidentDateCE = convertBEtoCE(values.accidentDate);
            const treatmentDateCE = convertBEtoCE(values.treatmentDate);

            const payload = {
                policyNo: policyNumber,
                contactId: idcard,
                notifierName: values.notifierName,
                phone: values.phone,
                email: values.email || undefined,
                accidentDate: accidentDateCE,
                treatmentDate: treatmentDateCE,
                treatmentHospital: values.treatmentHospital,
                causeOfDeath: values.causeOfDeath,
                lossPlace: values.lossPlace,
                lossReserve: values.lossReserve ? parseFloat(values.lossReserve.replace(/,/g, '')) : undefined,
            };

            const allFiles = [
                ...docUpload.files.map((f) => f.file),
            ];

            const formData = new FormData();
            Object.entries(payload).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(key, value as string);
                }
            });
            allFiles.forEach((file) => formData.append('files', file));

            const result = await submitClaim(formData, token);

            if (!result.caseId) {
                throw new Error('ไม่ได้รับหมายเลขเคส');
            }

            setSubmitState({
                loading: false,
                success: true,
                error: null,
                caseNumber: result.caseNumber ?? null,
                notificationNo: result.notificationNo ?? null,
            });
        } catch (error) {
            setSubmitState({
                loading: false,
                success: false,
                error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการส่งข้อมูล',
                caseNumber: null,
                notificationNo: null,
            });
        }
    };

    const handleDocFilesAdd = async (newFiles: FileList | File[]) => {
        const results = await docUpload.addFiles(newFiles);
        const errs = results.filter((r) => !r.valid).map((r) => r.error ?? 'ไฟล์ไม่ถูกต้อง');
        setDocFileErrors(errs.length > 0 ? errs : []);
    };

    const handleCloseError = () => {
        setSubmitState((s) => ({ ...s, error: null }));
    };

    if (submitState.success) {
        const contactEmail = getContactEmail('ah');
        return (
            <SuccessScreen
                notificationNo={submitState.notificationNo ?? undefined}
                contactEmail={contactEmail}
                onClose={closeWindow}
            />
        );
    }

    return (
        <>
            {submitState.loading && <LoadingOverlay message="กำลังส่งข้อมูล..." />}

            <ErrorModal
                show={!!submitState.error}
                message={submitState.error ?? ''}
                onClose={handleCloseError}
            />

            <div className="header-section">
                <div className="header-logo">DHIPAYA INSURANCE</div>
                <div style={{ fontSize: '0.95rem', marginTop: 5 }}>
                    แจ้งเคลม A&H / Death (สอบถามข้อมูลเพิ่มเติม กรุณาติดต่อ Call Center 1736)
                </div>
            </div>

            <div className="form-container">
                <form onSubmit={handleSubmit} noValidate>
                    <InsuredInfoSection
                        policyNumber={policyNumber}
                        policyHolder={policyHolder}
                        idcard={idcard}
                        values={{
                            notifierName: values.notifierName,
                            phone: values.phone,
                            email: values.email,
                        }}
                        errors={{
                            notifierName: errors.notifierName,
                            phone: errors.phone,
                            email: errors.email,
                        }}
                        onChange={handleChange}
                    />

                    <ClaimDetailsSection
                        values={{
                            accidentDate: values.accidentDate,
                            lossPlace: values.lossPlace,
                            treatmentDate: values.treatmentDate,
                            treatmentHospital: values.treatmentHospital,
                            causeOfDeath: values.causeOfDeath,
                            lossReserve: values.lossReserve,
                        }}
                        errors={{
                            accidentDate: errors.accidentDate,
                            lossPlace: errors.lossPlace,
                            treatmentDate: errors.treatmentDate,
                            treatmentHospital: errors.treatmentHospital,
                            causeOfDeath: errors.causeOfDeath,
                            lossReserve: errors.lossReserve,
                        }}
                        onChange={handleChange}
                    />

                    <PersonalDocumentUpload
                        files={docUpload.files}
                        onFilesAdd={handleDocFilesAdd}
                        onFileRemove={docUpload.removeFile}
                        canAddMore={docUpload.canAddMore}
                        maxFiles={10}
                        errors={docFileErrors}
                        instructions={[
                        ]}
                    />

                    <button type="submit" className="btn-submit" disabled={submitState.loading}>
                        {submitState.loading ? (
                            'กำลังส่ง...'
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faPaperPlane} style={{ marginRight: 8 }} />
                                ยืนยันข้อมูล
                            </>
                        )}
                    </button>
                </form>
            </div>
        </>
    );
}
