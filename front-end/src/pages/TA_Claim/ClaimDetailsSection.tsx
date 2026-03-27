/**
 * Section 2: รายละเอียดเคลม (TA)
 * Uses useCountryCascade for Country/Town selection
 */

import { Card, Input } from '@/components/ui';

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

interface ClaimDetailsSectionProps {
    values: {
        incidentDateTime: string;
        lossPlace: string;
        causeOfLoss: string;    // Injury Details
        flightNumber?: string;
        lossReserve?: string;
    };
    errors: {
        incidentDateTime?: string;
        lossPlace?: string;
        causeOfLoss?: string;
        flightNumber?: string;
        lossReserve?: string;
    };
    onChange: (field: string, value: string) => void;
}

export function ClaimDetailsSection({
    values,
    errors,
    onChange,
}: ClaimDetailsSectionProps) {
    return (
        <Card title="รายละเอียดเคลม (TA)">
            <Input
                id="incidentDateTime"
                type="datetime-local"
                label="วันที่/เวลาเกิดเหตุ"
                value={values.incidentDateTime}
                onChange={(e) => onChange('incidentDateTime', convertBEtoCE(e.target.value))}
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
                id="flightNumber"
                label="หมายเลขเที่ยวบิน"
                value={values.flightNumber}
                onChange={(e) => onChange('flightNumber', e.target.value)}
                error={errors.flightNumber}
                required
                placeholder="- ระบุหมายเลขเที่ยวบิน -"
            />

            <Input
                id="causeOfLoss"
                label="รายละเอียดของความเสียหายเพิ่มเติม"
                value={values.causeOfLoss}
                onChange={(e) => onChange('causeOfLoss', e.target.value)}
                error={errors.causeOfLoss}
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
