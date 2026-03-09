import { Card, Input } from '@/components/ui';

interface ClaimDetailsSectionProps {
    values: {
        accidentDate: string;
        treatmentDate: string;
        documentDeliveryDate: string;
        treatmentHospital: string;
        causeOfIllness: string;
    };
    errors: {
        accidentDate?: string;
        treatmentDate?: string;
        documentDeliveryDate?: string;
        treatmentHospital?: string;
        causeOfIllness?: string;
    };
    onChange: (field: string, value: string) => void;
}

export function ClaimDetailsSection({
    values,
    errors,
    onChange,
}: ClaimDetailsSectionProps) {
    return (
        <Card title="รายละเอียดเคลม">
            <div className="mb-3">
                <label htmlFor="accidentDate" className="form-label">
                    วันที่เกิดเหตุ หรือ เจ็บป่วย
                    <span className="required"> *</span>
                </label>
                <input
                    type="datetime-local"
                    id="accidentDate"
                    className={`form-control ${errors.accidentDate ? 'is-invalid' : ''}`}
                    value={values.accidentDate}
                    onChange={(e) => onChange('accidentDate', e.target.value)}
                    aria-invalid={!!errors.accidentDate}
                />
                {errors.accidentDate && (
                    <div className="invalid-feedback" role="alert">
                        {errors.accidentDate}
                    </div>
                )}
            </div>

            <div className="mb-3">
                <label htmlFor="treatmentDate" className="form-label">
                    วันที่เข้ารับการรักษา
                    <span className="required"> *</span>
                </label>
                <input
                    type="datetime-local"
                    id="treatmentDate"
                    className={`form-control ${errors.treatmentDate ? 'is-invalid' : ''}`}
                    value={values.treatmentDate}
                    onChange={(e) => onChange('treatmentDate', e.target.value)}
                    aria-invalid={!!errors.treatmentDate}
                />
                {errors.treatmentDate && (
                    <div className="invalid-feedback" role="alert">
                        {errors.treatmentDate}
                    </div>
                )}
            </div>

            <div className="mb-3">
                <label htmlFor="documentDeliveryDate" className="form-label">
                    วันที่จัดส่งเอกสารมายังบริษัท (กรณีเคลมตรง)
                    <span className="required"> *</span>
                </label>
                <input
                    type="date"
                    id="documentDeliveryDate"
                    className={`form-control ${errors.documentDeliveryDate ? 'is-invalid' : ''}`}
                    value={values.documentDeliveryDate}
                    onChange={(e) => onChange('documentDeliveryDate', e.target.value)}
                    aria-invalid={!!errors.documentDeliveryDate}
                />
                {errors.documentDeliveryDate && (
                    <div className="invalid-feedback" role="alert">
                        {errors.documentDeliveryDate}
                    </div>
                )}
            </div>

            <Input
                id="treatmentHospital"
                label="โรงพยาบาลที่เข้ารับการรักษา"
                value={values.treatmentHospital}
                onChange={(e) => onChange('treatmentHospital', e.target.value)}
                error={errors.treatmentHospital}
                required
                placeholder="- ระบุโรงพยาบาลที่เข้ารับการรักษา -"
            />

            <Input
                id="causeOfIllness"
                label="สาเหตุของความเจ็บป่วย"
                value={values.causeOfIllness}
                onChange={(e) => onChange('causeOfIllness', e.target.value)}
                error={errors.causeOfIllness}
                required
                placeholder="- ระบุสาเหตุการเจ็บป่วย -"
            />
        </Card>
    );
}

ClaimDetailsSection.displayName = 'ClaimDetailsSection';
