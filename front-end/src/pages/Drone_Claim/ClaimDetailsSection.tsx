/**
 * Section 2: รายละเอียดเคลม (Drone)
 * Adapted from CAR_EAR_CPM_Claim
 */

import { Card, Input } from '@/components/ui';

interface ClaimDetailsSectionProps {
    values: {
        incidentDateTime: string;
        lossPlace: string;
        driverName: string;
        droneModel: string;
        damageType: string;
        lossReserve: string;
    };
    errors: {
        incidentDateTime?: string;
        lossPlace?: string;
        driverName?: string;
        droneModel?: string;
        damageType?: string;
        lossReserve?: string;
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

    const year = parseInt(yearStr, 10);
    if (isNaN(year)) return dateTimeValue;

    if (year > 2400) {
        const ceYear = year - 543;
        const ceYearStr = ceYear.toString().padStart(4, '0');
        return `${ceYearStr}-${dateParts[1]}-${dateParts[2]}T${parts[1]}`;
    }

    return dateTimeValue;
}

export function ClaimDetailsSection({
    values,
    errors,
    onChange,
}: ClaimDetailsSectionProps) {
    return (
        <Card title="รายละเอียดเคลม (Drone)">
            <Input
                id="incidentDateTime"
                type="datetime-local"
                label="วันที่/เวลาเกิดเหตุ"
                value={values.incidentDateTime}
                onChange={(e) => onChange('incidentDateTime', e.target.value)}
                error={errors.incidentDateTime}
                required
            />

            <Input
                id="lossPlace"
                label="สถานที่เกิดเหตุ"
                value={values.lossPlace}
                onChange={(e) => onChange('lossPlace', e.target.value)}
                error={errors.lossPlace}
                required
                placeholder="- ระบุสถานที่เกิดเหตุ -"
            />


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

            <Input
                id="damageType"
                label="รายละเอียดของความเสียหายเพิ่มเติม"
                value={values.damageType}
                onChange={(e) => onChange('damageType', e.target.value)}
                error={errors.damageType}
                required
                placeholder="- ระบุรายละเอียดของความเสียหายเพิ่มเติม -"
            />

            <Input
                id="lossReserve"
                label="ประมาณการค่าสินไหม"
                type="text"
                inputMode="decimal"
                value={values.lossReserve}
                onChange={(e) => onChange('lossReserve', e.target.value)}
                error={errors.lossReserve}
                required
                placeholder="0.00"
            />
        </Card>
    );
}

ClaimDetailsSection.displayName = 'ClaimDetailsSection';
