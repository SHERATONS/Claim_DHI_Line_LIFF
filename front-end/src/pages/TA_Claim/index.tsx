/**
 * Claim Form Page (TA)
 * Adapted from CAR_EAR_CPM_Claim but using useCountryCascade
 */

import { useState, useEffect } from 'react';
import { useLiff, useCountryCascade } from '@/hooks';
import { taSchema } from '@/utils/validation';
import { scrollToFirstError } from '@/utils/dom';
import { convertBEtoCE, ClaimDetailsSection } from './ClaimDetailsSection';
import { LoadingOverlay, SuccessScreen, ErrorModal } from '@/components';
import { submitClaim } from '@/services/api';
import { getContactEmail, USE_LOCAL_SAVE } from '@/config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { InsuredInfoSection } from '@/components/features/claim';

// Placeholder policy data — will be replaced by Loxley API integration.
const MOCK_POLICY_DATA = {
    policyNumber: '14020-114-210000161',
    policyHolder: 'นายทดสอบ ระบบเคลม',
    idcard: '1-1234-56789-01-2',
};

interface FormValues {
    notifierName: string;
    phone: string;
    email: string;
    incidentDateTime: string;
    travelFlight: string;
    country: string;
    town: string;
    accidentPlace: string;
    damageDetails: string;
    damageType: string;
}

interface FormErrors {
    notifierName?: string;
    phone?: string;
    email?: string;
    incidentDateTime?: string;
    travelFlight?: string;
    country?: string;
    town?: string;
    accidentPlace?: string;
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
        travelFlight: '',
        country: '',
        town: '',
        accidentPlace: '',
        damageDetails: '',
        damageType: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});

    const location = useCountryCascade();

    useEffect(() => {
        location.fetchCountries();
    }, [location.fetchCountries]);

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
        const result = taSchema.safeParse({ ...values });
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
            const countryItem = location.countries.find(c => c.id === values.country);
            const townItem = location.towns.find(t => t.id === values.town);

            const fullLocation = [
                values.accidentPlace,
                townItem?.text,
                countryItem?.text
            ].filter(Boolean).join(', ');

            const incidentDateTime = convertBEtoCE(values.incidentDateTime);

            const payload = {
                policyNumber,
                damageDetails: values.damageDetails,
                incidentDateTime,
                damageType: values.damageType,
                lossPlace: fullLocation,
                country: values.country,
                town: values.town,
                accidentPlace: values.accidentPlace,
                travelFlight: values.travelFlight,
                notifierName: values.notifierName,
                phone: values.phone,
                email: values.email || undefined,
            };

            const allFiles: File[] = [];

            if (USE_LOCAL_SAVE) {
                const { saveClaimLocally } = await import('@/services/localSubmit');
                await saveClaimLocally({ claimType: 'TA_Claim', data: payload, documentFiles: allFiles });
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
        const contactEmail = getContactEmail('ta');
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
                    แจ้งเคลม TA (สอบถามข้อมูลเพิ่มเติม กรุณาติดต่อ Call Center 1736)
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
                            travelFlight: values.travelFlight,
                            country: values.country,
                            town: values.town,
                            accidentPlace: values.accidentPlace,
                            damageDetails: values.damageDetails,
                            damageType: values.damageType,
                        }}
                        errors={{
                            incidentDateTime: errors.incidentDateTime,
                            travelFlight: errors.travelFlight,
                            country: errors.country,
                            town: errors.town,
                            accidentPlace: errors.accidentPlace,
                            damageDetails: errors.damageDetails,
                            damageType: errors.damageType,
                        }}
                        onChange={handleChange}
                        countries={location.countries}
                        towns={location.towns}
                        selectedCountry={location.selectedCountry}
                        selectedTown={location.selectedTown}
                        loadingCountries={location.loadingCountries}
                        loadingTowns={location.loadingTowns}
                        onCountryChange={location.setSelectedCountry}
                        onTownChange={location.setSelectedTown}
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
