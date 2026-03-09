/**
 * useLocationCascade - Province → District → Subdistrict cascade
 * Fetches from Go Backend → Salesforce.
 */

import { useState, useCallback } from 'react';
import { fetchLocations } from '@/services/api';

export interface LocationItem {
  id: string;
  text: string;
  zipcode?: string;
}

interface UseLocationCascadeReturn {
  provinces: LocationItem[];
  districts: LocationItem[];
  subdistricts: LocationItem[];
  selectedProvince: string;
  selectedDistrict: string;
  selectedSubdistrict: string;
  zipcode: string;
  zipcodeEditable: boolean;
  loadingProvinces: boolean;
  loadingDistricts: boolean;
  loadingSubdistricts: boolean;
  error: string | null;
  setSelectedProvince: (id: string) => void;
  setSelectedDistrict: (id: string) => void;
  setSelectedSubdistrict: (id: string) => void;
  setZipcode: (value: string) => void;
  fetchProvinces: () => Promise<void>;
}

export function useLocationCascade(): UseLocationCascadeReturn {
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [districts, setDistricts] = useState<LocationItem[]>([]);
  const [subdistricts, setSubdistricts] = useState<LocationItem[]>([]);

  const [selectedProvince, setSelectedProvinceState] = useState('');
  const [selectedDistrict, setSelectedDistrictState] = useState('');
  const [selectedSubdistrict, setSelectedSubdistrictState] = useState('');
  const [zipcode, setZipcodeState] = useState('');
  const [zipcodeEditable, setZipcodeEditable] = useState(false);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingSubdistricts, setLoadingSubdistricts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProvincesCallback = useCallback(async () => {
    setLoadingProvinces(true);
    setError(null);
    try {
      const data = await fetchLocations('province');
      setProvinces(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดจังหวัดได้';
      setError(msg);
    } finally {
      setLoadingProvinces(false);
    }
  }, []);

  const fetchDistrictsCallback = useCallback(async (provinceId: string) => {
    if (!provinceId) {
      setDistricts([]);
      return;
    }
    setLoadingDistricts(true);
    setError(null);
    try {
      const data = await fetchLocations('district', provinceId);
      setDistricts(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดอำเภอได้';
      setError(msg);
    } finally {
      setLoadingDistricts(false);
    }
  }, []);

  const fetchSubdistrictsCallback = useCallback(async (districtId: string) => {
    if (!districtId) {
      setSubdistricts([]);
      return;
    }
    setLoadingSubdistricts(true);
    setError(null);
    try {
      const data = await fetchLocations('subdistrict', districtId);
      setSubdistricts(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดตำบลได้';
      setError(msg);
    } finally {
      setLoadingSubdistricts(false);
    }
  }, []);

  const setSelectedProvince = useCallback(
    (id: string) => {
      setSelectedProvinceState(id);
      setSelectedDistrictState('');
      setSelectedSubdistrictState('');
      setZipcodeState('');
      setZipcodeEditable(false);
      setSubdistricts([]);
      fetchDistrictsCallback(id);
    },
    [fetchDistrictsCallback]
  );

  const setSelectedDistrict = useCallback(
    (id: string) => {
      setSelectedDistrictState(id);
      setSelectedSubdistrictState('');
      setZipcodeState('');
      setZipcodeEditable(false);
      fetchSubdistrictsCallback(id);
    },
    [fetchSubdistrictsCallback]
  );

  const setSelectedSubdistrict = useCallback(
    (id: string) => {
      setSelectedSubdistrictState(id);
      const selected = subdistricts.find((s) => s.id === id);
      setZipcodeState(selected?.zipcode || '');
      setZipcodeEditable(!!id && !!selected);
    },
    [subdistricts]
  );

  const setZipcode = useCallback((value: string) => {
    setZipcodeState(value);
  }, []);

  return {
    provinces,
    districts,
    subdistricts,
    selectedProvince,
    selectedDistrict,
    selectedSubdistrict,
    zipcode,
    zipcodeEditable,
    loadingProvinces,
    loadingDistricts,
    loadingSubdistricts,
    error,
    setSelectedProvince,
    setSelectedDistrict,
    setSelectedSubdistrict,
    setZipcode,
    fetchProvinces: fetchProvincesCallback,
  };
}
