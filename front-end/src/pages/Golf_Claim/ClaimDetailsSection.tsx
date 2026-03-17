/**
 * Section 2: รายละเอียดเคลม
 * Adapted from CAR_EAR_CPM_Claim
 */

import { Card, Input } from '@/components/ui';

interface ClaimDetailsSectionProps {
    values: {
        incidentDateTime: string;
        lossPlace: string;
        Golfer: string;
        causeOfLoss: string;
        lossReserve: string;
    };
    errors: {
        incidentDateTime?: string;
        lossPlace?: string;
        Golfer?: string;
        causeOfLoss?: string;
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

    let year = parseInt(yearStr, 10);
    if (year > 2400) {
        year -= 543;
    }

    return `${year}-${dateParts[1]}-${dateParts[2]}T${parts[1]}`;
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

            <Input
                id="incidentDateTime"
                label="วันที่/เวลาเกิดเหตุ"
                type="datetime-local"
                value={values.incidentDateTime}
                onChange={(e) => {
                    const val = e.target.value;
                    onChange('incidentDateTime', val);
                }}
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
