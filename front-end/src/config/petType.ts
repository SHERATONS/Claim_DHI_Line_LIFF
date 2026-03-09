export interface PetType {
    value: string;
    label: string;
}

export const PET_TYPES: PetType[] = [
    { value: '001', label: 'สุนัข' },
    { value: '002', label: 'แมว' },
    { value: '003', label: 'กระรอก' },
    { value: '004', label: 'นก' },
    { value: '005', label: 'ปลา' },
    { value: '006', label: 'อื่นๆ' },
];

export const PET_GENDERS = [
    { value: 'M', label: 'เพศผู้' },
    { value: 'F', label: 'เพศเมีย' },
];