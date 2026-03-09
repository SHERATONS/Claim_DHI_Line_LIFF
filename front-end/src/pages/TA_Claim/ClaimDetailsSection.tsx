/**
 * Section 2: รายละเอียดเคลม (TA)
 * Uses useCountryCascade for Country/Town selection
 */

import { Card, Input, Select } from '@/components/ui';
import type { LocationItem } from '@/hooks/useCountryCascade';
import { DAMAGE_DETAILS_TA } from '@/config/damageDetailsTA';
import { DAMAGE_TYPE_TA } from '@/config/damageTypeTA';

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

interface ClaimDetailsSectionProps {
    values: {
        incidentDateTime: string;
        travelFlight: string;
        country: string;
        town: string;
        accidentPlace: string;
        damageDetails: string; // Accident Description
        damageDetailsOther?: string; // "Other" reason
        damageType: string;    // Injury Details
        damageTypeOther?: string;    // "Other" detail
    };
    errors: {
        incidentDateTime?: string;
        travelFlight?: string;
        country?: string;
        town?: string;
        accidentPlace?: string;
        damageDetails?: string;
        damageDetailsOther?: string;
        damageType?: string;
        damageTypeOther?: string;
    };
    onChange: (field: string, value: string) => void;
    // Country Cascade
    countries: LocationItem[];
    towns: LocationItem[];
    selectedCountry: string;
    selectedTown: string;
    loadingCountries: boolean;
    loadingTowns: boolean;
    onCountryChange: (id: string) => void;
    onTownChange: (id: string) => void;
}

export function ClaimDetailsSection({
    values,
    errors,
    onChange,
    countries,
    towns,
    // selectedCountry, // Not strictly needed if values.country tracks it, but good for cascade logic
    // selectedTown,
    loadingCountries,
    loadingTowns,
    onCountryChange,
    onTownChange,
}: ClaimDetailsSectionProps) {
    return (
        <Card title="รายละเอียดเคลม (TA)">
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
                id="travelFlight"
                label="เที่ยวบินการเดินทาง"
                value={values.travelFlight}
                onChange={(e) => onChange('travelFlight', e.target.value)}
                error={errors.travelFlight}
                required
                placeholder="- ระบุรายละเอียดเที่ยวบิน -"
            />

            <Select
                id="country"
                label="ประเทศที่เกิดเหตุ"
                options={countries.map((c) => ({ value: c.id, label: c.text }))}
                value={values.country}
                onChange={(e) => {
                    onChange('country', e.target.value);
                    onCountryChange(e.target.value);
                }}
                error={errors.country}
                required
                placeholder={loadingCountries ? "กำลังโหลด..." : "- เลือกประเทศ -"}
                disabled={loadingCountries}
            />

            <Select
                id="town"
                label="เมือง/รัฐ"
                options={towns.map((t) => ({ value: t.id, label: t.text }))}
                value={values.town}
                onChange={(e) => {
                    onChange('town', e.target.value);
                    onTownChange(e.target.value);
                }}
                error={errors.town}
                required
                placeholder={loadingTowns ? "กำลังโหลด..." : "- เลือกเมือง/รัฐ -"}
                disabled={!values.country || loadingTowns}
            />

            <Input
                id="accidentPlace"
                label="บริเวณที่เกิดเหตุ"
                value={values.accidentPlace}
                onChange={(e) => onChange('accidentPlace', e.target.value)}
                error={errors.accidentPlace}
                required
                placeholder="- ระบุบริเวณที่เกิดเหตุ -"
            />

            {/* change to drop down */}
            <Select
                id="damageDetails"
                label="สาเหตุความเสียหาย (เช่น ลื่นล้ม / กระเป๋าเดินทางเสียหาย / เที่ยวบินล่าช้า)"
                options={DAMAGE_DETAILS_TA.map((c) => ({ value: c.value, label: c.label }))}
                value={values.damageDetails}
                onChange={(e) => onChange('damageDetails', e.target.value)}
                error={errors.damageDetails}
                required
                placeholder="- สาเหตุความเสียหาย -"
            />

            {values.damageDetails === '004' && (
                <div className="mt-3">
                    <Input
                        id="damageDetailsOther"
                        label="ระบุสาเหตุความเสียหาย (อื่นๆ)"
                        value={values.damageDetailsOther || ''}
                        onChange={(e) => onChange('damageDetailsOther', e.target.value)}
                        error={errors.damageDetailsOther}
                        required
                        placeholder="- ระบุสาเหตุความเสียหาย -"
                    />
                </div>
            )}

            {/* change to drop down */}
            <Select
                id="damageType"
                label="รายละเอียดของความเสียหาย (แขนหัก / ของหาย 2 กระเป๋า / ไฟลท์ล่าช้า 4 ชั่วโมง)"
                options={DAMAGE_TYPE_TA.map((c) => ({ value: c.value, label: c.label }))}
                value={values.damageType}
                onChange={(e) => onChange('damageType', e.target.value)}
                error={errors.damageType}
                required
                placeholder="- รายละเอียดของความเสียหาย -"
            />

            {values.damageType === '004' && (
                <div className="mt-3">
                    <Input
                        id="damageTypeOther"
                        label="ระบุรายละเอียดของความเสียหาย (อื่นๆ)"
                        value={values.damageTypeOther || ''}
                        onChange={(e) => onChange('damageTypeOther', e.target.value)}
                        error={errors.damageTypeOther}
                        required
                        placeholder="- ระบุรายละเอียดของความเสียหาย -"
                    />
                </div>
            )}
        </Card>
    );
}

ClaimDetailsSection.displayName = 'ClaimDetailsSection';
