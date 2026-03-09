/**
 * Section 2: รายละเอียดเคลม
 * Adapted from CAR_EAR_CPM_Claim
 */

import { Card, Input, Select } from '@/components/ui';
import { DAMAGE_TYPE_GOLF } from '@/config/damageTypeGolf';

interface ClaimDetailsSectionProps {
    values: {
        incidentDateTime: string;
        lossPlace: string;
        lossPlaceOther?: string;
        Golfer: string;
        damageDetails: string;
        damageDetailsOther?: string;
        damageType: string;
    };
    errors: {
        incidentDateTime?: string;
        lossPlace?: string;
        lossPlaceOther?: string;
        Golfer?: string;
        damageDetails?: string;
        damageDetailsOther?: string;
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
        <Card title="รายละเอียดเคลม (Golf)">
            <Input
                id="Golfer"
                label="Golfer"
                value={values.Golfer}
                onChange={(e) => onChange('Golfer', e.target.value)}
                error={errors.Golfer}
                required
                placeholder="- ชื่อ Golfer -"
            />

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
                id="lossPlace"
                label="ชื่อสนามกอล์ฟ"
                value={values.lossPlace}
                onChange={(e) => onChange('lossPlace', e.target.value)}
                error={errors.lossPlace}
                required
                placeholder="- ชื่อสนามกอล์ฟ -"
            />

            <Input
                id="damageDetails"
                label="สาเหตุความเสียหาย"
                value={values.damageDetails}
                onChange={(e) => onChange('damageDetails', e.target.value)}
                error={errors.damageDetails}
                required
                placeholder="- สาเหตุความเสียหาย -"
            />

            {/* change to drop down */}
            <Select
                id="damageType"
                label="ลักษณะความเสียหาย หรือ รายละเอียดเหตุการณ์"
                options={DAMAGE_TYPE_GOLF.map((d) => ({ value: d.value, label: d.label }))}
                value={values.damageType}
                onChange={(e) => onChange('damageType', e.target.value)}
                error={errors.damageType}
                required
                placeholder="- ลักษณะความเสียหาย หรือ รายละเอียดเหตุการณ์ -"
            />

            {values.damageType === '004' && (
                <Input
                    id="damageDetailsOther"
                    label="รายละเอียดอื่นๆ"
                    value={values.damageDetailsOther}
                    onChange={(e) => onChange('damageDetailsOther', e.target.value)}
                    error={errors.damageDetailsOther}
                    placeholder="- รายละเอียดอื่นๆ -"
                />
            )}

        </Card>
    );
}

ClaimDetailsSection.displayName = 'ClaimDetailsSection';
