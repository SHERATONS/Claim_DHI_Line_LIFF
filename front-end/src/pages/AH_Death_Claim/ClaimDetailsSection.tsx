import { Card, Input } from '@/components/ui';

interface ClaimDetailsSectionProps {
    values: {
        accidentDate: string;
        lossPlace: string;
        treatmentDate: string;
        treatmentHospital: string;
        causeOfLoss: string;
        lossReserve: string;
    };
    errors: {
        accidentDate?: string;
        lossPlace?: string;
        treatmentDate?: string;
        treatmentHospital?: string;
        causeOfLoss?: string;
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
        <Card title="รายละเอียดเคลม">
            <Input
                id="accidentDate"
                type="datetime-local"
                label="วันที่เกิดเหตุ หรือ เจ็บป่วย"
                value={values.accidentDate}
                onChange={(e) => onChange('accidentDate', e.target.value)}
                error={errors.accidentDate}
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
                id="treatmentDate"
                type="datetime-local"
                label="วันที่เข้ารับการรักษา"
                value={values.treatmentDate}
                onChange={(e) => onChange('treatmentDate', e.target.value)}
                error={errors.treatmentDate}
                required
            />

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
                id="causeOfLoss"
                label="สาเหตุการเจ็บป่วย/เสียชีวิต"
                value={values.causeOfLoss}
                onChange={(e) => onChange('causeOfLoss', e.target.value)}
                error={errors.causeOfLoss}
                required
                placeholder="- ระบุสาเหตุการเจ็บป่วย/เสียชีวิต -"
            />

            <Input
                id="lossReserve"
                label="ประมาณการค่าสินไหม"
                type="text"
                inputMode="decimal"
                value={values.lossReserve}
                onChange={(e) => onChange('lossReserve', e.target.value)}
                error={errors.lossReserve}
                placeholder="0.00"
            />
        </Card>
    );
}

ClaimDetailsSection.displayName = 'ClaimDetailsSection';
