/**
 * Claim Form Page (CAR-EAR CMP)
 * Adapted from Marine_HULL_Claim
 */

import { useState } from 'react';
import { useLiff, useLocationCascade } from '@/hooks';
import { carEarCpmSchema } from '@/utils/validation';
import { scrollToFirstError } from '@/utils/dom';
import { convertBEtoCE } from './ClaimDetailsSection';
import { LoadingOverlay, SuccessScreen, ErrorModal } from '@/components';
import { submitClaim } from '@/services/api';
import { getContactEmail, USE_LOCAL_SAVE } from '@/config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { InsuredInfoSection } from '@/components/features/claim';
import { ClaimDetailsSection } from './ClaimDetailsSection';

// Placeholder policy data — will be replaced by Loxley API integration.
const MOCK_POLICY_DATA = {
    policyNumber: '14019-900-992004318',
    policyHolder: 'Tangkapat Satja',
    idcard: '1-1234-56789-01-2',
};

interface FormValues {
    notifierName: string;
    phone: string;
    email: string;
    incidentDateTime: string;
    lossPlace: string;
    projectTitle: string;
    contractorName: string;
    damageDetails: string;
    damageType: string;
}

interface FormErrors {
    notifierName?: string;
    phone?: string;
    email?: string;
    incidentDateTime?: string;
    lossPlace?: string;
    province?: string;
    district?: string;
    subdistrict?: string;
    zipcode?: string;
    projectTitle?: string;
    contractorName?: string;
    damageDetails?: string;
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
        projectTitle: '',
        contractorName: '',
        damageDetails: '',
        damageType: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});

    const location = useLocationCascade();

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
        const result = carEarCpmSchema.safeParse({
            ...values,
            province: location.selectedProvince,
            district: location.selectedDistrict,
            subdistrict: location.selectedSubdistrict,
            zipcode: location.zipcode,
        });
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
        const parts = [values.lossPlace];
        const sub = location.subdistricts.find((s) => s.id === location.selectedSubdistrict);
        const dist = location.districts.find((d) => d.id === location.selectedDistrict);
        const prov = location.provinces.find((p) => p.id === location.selectedProvince);
        if (sub) parts.push(sub.text);
        if (dist) parts.push(dist.text);
        if (prov) parts.push(prov.text);
        if (location.zipcode) parts.push(location.zipcode);
        return parts.filter(Boolean).join(' ');
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!validateForm()) return;

        const token = getAccessToken();
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
                damageType: values.damageType,
                lossPlace: values.lossPlace,
                fullAddress,
                provinceId: location.selectedProvince,
                districtId: location.selectedDistrict,
                subdistrictId: location.selectedSubdistrict,
                zipcode: location.zipcode,
                projectTitle: values.projectTitle,
                contractorName: values.contractorName,
                damageDetails: values.damageDetails,
                notifierName: values.notifierName,
                phone: values.phone,
                email: values.email || undefined,
            };

            const allFiles: File[] = [];

            if (USE_LOCAL_SAVE) {
                const { saveClaimLocally } = await import('@/services/localSubmit');
                await saveClaimLocally({ claimType: 'CAR_EAR_CPM_Claim', data: payload, documentFiles: allFiles });
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
        const contactEmail = getContactEmail('car_ear_cpm');
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
                    แจ้งเคลม CAR-EAR CMP (สอบถามข้อมูลเพิ่มเติม กรุณาติดต่อ Call Center 1736)
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
                            incidentDateTime: values.incidentDateTime,
                            lossPlace: values.lossPlace,
                            projectTitle: values.projectTitle,
                            contractorName: values.contractorName,
                            damageDetails: values.damageDetails,
                            damageType: values.damageType,
                        }}
                        errors={{
                            incidentDateTime: errors.incidentDateTime,
                            lossPlace: errors.lossPlace,
                            province: errors.province,
                            district: errors.district,
                            subdistrict: errors.subdistrict,
                            zipcode: errors.zipcode,
                            projectTitle: errors.projectTitle,
                            contractorName: errors.contractorName,
                            damageDetails: errors.damageDetails,
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
