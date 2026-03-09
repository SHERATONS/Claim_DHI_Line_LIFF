/**
 * Claim Form Page (Pet)
 * Adapted from Drone_Claim
 */

import { useState } from 'react';
import { useLiff, useFileUpload } from '@/hooks';
import { petSchema } from '@/utils/validation';
import { scrollToFirstError } from '@/utils/dom';
import { convertBEtoCE } from './ClaimDetailsSection';
import { LoadingOverlay, SuccessScreen, ErrorModal } from '@/components';
import { submitClaim } from '@/services/api';
import { getContactEmail, USE_LOCAL_SAVE } from '@/config';
import { PET_TYPES } from '@/config/petType';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { InsuredInfoSection } from '@/components/features/claim';
import { PersonalDocumentUpload } from '@/components/features/claim/PersonalDocumentUpload';
import { ClaimDetailsSection } from './ClaimDetailsSection';

// Placeholder policy data — will be replaced by Loxley API integration.
const MOCK_POLICY_DATA = {
    policyNumber: '14058-108-240004161',
    policyHolder: 'จิตสุชา ดาราเย็น',
    idcard: '1-1234-56789-01-2',
};

interface FormValues {
    notifierName: string;
    phone: string;
    email: string;
    incidentDateTime: string;
    petName: string;
    petType: string;
    petTypeOther: string;
    petSpecies: string;
    petGender: string;
    petAge: string;
    microchipNumber: string;
    petHospital: string;
    causeOfIllness: string;
    damageType: string;
}

interface FormErrors {
    notifierName?: string;
    phone?: string;
    email?: string;
    incidentDateTime?: string;
    petName?: string;
    petType?: string;
    petTypeOther?: string;
    petSpecies?: string;
    petGender?: string;
    petAge?: string;
    microchipNumber?: string;
    petHospital?: string;
    causeOfIllness?: string;
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
        petName: '',
        petType: '',
        petTypeOther: '',
        petSpecies: '',
        petGender: '',
        petAge: '',
        microchipNumber: '',
        petHospital: '',
        causeOfIllness: '',
        damageType: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});

    const docUpload = useFileUpload({ maxFiles: 10, autoCompress: true });
    const [docFileErrors, setDocFileErrors] = useState<string[]>([]);

    const handleDocFilesAdd = async (files: FileList | File[]) => {
        const results = await docUpload.addFiles(files);
        const newErrors: string[] = [];
        results.forEach((res) => {
            if (!res.valid && res.error) newErrors.push(res.error);
        });
        setDocFileErrors(newErrors);
    };

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
        const result = petSchema.safeParse({ ...values });
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

    const buildPetType = (): string => {
        if (values.petType === '006') return values.petTypeOther || 'อื่นๆ';
        const petTypeItem = PET_TYPES.find(p => p.value === values.petType);
        return petTypeItem ? petTypeItem.label : '';
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
            const petTypeDescription = buildPetType();
            const incidentDateTime = convertBEtoCE(values.incidentDateTime);

            const payload = {
                policyNumber,
                incidentDateTime,
                damageType: values.damageType,
                petName: values.petName,
                petType: petTypeDescription,
                petSpecies: values.petSpecies || undefined,
                petGender: values.petGender,
                petAge: values.petAge || undefined,
                microchipNumber: values.microchipNumber || undefined,
                petHospital: values.petHospital || undefined,
                causeOfIllness: values.causeOfIllness,
                notifierName: values.notifierName,
                phone: values.phone,
                email: values.email || undefined,
            };

            const allFiles: File[] = [...docUpload.files.map((f) => f.file)];

            if (USE_LOCAL_SAVE) {
                const { saveClaimLocally } = await import('@/services/localSubmit');
                await saveClaimLocally({ claimType: 'Pet_Claim', data: payload, documentFiles: allFiles });
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

    const handleCloseError = () => {
        setSubmitState((s) => ({ ...s, error: null }));
    };

    if (submitState.success) {
        const contactEmail = getContactEmail('pet');
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
                    แจ้งเคลม Pet (สอบถามข้อมูลเพิ่มเติม กรุณาติดต่อ Call Center 1736)
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
                            petName: values.petName,
                            petType: values.petType,
                            petTypeOther: values.petTypeOther,
                            petSpecies: values.petSpecies,
                            petGender: values.petGender,
                            petAge: values.petAge,
                            microchipNumber: values.microchipNumber,
                            petHospital: values.petHospital,
                            causeOfIllness: values.causeOfIllness,
                            damageType: values.damageType,
                        }}
                        errors={{
                            incidentDateTime: errors.incidentDateTime,
                            petName: errors.petName,
                            petType: errors.petType,
                            petTypeOther: errors.petTypeOther,
                            petSpecies: errors.petSpecies,
                            petGender: errors.petGender,
                            petAge: errors.petAge,
                            microchipNumber: errors.microchipNumber,
                            petHospital: errors.petHospital,
                            causeOfIllness: errors.causeOfIllness,
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
                            "1. ใบรับรองแพทย์ในวันที่เข้ารับการรักษา (กรณีเบิกค่าเจ็บป่วย/อุบัติเหตุ) หรือ สมุดวัคซีน (กรณีเบิกค่าวัคซีน)",
                            "2. ใบเสร็จค่ารักษา",
                            "3. สำเนาบัตรประชาชนของผู้เอาประกันภัย",
                            "4. หน้าบัญชีธนาคารของผู้เอาประกันภัย",
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
