export interface DamageTypeGolf {
    value: string;
    label: string;
}

export const DAMAGE_TYPE_GOLF: DamageTypeGolf[] = [
    { value: '001', label: 'บุคคลภายนอกได้รับบาดเจ็บ' },
    { value: '002', label: 'ทรัพย์สินบุคคลอื่นเสียหาย' },
    { value: '003', label: 'เหตุเกิดจากการดำเนินงานของผู้เอาประกันภัย' },
    { value: '004', label: 'อื่นๆ' },
];
