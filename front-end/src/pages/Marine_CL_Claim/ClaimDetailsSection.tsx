/**
 * Section 2: รายละเอียดเคลม
 * ลอกจาก LIFF_Form.page — cause of loss, datetime, address cascade, zipcode, reserve
 */

import { Card, Input, Select } from '@/components/ui';
import { TRANSPORTATION_TYPE } from '@/config/transportationType';

interface ClaimDetailsSectionProps {
    values: {
        incidentDateTime: string;
        lossPlace: string;
        vehicleName: string;
        vehiclePlate: string;
        transportationType: string;
        causeOfLoss: string;
        lossReserve: string;
    };
    errors: {
        incidentDateTime?: string;
        lossPlace?: string;
        vehicleName?: string;
        vehiclePlate?: string;
        transportationType?: string;
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

    const dateParts = parts[0]!.split('-');
    if (dateParts.length < 3 || !dateParts[0]) return dateTimeValue;

    const year = parseInt(dateParts[0], 10);
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
        <Card title="รายละเอียดเคลม (Marine CL)">
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
                id="vehicleName"
                label="ชื่อพาหนะขนส่ง"
                value={values.vehicleName}
                onChange={(e) => onChange('vehicleName', e.target.value)}
                error={errors.vehicleName}
                required
                placeholder="- ชื่อพาหนะขนส่ง -"
            />

            <Input
                id="vehiclePlate"
                label="ทะเบียนพาหนะขนส่ง (รถ, เลขเรือ, เลข Flight)"
                value={values.vehiclePlate}
                onChange={(e) => onChange('vehiclePlate', e.target.value)}
                error={errors.vehiclePlate}
                required
                placeholder="- ทะเบียนพาหนะขนส่ง (รถ, เลขเรือ, เลข Flight) -"
            />

            <Select
                id="transportationType"
                label="สินค้าขนส่งทางไหน"
                options={TRANSPORTATION_TYPE.map((c) => ({ value: c.value, label: c.label }))}
                value={values.transportationType}
                onChange={(e) => onChange('transportationType', e.target.value)}
                error={errors.transportationType}
                required
                placeholder="- กรุณาเลือกประเภทการขนส่ง -"
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
