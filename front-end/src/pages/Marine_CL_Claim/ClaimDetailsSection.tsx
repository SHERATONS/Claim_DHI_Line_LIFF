/**
 * Section 2: รายละเอียดเคลม
 * ลอกจาก LIFF_Form.page — cause of loss, datetime, address cascade, zipcode, reserve
 */

import { useEffect } from 'react';
import { Card, Input, Select } from '@/components/ui';
import type { LocationItem } from '@/hooks';
import { MARINE_PLACES } from '@/config/marinePlaces';
import { MARINE_DAMAGE_DETAILS } from '@/config/damageDetails';

interface ClaimDetailsSectionProps {
    values: {
        incidentDateTime: string;
        lossPlace: string;
        lossPlaceOther?: string;
        carPlate: string;
        damageDetails: string;
        damageDetailsOther?: string;
        damageType: string;
    };
    errors: {
        incidentDateTime?: string;
        lossPlace?: string;
        lossPlaceOther?: string;
        province?: string;
        district?: string;
        subdistrict?: string;
        zipcode?: string;
        carPlate?: string;
        damageDetails?: string;
        damageDetailsOther?: string;
        damageType?: string;
    };
    onChange: (field: string, value: string) => void;
    // Location cascade
    provinces: LocationItem[];
    districts: LocationItem[];
    subdistricts: LocationItem[];
    selectedProvince: string;
    selectedDistrict: string;
    selectedSubdistrict: string;
    zipcode: string;
    loadingProvinces: boolean;
    loadingDistricts: boolean;
    loadingSubdistricts: boolean;
    zipcodeEditable: boolean;
    onProvinceChange: (id: string) => void;
    onDistrictChange: (id: string) => void;
    onSubdistrictChange: (id: string) => void;
    onZipcodeChange: (value: string) => void;
    fetchProvinces: () => Promise<void>;
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

    let year = parseInt(dateParts[0], 10);
    if (year > 2400) {
        year -= 543;
    }

    return `${year}-${dateParts[1]}-${dateParts[2]} ${parts[1]}`;
}

export function ClaimDetailsSection({
    values,
    errors,
    onChange,
    provinces,
    districts,
    selectedProvince,
    selectedDistrict,
    loadingProvinces,
    loadingDistricts,
    onProvinceChange,
    onDistrictChange,
    fetchProvinces,
}: ClaimDetailsSectionProps) {
    // Load provinces on mount
    useEffect(() => {
        if (provinces.length === 0) {
            fetchProvinces();
        }
    }, [provinces.length, fetchProvinces]);

    const provinceOptions = provinces.map((p) => ({ value: p.id, label: p.text }));
    const districtOptions = districts.map((d) => ({ value: d.id, label: d.text }));

    return (
        <Card title="รายละเอียดเคลม (Marine CL)">
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
                id="carPlate"
                label="ทะเบียนรถ"
                value={values.carPlate}
                onChange={(e) => onChange('carPlate', e.target.value)}
                error={errors.carPlate}
                required
                placeholder="- กรุณาระบุทะเบียนรถ -"
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

            <Select
                id="province"
                label="จังหวัด"
                options={provinceOptions}
                value={selectedProvince}
                onChange={(e) => onProvinceChange(e.target.value)}
                loading={loadingProvinces}
                error={errors.province}
                required
                placeholder="- เลือกจังหวัด -"
            />

            <Select
                id="district"
                label="อำเภอ/เขต"
                options={districtOptions}
                value={selectedDistrict}
                onChange={(e) => onDistrictChange(e.target.value)}
                loading={loadingDistricts}
                disabled={!selectedProvince}
                error={errors.district}
                required
                placeholder="- เลือกอำเภอ/เขต -"
            />

            <Select
                id="damageDetails"
                label="สาเหตุการเสียหาย"
                options={MARINE_DAMAGE_DETAILS.map((c) => ({ value: c.value, label: c.label }))}
                value={values.damageDetails}
                onChange={(e) => onChange('damageDetails', e.target.value)}
                error={errors.damageDetails}
                required
                placeholder="- กรุณาเลือกสาเหตุการเสียหาย -"
            />

            {values.damageDetails === '005' && (
                <div className="mt-3">
                    <Input
                        id="damageDetailsOther"
                        label="ระบุรายสาเหตุการเสียหาย (อื่นๆ)"
                        value={values.damageDetailsOther || ''}
                        onChange={(e) => onChange('damageDetailsOther', e.target.value)}
                        error={errors.damageDetailsOther}
                        required
                        placeholder="- ระบุรายสาเหตุการเสียหาย -"
                    />
                </div>
            )}

            <Input
                id="damageType"
                label="ลักษณะความเสียหาย"
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
