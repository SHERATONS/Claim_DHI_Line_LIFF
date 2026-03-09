/**
 * useCountryCascade - Country → Town (City) cascade
 * For Golf Claim or others requiring international address
 */

import { useState, useCallback } from 'react';
import { LocationItem } from './useLocationCascade';

// Re-export LocationItem for convenience
export type { LocationItem };

interface UseCountryCascadeReturn {
    countries: LocationItem[];
    towns: LocationItem[];
    selectedCountry: string;
    selectedTown: string;
    loadingCountries: boolean;
    loadingTowns: boolean;
    setSelectedCountry: (id: string) => void;
    setSelectedTown: (id: string) => void;
    fetchCountries: () => Promise<void>;
}

// ============================================
// Mock Data (Popular Countries & Towns)
// ============================================
const MOCK_COUNTRIES: LocationItem[] = [
    { id: 'TH', text: 'Thailand' },
    { id: 'JP', text: 'Japan' },
    { id: 'CN', text: 'China' },
    { id: 'KR', text: 'South Korea' },
    { id: 'SG', text: 'Singapore' },
    { id: 'VN', text: 'Vietnam' },
    { id: 'US', text: 'United States' },
    { id: 'UK', text: 'United Kingdom' },
    { id: 'DE', text: 'Germany' },
    { id: 'FR', text: 'France' },
    { id: 'AU', text: 'Australia' },
];

const MOCK_TOWNS: Record<string, LocationItem[]> = {
    TH: [
        { id: 'TH-BKK', text: 'Bangkok' },
        { id: 'TH-CNX', text: 'Chiang Mai' },
        { id: 'TH-HKT', text: 'Phuket' },
        { id: 'TH-CBI', text: 'Chonburi' },
        { id: 'TH-PKN', text: 'Prachuap Khiri Khan' },
    ],
    JP: [
        { id: 'JP-TYO', text: 'Tokyo' },
        { id: 'JP-OSA', text: 'Osaka' },
        { id: 'JP-KYO', text: 'Kyoto' },
        { id: 'JP-SPK', text: 'Sapporo' },
        { id: 'JP-FUK', text: 'Fukuoka' },
    ],
    CN: [
        { id: 'CN-BJS', text: 'Beijing' },
        { id: 'CN-SHA', text: 'Shanghai' },
        { id: 'CN-CAN', text: 'Guangzhou' },
        { id: 'CN-SZX', text: 'Shenzhen' },
    ],
    KR: [
        { id: 'KR-SEL', text: 'Seoul' },
        { id: 'KR-PUS', text: 'Busan' },
        { id: 'KR-ICN', text: 'Incheon' },
    ],
    SG: [
        { id: 'SG-SIN', text: 'Singapore' },
    ],
    VN: [
        { id: 'VN-HAN', text: 'Hanoi' },
        { id: 'VN-SGN', text: 'Ho Chi Minh City' },
        { id: 'VN-DAD', text: 'Da Nang' },
    ],
    US: [
        { id: 'US-NYC', text: 'New York' },
        { id: 'US-LAX', text: 'Los Angeles' },
        { id: 'US-CHI', text: 'Chicago' },
        { id: 'US-SFO', text: 'San Francisco' },
        { id: 'US-LAS', text: 'Las Vegas' },
    ],
    UK: [
        { id: 'UK-LON', text: 'London' },
        { id: 'UK-MAN', text: 'Manchester' },
        { id: 'UK-EDI', text: 'Edinburgh' },
    ],
    DE: [
        { id: 'DE-BER', text: 'Berlin' },
        { id: 'DE-MUC', text: 'Munich' },
        { id: 'DE-FRA', text: 'Frankfurt' },
    ],
    FR: [
        { id: 'FR-PAR', text: 'Paris' },
        { id: 'FR-LYO', text: 'Lyon' },
        { id: 'FR-MRS', text: 'Marseille' },
    ],
    AU: [
        { id: 'AU-SYD', text: 'Sydney' },
        { id: 'AU-MEL', text: 'Melbourne' },
        { id: 'AU-BNE', text: 'Brisbane' },
    ],
};

export function useCountryCascade(): UseCountryCascadeReturn {
    const [countries, setCountries] = useState<LocationItem[]>([]);
    const [towns, setTowns] = useState<LocationItem[]>([]);

    const [selectedCountry, setSelectedCountryState] = useState('');
    const [selectedTown, setSelectedTownState] = useState('');

    const [loadingCountries, setLoadingCountries] = useState(false);
    const [loadingTowns, setLoadingTowns] = useState(false);

    const fetchCountries = useCallback(async () => {
        setLoadingCountries(true);
        try {
            // Simulate API delay
            await new Promise((r) => setTimeout(r, 300));
            setCountries(MOCK_COUNTRIES);
        } catch (error) {
            console.error('Failed to load countries:', error);
        } finally {
            setLoadingCountries(false);
        }
    }, []);

    const fetchTowns = useCallback(async (countryId: string) => {
        if (!countryId) {
            setTowns([]);
            return;
        }
        setLoadingTowns(true);
        try {
            // Simulate API delay
            await new Promise((r) => setTimeout(r, 200));
            setTowns(MOCK_TOWNS[countryId] || []);
        } catch (error) {
            console.error('Failed to load towns:', error);
        } finally {
            setLoadingTowns(false);
        }
    }, []);

    const setSelectedCountry = useCallback(
        (id: string) => {
            setSelectedCountryState(id);
            // Reset child selections
            setSelectedTownState('');
            setTowns([]);
            fetchTowns(id);
        },
        [fetchTowns]
    );

    const setSelectedTown = useCallback((id: string) => {
        setSelectedTownState(id);
    }, []);

    return {
        countries,
        towns,
        selectedCountry,
        selectedTown,
        loadingCountries,
        loadingTowns,
        setSelectedCountry,
        setSelectedTown,
        fetchCountries,
    };
}
