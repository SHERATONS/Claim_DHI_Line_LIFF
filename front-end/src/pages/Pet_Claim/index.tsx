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
import { getContactEmail } from '@/config';
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
    idcard: '1219900960846',
};

interface FormValues {
    notifierName: string;
    phone: string;
    email: string;
    incidentDateTime: string;
    petName: string;
    petType: string;
    petSpecies: string;
    petGender: string;
    petAge: string;
    microchipNumber: string;
    petHospital: string;
    causeOfLoss: string;
    lossReserve: string;
}

interface FormErrors {
    notifierName?: string;
    phone?: string;
    email?: string;
    incidentDateTime?: string;
    petName?: string;
    petType?: string;
    petSpecies?: string;
    petGender?: string;
    petAge?: string;
    microchipNumber?: string;
    petHospital?: string;
    causeOfLoss?: string;
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
        incidentDateTime: '',
        petName: '',
        petType: '',
        petSpecies: '',
        petGender: '',
        petAge: '',
        microchipNumber: '',
        petHospital: '',
        causeOfLoss: '',
        lossReserve: '',
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

        setSubmitState({ loading: true, success: false, error: null, caseNumber: null, notificationNo: null });

        try {
            const petTypeDescription = buildPetType();
            const incidentDateTime = convertBEtoCE(values.incidentDateTime);

            const payload = {
                policyNo: policyNumber,
                contactId: idcard,
                notifierName: values.notifierName,
                phone: values.phone,
                email: values.email || undefined,
                incidentDateTime,
                petName: values.petName,
                petType: petTypeDescription,
                petSpecies: values.petSpecies || undefined,
                petGender: values.petGender,
                petAge: values.petAge || undefined,
                microchipNumber: values.microchipNumber || undefined,
                petHospital: values.petHospital || undefined,
                causeOfLoss: values.causeOfLoss,
                lossReserve: values.lossReserve ? parseFloat(values.lossReserve.replace(/,/g, '')) : undefined,
            };

            const allFiles = [...docUpload.files.map((f) => f.file)];

            const formData = new FormData();
            Object.entries(payload).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(key, value as string);
                }
            });
            allFiles.forEach((file) => formData.append('files', file));

            const result = await submitClaim('/api/claims/pet', formData, token);

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

    const handleCloseError = () => {
        setSubmitState((s) => ({ ...s, error: null }));
    };

    if (submitState.success) {
        const contactEmail = getContactEmail('pet');
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
                    แจ้งเคลม ประกันภัยสัตว์เลี้ยง(Pet) (สอบถามข้อมูลเพิ่มเติม กรุณาติดต่อ Call Center 1736)
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
                            petSpecies: values.petSpecies,
                            petGender: values.petGender,
                            petAge: values.petAge,
                            microchipNumber: values.microchipNumber,
                            petHospital: values.petHospital,
                            causeOfLoss: values.causeOfLoss,
                            lossReserve: values.lossReserve,
                        }}
                        errors={{
                            incidentDateTime: errors.incidentDateTime,
                            petName: errors.petName,
                            petType: errors.petType,
                            petSpecies: errors.petSpecies,
                            petGender: errors.petGender,
                            petAge: errors.petAge,
                            microchipNumber: errors.microchipNumber,
                            petHospital: errors.petHospital,
                            causeOfLoss: errors.causeOfLoss,
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
