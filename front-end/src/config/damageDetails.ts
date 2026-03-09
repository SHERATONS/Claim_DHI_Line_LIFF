export interface DamageDetails {
    value: string;
    label: string;
}

export const MARINE_DAMAGE_DETAILS: DamageDetails[] = [
    { value: '001', label: 'เรือชน' },
    { value: '002', label: 'ไฟไหม้' },
    { value: '003', label: 'เรือจม' },
    { value: '004', label: 'เครื่องจักรเสียหาย' },
    { value: '005', label: 'อื่นๆ' },
];
