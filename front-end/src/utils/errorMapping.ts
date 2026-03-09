/**
 * Error Message Mapping
 * ลอกจาก LIFF_Form.page — showErrorModal function
 * แปลง technical errors → user-friendly messages
 */

interface ErrorMapping {
  pattern: RegExp;
  friendly: string | null; // null = ใช้ message เดิม
}

const ERROR_MAPPINGS: ErrorMapping[] = [
  // Thai messages - pass through
  { pattern: /กรุณาระบุ/, friendly: null },
  { pattern: /รูปแบบ.*ไม่ถูกต้อง/, friendly: null },
  { pattern: /ยาวเกิน/, friendly: null },

  // Date/time errors
  { pattern: /invalid date/i, friendly: 'วันที่เกิดเหตุไม่ถูกต้อง กรุณาเลือกวันที่ใหม่' },
  { pattern: /Incident_Date/i, friendly: 'วันที่เกิดเหตุไม่ถูกต้อง กรุณาตรวจสอบและเลือกใหม่' },

  // Email/Phone errors
  { pattern: /Email.*invalid/i, friendly: 'รูปแบบ Email ไม่ถูกต้อง' },
  { pattern: /Phone.*invalid/i, friendly: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง' },

  // Salesforce errors
  { pattern: /REQUIRED_FIELD_MISSING/i, friendly: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' },
  { pattern: /STRING_TOO_LONG/i, friendly: 'ข้อมูลที่กรอกยาวเกินไป กรุณาย่อให้สั้นลง' },
  { pattern: /FIELD_INTEGRITY_EXCEPTION/i, friendly: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่' },
  { pattern: /INSUFFICIENT_ACCESS/i, friendly: 'ไม่มีสิทธิ์ในการดำเนินการ กรุณาติดต่อผู้ดูแลระบบ' },
  { pattern: /NO_ACCESS/i, friendly: 'ไม่สามารถเข้าถึงระบบได้ กรุณาลองใหม่อีกครั้ง' },

  // File upload errors
  { pattern: /ContentVersion/i, friendly: 'ไม่สามารถอัปโหลดไฟล์ได้ กรุณาลองใหม่หรือลดขนาดไฟล์' },
  { pattern: /file.*size/i, friendly: 'ไฟล์มีขนาดใหญ่เกินไป กรุณาลดขนาดไฟล์' },

  // Network errors
  { pattern: /network/i, friendly: 'การเชื่อมต่อขัดข้อง กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่' },
  { pattern: /timeout/i, friendly: 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง' },

  // DML errors
  { pattern: /Insert failed/i, friendly: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบข้อมูลและลองใหม่' },
  { pattern: /Update failed/i, friendly: 'ไม่สามารถอัปเดตข้อมูลได้ กรุณาลองใหม่' },
];

// Generic technical error patterns
const TECHNICAL_ERROR_PATTERNS = [/Exception/i, /Error:/i, /failed/i];

const GENERIC_ERROR_MESSAGE =
  'ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่ กรุณาติดต่อเจ้าหน้าที่';

/**
 * Map technical error message to user-friendly message
 * ลอกจาก VF page showErrorModal
 */
export function mapErrorMessage(message: string): string {
  if (!message) {
    return GENERIC_ERROR_MESSAGE;
  }

  // Check specific patterns
  for (const mapping of ERROR_MAPPINGS) {
    if (mapping.pattern.test(message)) {
      return mapping.friendly ?? message;
    }
  }

  // Check technical error patterns → generic message
  for (const pattern of TECHNICAL_ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return GENERIC_ERROR_MESSAGE;
    }
  }

  // Pass through if no match (already user-friendly)
  return message;
}
