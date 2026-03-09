/**
 * Claim Form Page (Marine HULL)
 * Adapted from FR_IAR_Claim
 */

import { useState } from 'react';
import { useLiff, useFileUpload } from '@/hooks';
import { marineHullSchema } from '@/utils/validation';
import { scrollToFirstError } from '@/utils/dom';
import { convertBEtoCE } from './ClaimDetailsSection';
import { LoadingOverlay, SuccessScreen, ErrorModal } from '@/components';
import { submitClaim } from '@/services/api';
import { getContactEmail, USE_LOCAL_SAVE } from '@/config';
import { MARINE_PLACES } from '@/config/marinePlaces';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { InsuredInfoSection, PersonalDocumentUpload } from '@/components/features/claim';
import { ClaimDetailsSection } from './ClaimDetailsSection';

// Placeholder policy data — will be replaced by Loxley API integration.
const MOCK_POLICY_DATA = {
    policyNumber: 'POL-2568-001234',
    policyHolder: 'นายทดสอบ ระบบเคลม',
    idcard: '1-1234-56789-01-2',
};

interface FormValues {
    notifierName: string;
    phone: string;
    email: string;
    incidentDateTime: string;
    lossPlace: string;
    lossPlaceOther: string;
    boatName: string;
    damageDetails: string;
    damageDetailsOther: string;
    damageType: string;
}

interface FormErrors {
    notifierName?: string;
    phone?: string;
    email?: string;
    incidentDateTime?: string;
    lossPlace?: string;
    lossPlaceOther?: string;
    boatName?: string;
    damageDetails?: string;
    damageDetailsOther?: string;
    damageType?: string;
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
        incidentDateTime: '',
        lossPlace: '',
        lossPlaceOther: '',
        boatName: '',
        damageDetails: '',
        damageDetailsOther: '',
        damageType: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});

    const docUpload = useFileUpload({ maxFiles: 10, autoCompress: true });
    const [docFileErrors, setDocFileErrors] = useState<string[]>([]);

    const [submitState, setSubmitState] = useState<{
        loading: boolean;
        success: boolean;
        error: string | null;
        caseNumber: string | null;
    }>({
        loading: false,
        success: false,
        error: null,
        caseNumber: null,
    });

    const handleChange = (field: string, value: string) => {
        setValues((prev) => ({ ...prev, [field]: value }));
        if (errors[field as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const result = marineHullSchema.safeParse({ ...values });
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

    const buildFullAddress = (): string => {
        const parts: string[] = [];
        if (values.lossPlace === '007') {
            if (values.lossPlaceOther) parts.push(values.lossPlaceOther);
        } else {
            const placeItem = MARINE_PLACES.find(p => p.value === values.lossPlace);
            if (placeItem) parts.push(placeItem.label);
        }
        return parts.filter(Boolean).join(' ');
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!validateForm()) return;

        const token = getAccessToken() ?? (import.meta.env.DEV ? 'dev-bypass' : null);
        if (!token) {
            setSubmitState((s) => ({ ...s, error: 'ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาลองใหม่อีกครั้ง' }));
            return;
        }

        setSubmitState({ loading: true, success: false, error: null, caseNumber: null });

        try {
            const fullAddress = buildFullAddress();
            const incidentDateTime = convertBEtoCE(values.incidentDateTime);

            const payload = {
                policyNumber,
                damageDetails: values.damageDetails === '005' ? values.damageDetailsOther : values.damageDetails,
                incidentDateTime,
                damageType: values.damageType,
                lossPlace: fullAddress,
                notifierName: values.notifierName,
                phone: values.phone,
                email: values.email || undefined,
            };

            const allFiles: File[] = [...docUpload.files.map((f) => f.file)];

            if (USE_LOCAL_SAVE) {
                const { saveClaimLocally } = await import('@/services/localSubmit');
                await saveClaimLocally({ claimType: 'Marine_HULL_Claim', data: payload, documentFiles: allFiles });
                setSubmitState({ loading: false, success: true, error: null, caseNumber: 'LOCAL-SAVE-' + Date.now() });
                return;
            }

            const result = await submitClaim(payload, token);

            if (!result.caseId) {
                throw new Error('ไม่ได้รับหมายเลขเคส');
            }

            setSubmitState({ loading: false, success: true, error: null, caseNumber: result.caseNumber ?? null });
        } catch (error) {
            setSubmitState({
                loading: false,
                success: false,
                error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการส่งข้อมูล',
                caseNumber: null,
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
        const contactEmail = getContactEmail('marine_hull');
        return (
            <SuccessScreen
                caseNumber={submitState.caseNumber ?? undefined}
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
                    แจ้งเคลม Marine HULL (สอบถามข้อมูลเพิ่มเติม กรุณาติดต่อ Call Center 1736)
                </div>
            </div>

            <div className="form-container">
                <form onSubmit={handleSubmit} noValidate>
                    <InsuredInfoSection
                        policyNumber={policyNumber}
                        policyHolder={policyHolder}
                        idcard={idcard}
                        values={{ notifierName: values.notifierName, phone: values.phone, email: values.email }}
                        errors={{ notifierName: errors.notifierName, phone: errors.phone, email: errors.email }}
                        onChange={handleChange}
                    />

                    <ClaimDetailsSection
                        values={{
                            incidentDateTime: values.incidentDateTime,
                            lossPlace: values.lossPlace,
                            lossPlaceOther: values.lossPlaceOther,
                            boatName: values.boatName,
                            damageDetails: values.damageDetails,
                            damageDetailsOther: values.damageDetailsOther,
                            damageType: values.damageType,
                        }}
                        errors={{
                            incidentDateTime: errors.incidentDateTime,
                            lossPlace: errors.lossPlace,
                            lossPlaceOther: errors.lossPlaceOther,
                            boatName: errors.boatName,
                            damageDetails: errors.damageDetails,
                            damageDetailsOther: errors.damageDetailsOther,
                            damageType: errors.damageType,
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
                            '- ใบรับแจ้ง (FM-19-02-01)',
                            '- ภาพถ่ายของสินค้าที่เสียหาย',
                            '- หนังสือเรียกร้องค่าสินไหมไปยังผู้ขนส่ง',
                            '- เอกสารประกอบเพิ่มเติมอื่นๆ ซึ่งจะแจ้งขอเป็นกรณีไป',
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
