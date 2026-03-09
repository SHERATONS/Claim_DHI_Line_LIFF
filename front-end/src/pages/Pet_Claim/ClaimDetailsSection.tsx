/**
 * Section 2: รายละเอียดเคลม (Pet)
 * Adapted from Drone_Claim
 */

import { Card, Input, Select } from '@/components/ui';
import { PET_TYPES, PET_GENDERS } from '@/config/petType';

interface ClaimDetailsSectionProps {
    values: {
        incidentDateTime: string;
        petName: string;
        petType: string;
        petTypeOther?: string;
        petSpecies: string;
        petGender: string;
        petAge: string;
        microchipNumber: string;
        petHospital: string;
        causeOfIllness: string;
        damageType: string;
    };
    errors: {
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
    };
    onChange: (field: string, value: string) => void;
}

/**
 * Convert Buddhist Era year to Christian Era if needed
 * Thai browsers sometimes return years in พ.ศ. (BE)
 */
export function convertBEtoCE(dateTimeValue: string): string {
    if (!dateTimeValue) return '';
    const parts = dateTimeValue.split('T');
    if (parts.length < 2) return dateTimeValue;

    const datePart = parts[0];
    if (!datePart) return dateTimeValue;

    const dateParts = datePart.split('-');
    if (dateParts.length < 3) return dateTimeValue;

    const yearStr = dateParts[0];
    if (!yearStr) return dateTimeValue;

    let year = parseInt(yearStr, 10);
    if (year > 2400) {
        year -= 543;
    }

    return `${year}-${dateParts[1]}-${dateParts[2]} ${parts[1]}`;
}

export function ClaimDetailsSection({
    values,
    errors,
    onChange,
}: ClaimDetailsSectionProps) {
    return (
        <Card title="รายละเอียดเคลม (Pet)">
            <div className="mb-3">
                <label htmlFor="incidentDateTime" className="form-label">
                    วันที่/เวลาเกิดเหตุ
                    <span className="required"> *</span>
                </label>
                <input
                    type="datetime-local"
                    id="incidentDateTime"
                    className={`form-control ${errors.incidentDateTime ? 'is-invalid' : ''}`}
                    value={values.incidentDateTime}
                    onChange={(e) => onChange('incidentDateTime', e.target.value)}
                    aria-invalid={!!errors.incidentDateTime}
                />
                {errors.incidentDateTime && (
                    <div className="invalid-feedback" role="alert">
                        {errors.incidentDateTime}
                    </div>
                )}
            </div>

            <Select
                id="petType"
                label="ประเภทสัตว์เลี้ยง"
                options={PET_TYPES.map((c) => ({ value: c.value, label: c.label }))}
                value={values.petType}
                onChange={(e) => onChange('petType', e.target.value)}
                error={errors.petType}
                required
                placeholder="- เลือกประเภทสัตว์เลี้ยง -"
            />

            {values.petType === '006' && (
                <div className="mt-3">
                    <Input
                        id="petTypeOther"
                        label="ระบุประเภทสัตว์เลี้ยง (อื่นๆ)"
                        value={values.petTypeOther || ''}
                        onChange={(e) => onChange('petTypeOther', e.target.value)}
                        error={errors.petTypeOther}
                        required
                        placeholder="- ระบุประเภทสัตว์เลี้ยง -"
                    />
                </div>
            )}

            <Input
                id="petName"
                label="ชื่อสัตว์เลี้ยง"
                value={values.petName}
                onChange={(e) => onChange('petName', e.target.value)}
                error={errors.petName}
                required
                placeholder="- ชื่อสัตว์เลี้ยง -"
            />


            <Input
                id="petSpecies"
                label="สายพันธุ์สัตว์เลี้ยง"
                value={values.petSpecies}
                onChange={(e) => onChange('petSpecies', e.target.value)}
                error={errors.petSpecies}
                placeholder="- สายพันธุ์สัตว์เลี้ยง -"
            />

            <Select
                id="petGender"
                label="เพศสัตว์เลี้ยง"
                options={PET_GENDERS.map((c) => ({ value: c.value, label: c.label }))}
                value={values.petGender}
                onChange={(e) => onChange('petGender', e.target.value)}
                error={errors.petGender}
                required
                placeholder="- เลือกเพศสัตว์เลี้ยง -"
            />

            <Input
                id="microchipNumber"
                label="หมายเลข Microchip"
                value={values.microchipNumber}
                onChange={(e) => onChange('microchipNumber', e.target.value)}
                error={errors.microchipNumber}
                placeholder="- หมายเลข Microchip -"
            />

            <Input
                id="petHospital"
                label="เข้ารักษาที่คลินิคหรือโรงพยาบาล"
                value={values.petHospital}
                onChange={(e) => onChange('petHospital', e.target.value)}
                error={errors.petHospital}
                placeholder="- เข้ารักษาที่คลินิคหรือโรงพยาบาล -"
            />

            <Input
                id="causeOfIllness"
                label="สาเหตุความเสียหาย / เจ็บป่วย"
                value={values.causeOfIllness}
                onChange={(e) => onChange('causeOfIllness', e.target.value)}
                error={errors.causeOfIllness}
                required
                placeholder="- สาเหตุความเสียหาย/เจ็บป่วย -"
            />

            <Input
                id="damageType"
                label="ลักษณะความเสียหาย หรือ รายละเอียดเหตุการณ์"
                value={values.damageType}
                onChange={(e) => onChange('damageType', e.target.value)}
                error={errors.damageType}
                required
                placeholder="- อะไรเสียหาย/เสียหายอย่างไร -"
            />
        </Card>
    );
}

ClaimDetailsSection.displayName = 'ClaimDetailsSection';
