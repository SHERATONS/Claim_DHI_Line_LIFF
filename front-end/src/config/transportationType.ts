export interface TransportationType {
    value: string;
    label: string;
}

export const TRANSPORTATION_TYPE: TransportationType[] = [
    { value: '001', label: 'ทางเรือ' },
    { value: '002', label: 'ทางอากาศ' },
    { value: '003', label: 'ทางบก' },
];