/**
 * Form Validation using Zod
 * ลอกจาก LIFF_Form.page — fields: causeOfLoss, incidentDateTime, lossPlace,
 * province/district/subdistrict/zipcode, lossReserve, notifierName, phone, email
 */

import { z } from 'zod';
import { VALIDATION, ALLOWED_FILE_TYPES, FILE_LIMITS } from '@/config';
import { validateFileMagicBytes, containsXSS, sanitizeText } from './security';

// ============================================
// Validation Helpers with detailed errors
// ============================================

/**
 * Validate Thai phone number with detailed error messages
 */
function validateThaiPhone(phone: string): { valid: boolean; error?: string } {
  const cleaned = phone.replace(/\D/g, '');

  if (!cleaned.startsWith('0')) {
    return { valid: false, error: 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0' };
  }

  // Mobile numbers (06x, 08x, 09x): 10 digits
  if (/^0[689]/.test(cleaned)) {
    if (cleaned.length !== 10) {
      return { valid: false, error: 'เบอร์มือถือต้องมี 10 หลัก' };
    }
    return { valid: true };
  }

  // Landline numbers (02x-05x, 07x): 9 digits
  if (/^0[2-57]/.test(cleaned)) {
    if (cleaned.length !== 9) {
      return { valid: false, error: 'เบอร์บ้านต้องมี 9 หลัก' };
    }
    return { valid: true };
  }

  return { valid: false, error: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง' };
}

/**
 * Validate email with detailed error messages
 */
function validateEmail(email: string): { valid: boolean; error?: string } {
  if (email.length > VALIDATION.EMAIL_MAX_LENGTH) {
    return { valid: false, error: `Email ต้องไม่เกิน ${VALIDATION.EMAIL_MAX_LENGTH} ตัวอักษร` };
  }

  if (!VALIDATION.EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'รูปแบบ Email ไม่ถูกต้อง' };
  }

  return { valid: true };
}

/**
 * Validate text for XSS
 */
function validateSafeText(text: string): { valid: boolean; error?: string } {
  if (containsXSS(text)) {
    return { valid: false, error: 'ข้อความมีรูปแบบที่ไม่อนุญาต' };
  }
  return { valid: true };
}

// ============================================
// Zod Schemas with detailed error messages
// ============================================

export const thaiPhone = z
  .string()
  .min(1, 'กรุณากรอกเบอร์โทรศัพท์')
  .max(20, 'เบอร์โทรศัพท์ยาวเกินไป')
  .superRefine((val, ctx) => {
    const result = validateThaiPhone(val);
    if (!result.valid) {
      ctx.addIssue({
        code: 'custom',
        message: result.error,
      });
    }
  });

export const emailOptional = z
  .string()
  .optional()
  .superRefine((val, ctx) => {
    if (!val) return;
    const result = validateEmail(val);
    if (!result.valid) {
      ctx.addIssue({
        code: 'custom',
        message: result.error,
      });
    }
  });

export const positiveAmount = z
  .string()
  .optional()
  .refine((val) => {
    if (!val) return true;
    const cleaned = val.replace(/,/g, '');
    return !isNaN(parseFloat(cleaned));
  }, {
    message: 'กรุณากรอกจำนวนเงินที่ถูกต้อง',
  })
  .refine((val) => {
    if (!val) return true;
    const cleaned = val.replace(/,/g, '');
    return parseFloat(cleaned) >= 0;
  }, {
    message: 'จำนวนเงินต้องไม่ติดลบ',
  });

// Safe text schema with XSS check and sanitization
export const safeText = z
  .string()
  .transform((val) => sanitizeText(val))
  .refine((val) => !containsXSS(val), {
    message: 'ข้อความมีรูปแบบที่ไม่อนุญาต',
  });

// Safe text that's required (validate only, sanitize on backend)
export const safeTextRequired = (fieldName: string) =>
  z
    .string()
    .min(1, `กรุณากรอก${fieldName}`)
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({
          code: 'custom',
          message: result.error,
        });
      }
    });

// Safe text that's optional (validate only, sanitize on backend)
export const safeTextOptional = z
  .string()
  .optional()
  .superRefine((val, ctx) => {
    if (!val) return;
    const result = validateSafeText(val);
    if (!result.valid) {
      ctx.addIssue({
        code: 'custom',
        message: result.error,
      });
    }
  });

// ============================================
// Claim Form Schema — ตาม LIFF_Form.page
// ============================================

// ============================================
// Base Schema (Shared Fields)
// ============================================

const baseClaimSchema = z.object({
  // Section 1: ข้อมูลผู้แจ้ง
  notifierName: z
    .string()
    .min(1, 'กรุณากรอกชื่อผู้แจ้ง')
    .max(VALIDATION.NAME_MAX_LENGTH, 'ชื่อยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  phone: thaiPhone,

  email: emailOptional,

  // Section 2: รายละเอียดเคลม (Shared)
  incidentDateTime: z
    .string()
    .min(1, 'กรุณาเลือกวันที่/เวลาเกิดเหตุ'),
});

// ============================================
// Specific Schemas
// ============================================

// 1. FR-IAR (Fire & IAR)
export const frIarSchema = baseClaimSchema.extend({

  causeOfLoss: z
    .string()
    .min(1, 'กรุณาเลือกประเภทภัย/สาเหตุ'),

  lossPlace: z
    .string()
    .min(1, 'กรุณากรอกสถานที่เกิดเหตุ')
    .max(500, 'สถานที่เกิดเหตุยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  province: z
    .string()
    .min(1, 'กรุณาเลือกจังหวัด'),

  district: z
    .string()
    .min(1, 'กรุณาเลือกอำเภอ/เขต'),

  subdistrict: z
    .string()
    .min(1, 'กรุณาเลือกตำบล/แขวง'),

  zipcode: z
    .string()
    .min(1, 'กรุณาเลือกตำบล/แขวงเพื่อให้ระบบกรอกรหัสไปรษณีย์')
    .regex(/^\d{5}$/, 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก'),

  lossReserve: positiveAmount,
});

// 2. CAR-EAR-CPM (Construction & Contractor Plant)
export const carEarCpmSchema = baseClaimSchema.extend({
  // Section 2: รายละเอียดเคลม (Start)

  projectTitle: z
    .string()
    .min(1, 'กรุณากรอกชื่อโครงการ')
    .max(200, 'ชื่อโครงการยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  contractorName: z
    .string()
    .optional()
    .superRefine((val, ctx) => {
      if (!val) return;
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  lossPlace: z
    .string()
    .min(1, 'กรุณากรอกสถานที่เกิดเหตุ')
    .max(500, 'สถานที่เกิดเหตุยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  province: z
    .string()
    .min(1, 'กรุณาเลือกจังหวัด'),

  district: z
    .string()
    .min(1, 'กรุณาเลือกอำเภอ/เขต'),

  subdistrict: z
    .string()
    .min(1, 'กรุณาเลือกตำบล/แขวง'),

  zipcode: z
    .string()
    .min(1, 'กรุณาเลือกตำบล/แขวงเพื่อให้ระบบกรอกรหัสไปรษณีย์')
    .regex(/^\d{5}$/, 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก'),

  damageDetails: z
    .string()
    .min(1, 'กรุณาระบุรายละเอียดความเสียหาย')
    .max(100, 'รายละเอียดความเสียหายยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  damageType: z
    .string()
    .min(1, 'กรุณาระบุลักษณะความเสียหาย')
    .max(100, 'ลักษณะความเสียหายยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),
});

// 3. Drone
export const droneSchema = baseClaimSchema.extend({
  driverName: z
    .string()
    .min(1, 'กรุณากรอกชื่อผู้ขับขี่')
    .max(200, 'ชื่อผู้ขับขี่ยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  droneModel: z
    .string()
    .min(1, 'กรุณากรอกยี่ห้อ/รุ่นโดรน')
    .max(200, 'ยี่ห้อ/รุ่นโดรนยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  lossPlace: z
    .string()
    .min(1, 'กรุณาเลือกสถานที่เกิดเหตุ'),

  lossPlaceOther: z
    .string()
    .optional(),

  damageDetails: z
    .string()
    .min(1, 'กรุณาระบุรายละเอียดความเสียหาย')
    .max(100, 'รายละเอียดความเสียหายยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  damageType: z
    .string()
    .min(1, 'กรุณาระบุลักษณะความเสียหาย')
    .max(100, 'ลักษณะความเสียหายยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),
}).superRefine((data, ctx) => {
  // Validate lossPlaceOther if lossPlace is '007' (Others)
  if (data.lossPlace === '007' && !data.lossPlaceOther) {
    ctx.addIssue({
      code: 'custom',
      path: ['lossPlaceOther'],
      message: 'กรุณาระบุสถานที่เกิดเหตุ (อื่นๆ)',
    });
  }
});

// 4. Pet
export const petSchema = baseClaimSchema.extend({
  petName: z
    .string()
    .min(1, 'กรุณากรอกชื่อสัตว์เลี้ยง')
    .max(200, 'ชื่อสัตว์เลี้ยงยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  petType: z
    .string()
    .min(1, 'กรุณาเลือกประเภทสัตว์เลี้ยง'),

  petTypeOther: z
    .string()
    .optional(),

  petSpecies: z
    .string()
    .optional()
    .superRefine((val, ctx) => {
      if (!val) return;
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  petGender: z
    .string()
    .min(1, 'กรุณาเลือกเพศสัตว์เลี้ยง'),

  microchipNumber: z
    .string()
    .optional()
    .superRefine((val, ctx) => {
      if (!val) return;
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  petHospital: z
    .string()
    .optional()
    .superRefine((val, ctx) => {
      if (!val) return;
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  causeOfIllness: z
    .string()
    .min(1, 'กรุณาระบุสาเหตุความเสียหาย/เจ็บป่วย')
    .max(200, 'สาเหตุความเสียหายยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  damageType: z
    .string()
    .min(1, 'กรุณาระบุลักษณะความเสียหาย')
    .max(100, 'ลักษณะความเสียหายยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),
}).superRefine((data, ctx) => {
  // Validate petTypeOther if petType is '006' (Others)
  if (data.petType === '006' && !data.petTypeOther) {
    ctx.addIssue({
      code: 'custom',
      path: ['petTypeOther'],
      message: 'กรุณาระบุประเภทสัตว์เลี้ยง (อื่นๆ)',
    });
  }
});

// 5. Marine HULL
export const marineHullSchema = baseClaimSchema.extend({
  boatName: z
    .string()
    .min(1, 'กรุณากรอกชื่อเรือ')
    .max(200, 'ชื่อเรือยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  lossPlace: z
    .string()
    .min(1, 'กรุณาเลือกสถานที่เกิดเหตุ'), // Select dropdown

  lossPlaceOther: z
    .string()
    .optional(),

  damageDetails: z
    .string()
    .min(1, 'กรุณาเลือกสาเหตุการเสียหาย'),

  damageDetailsOther: z
    .string()
    .optional(),

  damageType: z
    .string()
    .min(1, 'กรุณาระบุลักษณะความเสียหาย')
    .max(100, 'ลักษณะความเสียหายยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),
}).superRefine((data, ctx) => {
  // Validate lossPlaceOther if lossPlace is '007' (Others)
  if (data.lossPlace === '007' && !data.lossPlaceOther) {
    ctx.addIssue({
      code: 'custom',
      path: ['lossPlaceOther'],
      message: 'กรุณาระบุสถานที่เกิดเหตุ (อื่นๆ)',
    });
  }

  // Validate damageDetailsOther if damageDetails is '005' (Others)
  if (data.damageDetails === '005' && !data.damageDetailsOther) {
    ctx.addIssue({
      code: 'custom',
      path: ['damageDetailsOther'],
      message: 'กรุณาระบุสาเหตุการเสียหาย (อื่นๆ)',
    });
  }
});

export const marineCargoSchema = baseClaimSchema.extend({
  vehicleName: z
    .string()
    .min(1, 'กรุณากรอกชื่อยานพาหนะ')
    .max(100, 'ชื่อยานพาหนะยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  lossPlace: z
    .string()
    .min(1, 'กรุณาเลือกสถานที่เกิดเหตุ'),

  lossPlaceOther: z
    .string()
    .optional(),

  transportationType: z
    .string()
    .min(1, 'กรุณากรอกประเภทการขนส่ง'),

  damageDetails: z
    .string()
    .min(1, 'กรุณาระบุสาเหตุความเสียหาย'),

  damageType: z
    .string()
    .min(1, 'กรุณาระบุลักษณะความเสียหาย')
    .max(100, 'ลักษณะความเสียหายยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),
}).superRefine((data, ctx) => {
  // Validate lossPlaceOther if lossPlace is '007' (Others)
  if (data.lossPlace === '007' && !data.lossPlaceOther) {
    ctx.addIssue({
      code: 'custom',
      path: ['lossPlaceOther'],
      message: 'กรุณาระบุสถานที่เกิดเหตุ (อื่นๆ)',
    });
  }
});

export const marineClSchema = baseClaimSchema.extend({
  carPlate: z
    .string()
    .min(1, 'กรุณากรอกทะเบียนรถ')
    .max(20, 'ทะเบียนรถยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  lossPlace: z
    .string()
    .min(1, 'กรุณาเลือกสถานที่เกิดเหตุ'),

  lossPlaceOther: z
    .string()
    .optional(),

  province: z
    .string()
    .min(1, 'กรุณาเลือกจังหวัด'),

  district: z
    .string()
    .min(1, 'กรุณาเลือกอำเภอ/เขต'),

  damageDetails: z
    .string()
    .min(1, 'กรุณาเลือกสาเหตุการเสียหาย'),

  damageDetailsOther: z
    .string()
    .optional(),

  damageType: z
    .string()
    .min(1, 'กรุณาระบุลักษณะความเสียหาย')
    .max(100, 'ลักษณะความเสียหายยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),
}).superRefine((data, ctx) => {
  // Validate lossPlaceOther if lossPlace is '007' (Others)
  if (data.lossPlace === '007' && !data.lossPlaceOther) {
    ctx.addIssue({
      code: 'custom',
      path: ['lossPlaceOther'],
      message: 'กรุณาระบุสถานที่เกิดเหตุ (อื่นๆ)',
    });
  }

  // Validate damageDetailsOther if damageDetails is '005' (Others)
  if (data.damageDetails === '005' && !data.damageDetailsOther) {
    ctx.addIssue({
      code: 'custom',
      path: ['damageDetailsOther'],
      message: 'กรุณาระบุสาเหตุการเสียหาย (อื่นๆ)',
    });
  }
});

// 6. Golf
export const golfSchema = baseClaimSchema.extend({
  // Reuse CAR-EAR-CPM structure for now as requested
  // Golf specific fields
  Golfer: z
    .string()
    .min(1, 'กรุณากรอกชื่อ Golfer'),

  lossPlace: z
    .string()
    .min(1, 'กรุณาเลือกสถานที่เกิดเหตุ'), // Select dropdown

  lossPlaceOther: z
    .string()
    .optional(),

  damageDetails: z
    .string()
    .min(1, 'กรุณาระบุสาเหตุความเสียหาย')
    .max(100, 'สาเหตุความเสียหายยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  damageType: z
    .string()
    .min(1, 'กรุณาระบุลักษณะความเสียหาย')
    .max(100, 'ลักษณะความเสียหายยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),
}).superRefine((data, ctx) => {
  // Validate lossPlaceOther if lossPlace is '007' (Others)
  if (data.lossPlace === '007' && !data.lossPlaceOther) {
    ctx.addIssue({
      code: 'custom',
      path: ['lossPlaceOther'],
      message: 'กรุณาระบุสถานที่เกิดเหตุ (อื่นๆ)',
    });
  }
});

// 7. TA (Travel Accident)
export const taSchema = baseClaimSchema.extend({
  country: z
    .string()
    .min(1, 'กรุณาเลือกประเทศ'),

  town: z
    .string()
    .min(1, 'กรุณาเลือกเมือง/รัฐ'),

  accidentPlace: z
    .string()
    .min(1, 'กรุณาระบุสถานที่เกิดเหตุ (เช่น ชื่อโรงแรม, ชื่อถนน)')
    .max(200, 'สถานที่เกิดเหตุยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  travelFlight: z
    .string()
    .min(1, 'กรุณาระบุเที่ยวบิน')
    .max(50, 'เลขเที่ยวบินยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  damageDetails: z
    .string()
    .min(1, 'กรุณาระบุรายละเอียดเหตุการณ์')
    .max(500, 'รายละเอียดเหตุการณ์ยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  damageType: z
    .string()
    .min(1, 'กรุณาระบุลักษณะการบาดเจ็บ/ความเสียหาย')
    .max(200, 'ลักษณะการบาดเจ็บ/ความเสียหายยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),
});

// 8. A&H / Death
export const ahDeathSchema = z.object({
  // Section 1: ข้อมูลผู้แจ้ง (Copy from base but not using extend to avoid base's incidentDateTime)
  notifierName: z
    .string()
    .min(1, 'กรุณากรอกชื่อผู้แจ้ง')
    .max(VALIDATION.NAME_MAX_LENGTH, 'ชื่อยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  phone: thaiPhone,

  email: emailOptional,

  accidentDate: z
    .string()
    .min(1, 'กรุณาเลือกวันที่เกิดเหตุ หรือ เจ็บป่วย'),

  treatmentDate: z
    .string()
    .min(1, 'กรุณาเลือกวันที่เข้ารับการรักษา'),

  documentDeliveryDate: z
    .string()
    .min(1, 'กรุณาเลือกวันที่จัดส่งเอกสาร'),

  treatmentHospital: z
    .string()
    .min(1, 'กรุณาระบุโรงพยาบาลที่เข้ารับการรักษา')
    .max(200, 'ชื่อโรงพยาบาลยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),

  causeOfIllness: z
    .string()
    .min(1, 'กรุณาระบุสาเหตุของความเจ็บป่วย')
    .max(200, 'สาเหตุของความเจ็บป่วยยาวเกินไป')
    .superRefine((val, ctx) => {
      const result = validateSafeText(val);
      if (!result.valid) {
        ctx.addIssue({ code: 'custom', message: result.error });
      }
    }),
});

// Keep generic claimFormSchema for backward compatibility if needed, OR deprecate it.
// For now, we will export it as a union or alias to one of them, but best to force pages to switch.
// We'll leave a "legacy" export that matches FR-IAR for now to avoid breaking other files immediately,
// but we will update the specific files to use the new exports.
export const claimFormSchema = frIarSchema;

export type FrIarSchema = z.infer<typeof frIarSchema>;

export type CarEarCpmSchema = z.infer<typeof carEarCpmSchema>;

export type DroneSchema = z.infer<typeof droneSchema>;

export type PetSchema = z.infer<typeof petSchema>;

export type ClaimFormSchema = z.infer<typeof claimFormSchema>;

export type MarineCargoSchema = z.infer<typeof marineCargoSchema>;
export type MarineClSchema = z.infer<typeof marineClSchema>;
export type MarineHullSchema = z.infer<typeof marineHullSchema>;

export type GolfSchema = z.infer<typeof golfSchema>;

export type TASchema = z.infer<typeof taSchema>;

export type AHDeathSchema = z.infer<typeof ahDeathSchema>;

// ============================================
// File Validation (standalone functions)
// ============================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that file is not empty
 */
export function validateFileNotEmpty(file: File): ValidationResult {
  if (file.size === 0) {
    return { valid: false, error: `ไฟล์ "${file.name}" ว่างเปล่า` };
  }
  return { valid: true };
}

/**
 * Allowed file extensions (fallback for Android MIME type issues)
 * ลอกจาก VF page — Android sometimes doesn't send correct MIME type
 */
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|pdf|doc|docx|xls|xlsx|zip)$/i;

export function validateFileType(file: File): ValidationResult {
  // Check MIME type first
  const isMimeAllowed =
    ALLOWED_FILE_TYPES.some((type) => file.type === type) || file.type.startsWith('image/');

  // Fallback: check file extension (Android MIME type issue)
  const isExtensionAllowed = ALLOWED_EXTENSIONS.test(file.name);

  if (!isMimeAllowed && !isExtensionAllowed) {
    return { valid: false, error: `ไฟล์ "${file.name}" ไม่รองรับ` };
  }
  return { valid: true };
}

/**
 * Validate file type using magic bytes (async, more secure)
 */
export async function validateFileTypeSecure(file: File): Promise<ValidationResult> {
  // Check empty file first
  const emptyResult = validateFileNotEmpty(file);
  if (!emptyResult.valid) {
    return emptyResult;
  }

  const mimeResult = validateFileType(file);
  if (!mimeResult.valid) {
    return mimeResult;
  }

  const magicResult = await validateFileMagicBytes(file);
  if (!magicResult.valid) {
    return { valid: false, error: magicResult.error ?? `ไฟล์ "${file.name}" ไม่ถูกต้อง` };
  }

  return { valid: true };
}

export function validateFileSize(file: File): ValidationResult {
  if (file.size > FILE_LIMITS.MAX_FILE_SIZE) {
    const maxMB = FILE_LIMITS.MAX_FILE_SIZE / (1024 * 1024);
    return { valid: false, error: `ไฟล์ "${file.name}" มีขนาดเกิน ${maxMB}MB` };
  }
  return { valid: true };
}
