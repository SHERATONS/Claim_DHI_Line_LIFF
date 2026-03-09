/**
 * Section 2: รายละเอียดเคลม (Drone)
 * Adapted from CAR_EAR_CPM_Claim
 */

import { Card, Input, Select } from '@/components/ui';
import { MARINE_PLACES } from '@/config/marinePlaces';

interface ClaimDetailsSectionProps {
    values: {
        incidentDateTime: string;
        lossPlace: string;
        lossPlaceOther?: string;
        driverName: string;
        droneModel: string;
        damageDetails: string;
        damageType: string;
    };
    errors: {
        incidentDateTime?: string;
        lossPlace?: string;
        lossPlaceOther?: string;
        driverName?: string;
        droneModel?: string;
        damageDetails?: string;
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
        <Card title="รายละเอียดเคลม (Drone)">
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

            <Input
                id="driverName"
                label="ชื่อนามสกุลผู้ขับขี่"
                value={values.driverName}
                onChange={(e) => onChange('driverName', e.target.value)}
                error={errors.driverName}
                required
                placeholder="- ชื่อผู้ขับขี่ -"
            />

            <Input
                id="droneModel"
                label="ยี่ห้อ/รุ่นโดรน"
                value={values.droneModel}
                onChange={(e) => onChange('droneModel', e.target.value)}
                error={errors.droneModel}
                placeholder="- ยี่ห้อ/รุ่นโดรน -"
            />

            <Select
                id="lossPlace"
                label="สถานที่เกิดเหตุ"
                options={MARINE_PLACES.map((c) => ({ value: c.value, label: c.label }))}
                value={values.lossPlace}
                onChange={(e) => onChange('lossPlace', e.target.value)}
                error={errors.lossPlace}
                required
                placeholder="- เลือกสถานที่เกิดเหตุ -"
            />

            {values.lossPlace === '007' && (
                <div className="mt-3">
                    <Input
                        id="lossPlaceOther"
                        label="ระบุสถานที่เกิดเหตุ (อื่นๆ)"
                        value={values.lossPlaceOther || ''}
                        onChange={(e) => onChange('lossPlaceOther', e.target.value)}
                        error={errors.lossPlaceOther}
                        required
                        placeholder="- ระบุสถานที่เกิดเหตุ -"
                    />
                </div>
            )}

            <Input
                id="damageDetails"
                label="สาเหตุความเสียหาย"
                value={values.damageDetails}
                onChange={(e) => onChange('damageDetails', e.target.value)}
                error={errors.damageDetails}
                required
                placeholder="- สาเหตุความเสียหาย -"
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
