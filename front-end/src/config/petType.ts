export interface PetType {
    value: string;
    label: string;
}

export const PET_TYPES: PetType[] = [
    { value: 'สุนัข', label: 'สุนัข' },
    { value: 'แมว', label: 'แมว' },
    { value: 'อื่นๆ', label: 'อื่นๆ' },
];

export const PET_GENDERS = [
    { value: 'เพศผู้', label: 'เพศผู้' },
    { value: 'เพศเมีย', label: 'เพศเมีย' },
];