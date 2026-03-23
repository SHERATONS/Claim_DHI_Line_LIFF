/**
 * FR_IAR Claim Form
 * Fire & Industrial All Risk claim submission.
 */

import { useState, useEffect } from 'react';
import { useLiff, useFileUpload, useLocationCascade } from '@/hooks';
import { frIarSchema } from '@/utils/validation';
import { scrollToFirstError } from '@/utils/dom';
import { convertBEtoCE } from './ClaimDetailsSection';
import { LoadingOverlay, SuccessScreen, ErrorModal } from '@/components';
import { submitClaim } from '@/services/api';
import { getContactEmail } from '@/config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { InsuredInfoSection, PersonalDocumentUpload } from '@/components/features/claim';
import { ClaimDetailsSection } from './ClaimDetailsSection';

// Placeholder policy data — will be replaced by Loxley API integration.
const MOCK_POLICY_DATA = {
  policyNumber: '12001-860-200265456',
  policyHolder: 'ปิยะศิลป์ หุบชะบา',
  idcard: '1-1234-56789-01-2',
};

interface FormValues {
  notifierName: string;
  phone: string;
  email: string;
  incidentDateTime: string;
  lossPlace: string;
  causeOfLoss: string;
  lossReserve: string;
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
  causeOfLoss?: string;
  lossReserve?: string;
}

export default function ClaimForm() {
  const { getAccessToken, closeWindow, profile } = useLiff();

  const policyNumber = MOCK_POLICY_DATA.policyNumber;
  const policyHolder = MOCK_POLICY_DATA.policyHolder;
  const idcard = MOCK_POLICY_DATA.idcard;

  const [values, setValues] = useState<FormValues>({
    notifierName: '',
    phone: '',
    email: '',
    incidentDateTime: '',
    lossPlace: '',
    causeOfLoss: '',
    lossReserve: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Pre-fill notifierName from LIFF profile.
  useEffect(() => {
    if (profile?.displayName) {
      setValues((prev) => {
        if (!prev.notifierName) {
          return { ...prev, notifierName: profile.displayName };
        }
        return prev;
      });
    }
  }, [profile]);

  const location = useLocationCascade();

  const docUpload = useFileUpload({ maxFiles: 10, autoCompress: true, filePrefix: 'document' });
  const [docFileErrors, setDocFileErrors] = useState<string[]>([]);

  const [submitState, setSubmitState] = useState<{
    loading: boolean;
    success: boolean;
    error: string | null;
    caseNumber: string | null;
    notificationNo: string | null;
    uploadWarning: string | null;
  }>({
    notificationNo: null,
    loading: false,
    success: false,
    error: null,
    caseNumber: null,
    uploadWarning: null,
  });

  const handleChange = (field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const result = frIarSchema.safeParse({
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
    if (errorFields.length > 0) scrollToFirstError(errorFields);
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

    const fullAddress = buildFullAddress();
    const incidentDateTime = convertBEtoCE(values.incidentDateTime);

    const allFiles = [
      ...docUpload.files.map((f) => f.file),
    ];

    const token = getAccessToken() ?? (import.meta.env.DEV ? 'dev-bypass' : null);
    if (!token) {
      setSubmitState((s) => ({
        ...s,
        error: 'ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาลองใหม่อีกครั้ง',
      }));
      return;
    }

    setSubmitState({ loading: true, success: false, error: null, caseNumber: null, notificationNo: null, uploadWarning: null });

    try {
      const payload = {
        policyNo: policyNumber,
        contactId: idcard,
        notifierName: values.notifierName,
        phone: values.phone,
        email: values.email || undefined,
        incidentDateTime,
        lossPlace: values.lossPlace,
        fullAddress,
        provinceId: location.selectedProvince,
        districtId: location.selectedDistrict,
        subdistrictId: location.selectedSubdistrict,
        zipcode: location.zipcode,
        causeOfLoss: values.causeOfLoss,
        lossReserve: values.lossReserve || undefined,
      };

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value as string);
        }
      });
      allFiles.forEach((file) => formData.append('files', file));

      const result = await submitClaim('/api/claims/friar', formData, token);

      if (!result.caseId) {
        throw new Error('ไม่ได้รับหมายเลขเคส');
      }

      setSubmitState({
        caseNumber: result.caseNumber ?? null,
        loading: false,
        success: true,
        error: null,
        notificationNo: result.notificationNo ?? null,
        uploadWarning: result.error ?? null,
      });
    } catch (error) {
      setSubmitState({
        notificationNo: null,
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการส่งข้อมูล',
        caseNumber: null,
        uploadWarning: null,
      });
    }
  };

  const handleDocFilesAdd = async (newFiles: FileList | File[]) => {
    const results = await docUpload.addFiles(newFiles);
    const errs = results.filter((r) => !r.valid).map((r) => r.error ?? 'ไฟล์ไม่ถูกต้อง');
    setDocFileErrors(errs.length > 0 ? errs : []);
  };

  if (submitState.success) {
    const contactEmail = getContactEmail('974'); // Default flood
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
        onClose={() => setSubmitState((s) => ({ ...s, error: null }))}
      />

      <div className="header-section">
        <div className="header-logo">DHIPAYA INSURANCE</div>
        <div style={{ fontSize: '0.95rem', marginTop: 5 }}>
          แจ้งเคลม การประกันภัยอัคคีภัย (FIR) และ การประกันภัยความเสี่ยงภัยทรัพย์สิน (IAR) (สอบถามข้อมูลเพิ่มเติม กรุณาติดต่อ Call Center 1736)
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
              causeOfLoss: values.causeOfLoss,
              lossReserve: values.lossReserve,
            }}
            errors={{
              incidentDateTime: errors.incidentDateTime,
              lossPlace: errors.lossPlace,
              province: errors.province,
              district: errors.district,
              subdistrict: errors.subdistrict,
              zipcode: errors.zipcode,
              causeOfLoss: errors.causeOfLoss,
              lossReserve: errors.lossReserve,
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
              '1. อัพโหลดเอกสาร',
              '- สำเนาบัตรประชาชน',
              '- สำเนากรมธรรม์',
              '- สำเนาบัญชีธนาคาร',
              '2. ใบประเมินราคาซ่อม (ถ้ามี)',
              '3. อัพโหลดรูปความเสียหาย',
              '- ภาพถ่ายให้เห็นระดับน้ำที่ท่วมบริเวณบ้าน',
              '- ภาพถ่ายให้เห็นความเสียหายของสิ่งของภายในบ้าน',
              '- ภาพถ่ายผู้เอาประกันภัยที่แสดงให้เห็นบ้านเลขที่ของบ้านที่ถูกน้ำท่วม',
            ]}
          />

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
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
          </div>
        </form>
      </div>
    </>
  );
}
