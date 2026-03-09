/**
 * Claim Form Page (Marine CL)
 * Adapted from FR_IAR_Claim
 */

import { useState } from 'react';
import { useLiff, useFileUpload, useLocationCascade } from '@/hooks';
import { marineClSchema } from '@/utils/validation';
import { scrollToFirstError } from '@/utils/dom';
import { convertBEtoCE } from './ClaimDetailsSection';
import { LoadingOverlay, SuccessScreen, ErrorModal } from '@/components';
import { submitClaim } from '@/services/api';
import { getContactEmail, USE_LOCAL_SAVE } from '@/config';
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
    causeOfLoss: string;
    incidentDateTime: string;
    lossPlace: string;
    lossPlaceOther?: string;
    lossReserve: string;
    carPlate: string;
    damageDetails: string;
    damageDetailsOther?: string;
    damageType: string;
}

interface FormErrors {
    notifierName?: string;
    phone?: string;
    email?: string;
    causeOfLoss?: string;
    incidentDateTime?: string;
    lossPlace?: string;
    lossPlaceOther?: string;
    lossReserve?: string;
    province?: string;
    district?: string;
    subdistrict?: string;
    zipcode?: string;
    carPlate?: string;
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
        causeOfLoss: '',
        incidentDateTime: '',
        lossPlace: '',
        lossPlaceOther: '',
        lossReserve: '',
        carPlate: '',
        damageDetails: '',
        damageDetailsOther: '',
        damageType: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});

    const location = useLocationCascade();

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
        const dataToValidate = {
            ...values,
            province: location.selectedProvince,
            district: location.selectedDistrict,
            subdistrict: location.selectedSubdistrict,
            zipcode: location.zipcode,
        };

        const result = marineClSchema.safeParse(dataToValidate);
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
        const placePart = values.lossPlace === '007' ? (values.lossPlaceOther || '') : values.lossPlace;
        const parts = [placePart];

        const subdistrictItem = location.subdistricts.find((s) => s.id === location.selectedSubdistrict);
        const districtItem = location.districts.find((d) => d.id === location.selectedDistrict);
        const provinceItem = location.provinces.find((p) => p.id === location.selectedProvince);

        if (subdistrictItem) parts.push(subdistrictItem.text);
        if (districtItem) parts.push(districtItem.text);
        if (provinceItem) parts.push(provinceItem.text);
        if (location.zipcode) parts.push(location.zipcode);

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
                incidentDateTime,
                lossPlace: fullAddress,
                province: location.selectedProvince,
                district: location.selectedDistrict,
                subdistrict: location.selectedSubdistrict,
                zipcode: location.zipcode,
                carPlate: values.carPlate,
                damageType: values.damageType,
                notifierName: values.notifierName,
                phone: values.phone,
                email: values.email || undefined,
            };

            const allFiles: File[] = [...docUpload.files.map((f) => f.file)];

            if (USE_LOCAL_SAVE) {
                const { saveClaimLocally } = await import('@/services/localSubmit');
                await saveClaimLocally({ claimType: 'Marine_CL_Claim', data: payload, documentFiles: allFiles });
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
        const contactEmail = getContactEmail('marine_cl');
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
                    แจ้งเคลม Marine CL (สอบถามข้อมูลเพิ่มเติม กรุณาติดต่อ Call Center 1736)
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
                            carPlate: values.carPlate,
                            damageDetails: values.damageDetails,
                            damageDetailsOther: values.damageDetailsOther,
                            damageType: values.damageType,
                        }}
                        errors={{
                            incidentDateTime: errors.incidentDateTime,
                            lossPlace: errors.lossPlace,
                            lossPlaceOther: errors.lossPlaceOther,
                            province: errors.province,
                            district: errors.district,
                            subdistrict: errors.subdistrict,
                            zipcode: errors.zipcode,
                            carPlate: errors.carPlate,
                            damageDetails: errors.damageDetails,
                            damageDetailsOther: errors.damageDetailsOther,
                            damageType: errors.damageType,
                        }}
                        onChange={handleChange}
                        provinces={location.provinces}
                        districts={location.districts}
                        subdistricts={location.subdistricts}
                        selectedProvince={location.selectedProvince}
                        selectedDistrict={location.selectedDistrict}
                        selectedSubdistrict={location.selectedSubdistrict}
                        zipcode={location.zipcode}
                        loadingProvinces={location.loadingProvinces}
                        loadingDistricts={location.loadingDistricts}
                        loadingSubdistricts={location.loadingSubdistricts}
                        zipcodeEditable={location.zipcodeEditable}
                        onProvinceChange={location.setSelectedProvince}
                        onDistrictChange={location.setSelectedDistrict}
                        onSubdistrictChange={location.setSelectedSubdistrict}
                        onZipcodeChange={location.setZipcode}
                        fetchProvinces={location.fetchProvinces}
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
