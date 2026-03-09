/**
 * Section 1: ข้อมูลผู้เอาประกันภัย
 * Reusable component for displaying and editing insured person information.
 */

import { useState } from 'react';
import { Card, Input, Checkbox } from '@/components/ui';
import { faUserShield } from '@fortawesome/free-solid-svg-icons';

interface InsuredInfoSectionProps {
    /** Readonly data pre-filled from backend */
    policyNumber: string;
    policyHolder: string;
    idcard: string;
    /** Form values */
    values: {
        notifierName: string;
        phone: string;
        email: string;
    };
    errors?: {
        notifierName?: string;
        phone?: string;
        email?: string;
    };
    onChange: (field: string, value: string) => void;
}

export function InsuredInfoSection({
    policyNumber,
    policyHolder,
    idcard,
    values,
    errors,
    onChange,
}: InsuredInfoSectionProps) {
    const [sameAsPolicyHolder, setSameAsPolicyHolder] = useState(false);
    // Store original notifier name before checkbox changes it
    const [originalNotifierName, setOriginalNotifierName] = useState('');

    const handleSamePersonChange = (checked: boolean) => {
        setSameAsPolicyHolder(checked);
        if (checked) {
            // Save current notifierName before overwriting
            setOriginalNotifierName(values.notifierName);
            // Copy policyHolder to notifierName
            onChange('notifierName', policyHolder);
        } else {
            // Restore original value
            onChange('notifierName', originalNotifierName);
        }
    };

    return (
        <Card title="ข้อมูลผู้เอาประกันภัย" icon={faUserShield}>
            <Input
                label="เลขที่กรมธรรม์"
                value={policyNumber}
                readOnly
            />

            <Input
                label="ชื่อ นามสกุล ผู้เอาประกันภัย"
                value={policyHolder}
                readOnly
            />

            <Input
                label="หมายเลขบัตรประชาชน"
                value={idcard}
                readOnly
            />

            <Checkbox
                label="ผู้แจ้งคือบุคคลเดียวกับผู้เอาประกันภัย"
                checked={sameAsPolicyHolder}
                onChange={(e) => handleSamePersonChange(e.target.checked)}
            />

            <Input
                id="notifierName"
                label="ชื่อ นามสกุล ผู้แจ้ง"
                value={values.notifierName}
                onChange={(e) => onChange('notifierName', e.target.value)}
                readOnly={sameAsPolicyHolder}
                error={errors?.notifierName}
                required
                placeholder="กรอกชื่อ-นามสกุลผู้แจ้ง"
            />

            <Input
                id="phone"
                label="เบอร์มือถือ ติดต่อ"
                type="tel"
                value={values.phone}
                onChange={(e) => onChange('phone', e.target.value)}
                error={errors?.phone}
                required
                placeholder="0xx-xxx-xxxx"
            />

            <Input
                id="email"
                label="Email ติดต่อ"
                type="email"
                value={values.email}
                onChange={(e) => onChange('email', e.target.value)}
                error={errors?.email}
                placeholder="example@email.com"
            />
        </Card>
    );
}
