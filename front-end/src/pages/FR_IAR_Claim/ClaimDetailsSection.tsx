/**
 * Section 2: รายละเอียดเคลม
 * ลอกจาก LIFF_Form.page — cause of loss, datetime, address cascade, zipcode, reserve
 */

import { useEffect } from 'react';
import { Card, Input, Select } from '@/components/ui';
import { CAUSE_OF_LOSS_OPTIONS } from '@/config/causeOfLoss';
import type { LocationItem } from '@/hooks';

interface ClaimDetailsSectionProps {
  values: {
    causeOfLoss: string;
    incidentDateTime: string;
    lossPlace: string;
    lossReserve: string;
  };
  errors: {
    causeOfLoss?: string;
    incidentDateTime?: string;
    lossPlace?: string;
    province?: string;
    district?: string;
    subdistrict?: string;
    zipcode?: string;
    lossReserve?: string;
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

export function convertBEtoCE(dateTimeValue: string): string {
  if (!dateTimeValue) return '';
  const parts = dateTimeValue.split('T');
  if (parts.length < 2) return dateTimeValue;

  const dateParts = parts[0]!.split('-');
  if (dateParts.length < 3) return dateTimeValue;

  let year = parseInt(dateParts[0]!, 10);
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
  subdistricts,
  selectedProvince,
  selectedDistrict,
  selectedSubdistrict,
  zipcode,
  loadingProvinces,
  loadingDistricts,
  loadingSubdistricts,
  zipcodeEditable,
  onProvinceChange,
  onDistrictChange,
  onSubdistrictChange,
  onZipcodeChange,
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
  const subdistrictOptions = subdistricts.map((s) => ({ value: s.id, label: s.text }));

  return (
    <Card title="รายละเอียดเคลม">
      <Select
        id="causeOfLoss"
        label="ประเภทภัย/สาเหตุ"
        options={CAUSE_OF_LOSS_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
        value={values.causeOfLoss}
        onChange={(e) => onChange('causeOfLoss', e.target.value)}
        error={errors.causeOfLoss}
        required
        placeholder="- เลือกประเภทภัย -"
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
        label="สถานที่เกิดเหตุ"
        value={values.lossPlace}
        onChange={(e) => onChange('lossPlace', e.target.value)}
        error={errors.lossPlace}
        required
        placeholder="เช่น บ้านเลขที่ หมู่ที่ ซอย ถนน"
      />

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
        id="subdistrict"
        label="ตำบล/แขวง"
        options={subdistrictOptions}
        value={selectedSubdistrict}
        onChange={(e) => onSubdistrictChange(e.target.value)}
        loading={loadingSubdistricts}
        disabled={!selectedDistrict}
        error={errors.subdistrict}
        required
        placeholder="- เลือกตำบล/แขวง -"
      />

      <Input
        id="zipcode"
        label="รหัสไปรษณีย์"
        value={zipcode}
        onChange={(e) => onZipcodeChange(e.target.value)}
        readOnly={!zipcodeEditable}
        error={errors.zipcode}
        required
        placeholder="รหัสไปรษณีย์"
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
