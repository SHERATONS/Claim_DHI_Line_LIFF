export interface TransportationType {
    value: string;
    label: string;
}

export const TRANSPORTATION_TYPE: TransportationType[] = [
    { value: 'ทางเรือ', label: 'ทางเรือ' },
    { value: 'ทางอากาศ', label: 'ทางอากาศ' },
    { value: 'ทางบก', label: 'ทางบก' },
];