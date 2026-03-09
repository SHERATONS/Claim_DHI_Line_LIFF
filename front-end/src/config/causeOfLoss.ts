/**
 * Cause of Loss configuration
 * ลอกจาก LIFF_FormController.cls + LIFF_Form.page
 */

export interface CauseOfLossOption {
  value: string;
  label: string;
}

export const CAUSE_OF_LOSS_OPTIONS: CauseOfLossOption[] = [
  { value: '974', label: 'ภัยน้ำท่วม (Flood)' },
  { value: '787', label: 'ภัยจากน้ำ (Water Damage)' },
  { value: '001', label: 'ภัยจากลูกเห็บ' },
  { value: '002', label: 'ภัยจากแผ่นดินไหว' },
  { value: '003', label: 'ภัยธรรมชาติ' },
  { value: '004', label: 'ภัยไฟป่า' },
  { value: '005', label: 'ไฟฟ้าลัดวงจร' },
  { value: '006', label: 'กิ่งไม้หล่นใส่' },
];

/**
 * Email contact by cause of loss
 * ใช้แสดงใน Success screen
 */
export const EMAIL_BY_CAUSE: Record<string, string> = {
  '974': 'southernflood@dhipaya.co.th',
  '787': 'water2568@dhipaya.co.th',
  '001': 'southernflood@dhipaya.co.th',
  '002': 'water2568@dhipaya.co.th',
  '003': 'southernflood@dhipaya.co.th',
  '004': 'water2568@dhipaya.co.th',
  '005': 'southernflood@dhipaya.co.th',
  '006': 'water2568@dhipaya.co.th',
};

/**
 * Get contact email for a specific cause of loss
 */
export function getContactEmail(causeOfLoss: string): string | undefined {
  return EMAIL_BY_CAUSE[causeOfLoss];
}
