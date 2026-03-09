import { describe, it, expect } from 'vitest';
import {
  thaiPhone,
  emailOptional,
  positiveAmount,
  claimFormSchema,
  validateFileType,
  validateFileSize,
  validateFileNotEmpty,
} from '@/utils/validation';

// ============================================
// Thai Phone Validation
// ============================================

describe('thaiPhone schema', () => {
  describe('valid numbers', () => {
    it('should validate valid mobile numbers (06x)', () => {
      expect(thaiPhone.safeParse('0612345678').success).toBe(true);
    });

    it('should validate valid mobile numbers (08x)', () => {
      expect(thaiPhone.safeParse('0812345678').success).toBe(true);
    });

    it('should validate valid mobile numbers (09x)', () => {
      expect(thaiPhone.safeParse('0912345678').success).toBe(true);
    });

    it('should validate valid landline numbers (02x)', () => {
      expect(thaiPhone.safeParse('021234567').success).toBe(true);
    });

    it('should validate valid landline numbers (053)', () => {
      expect(thaiPhone.safeParse('053123456').success).toBe(true);
    });

    it('should handle phone with dashes', () => {
      expect(thaiPhone.safeParse('081-234-5678').success).toBe(true);
    });

    it('should handle phone with spaces', () => {
      expect(thaiPhone.safeParse('081 234 5678').success).toBe(true);
    });
  });

  describe('detailed error messages', () => {
    it('should show error for empty input', () => {
      const result = thaiPhone.safeParse('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('กรุณากรอกเบอร์โทรศัพท์');
      }
    });

    it('should show error for numbers not starting with 0', () => {
      const result = thaiPhone.safeParse('1812345678');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0');
      }
    });

    it('should show error for mobile with wrong digit count', () => {
      const result = thaiPhone.safeParse('081234567'); // 9 digits instead of 10
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('เบอร์มือถือต้องมี 10 หลัก');
      }
    });

    it('should show error for landline with wrong digit count', () => {
      const result = thaiPhone.safeParse('0212345678'); // 10 digits instead of 9
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('เบอร์บ้านต้องมี 9 หลัก');
      }
    });

    it('should show error for invalid prefix', () => {
      const result = thaiPhone.safeParse('0112345678'); // 01x is not valid
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง');
      }
    });
  });
});

// ============================================
// Email Validation
// ============================================

describe('emailOptional schema', () => {
  describe('valid emails', () => {
    it('should validate simple email', () => {
      expect(emailOptional.safeParse('test@example.com').success).toBe(true);
    });

    it('should validate email with subdomain', () => {
      expect(emailOptional.safeParse('test.name@example.co.th').success).toBe(true);
    });

    it('should validate email with plus sign', () => {
      expect(emailOptional.safeParse('test+label@example.com').success).toBe(true);
    });
  });

  describe('optional behavior', () => {
    it('should allow empty email', () => {
      expect(emailOptional.safeParse('').success).toBe(true);
    });

    it('should allow undefined email', () => {
      expect(emailOptional.safeParse(undefined).success).toBe(true);
    });
  });

  describe('detailed error messages', () => {
    it('should show error for invalid format', () => {
      const result = emailOptional.safeParse('invalid');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('รูปแบบ Email ไม่ถูกต้อง');
      }
    });

    it('should show error for email without domain', () => {
      const result = emailOptional.safeParse('test@');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('รูปแบบ Email ไม่ถูกต้อง');
      }
    });

    it('should show error for email without local part', () => {
      const result = emailOptional.safeParse('@example.com');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('รูปแบบ Email ไม่ถูกต้อง');
      }
    });

    it('should show error for email exceeding max length', () => {
      const longEmail = 'a'.repeat(101) + '@example.com';
      const result = emailOptional.safeParse(longEmail);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('ต้องไม่เกิน');
      }
    });
  });
});

// ============================================
// Positive Amount Validation
// ============================================

describe('positiveAmount schema', () => {
  describe('valid amounts', () => {
    it('should validate integer amount', () => {
      expect(positiveAmount.safeParse('1000').success).toBe(true);
    });

    it('should validate decimal amount', () => {
      expect(positiveAmount.safeParse('1000.50').success).toBe(true);
    });

    it('should validate amount with commas', () => {
      expect(positiveAmount.safeParse('1,000.50').success).toBe(true);
    });

    it('should validate zero', () => {
      expect(positiveAmount.safeParse('0').success).toBe(true);
    });
  });

  describe('optional behavior', () => {
    it('should allow empty amount', () => {
      expect(positiveAmount.safeParse('').success).toBe(true);
    });

    it('should allow undefined amount', () => {
      expect(positiveAmount.safeParse(undefined).success).toBe(true);
    });
  });

  describe('error messages', () => {
    it('should reject negative numbers', () => {
      const result = positiveAmount.safeParse('-100');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('จำนวนเงินต้องไม่ติดลบ');
      }
    });

    it('should reject non-numeric input', () => {
      const result = positiveAmount.safeParse('abc');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('กรุณากรอกจำนวนเงินที่ถูกต้อง');
      }
    });
  });
});

// ============================================
// Claim Form Schema (ตาม LIFF_Form.page)
// ============================================

describe('claimFormSchema', () => {
  const validData = {
    notifierName: 'ทดสอบ ทดสอบ',
    phone: '0812345678',
    causeOfLoss: '974',
    incidentDateTime: '2025-01-15T10:30',
    lossPlace: '123 ถนนพระราม 3',
    province: 'P001',
    district: 'D001',
    subdistrict: 'S001',
    zipcode: '10120',
  };

  describe('valid form data', () => {
    it('should validate complete valid form', () => {
      expect(claimFormSchema.safeParse(validData).success).toBe(true);
    });

    it('should allow optional fields to be undefined', () => {
      const data = {
        ...validData,
        email: undefined,
        lossReserve: undefined,
      };
      expect(claimFormSchema.safeParse(data).success).toBe(true);
    });

    it('should validate form with all fields filled', () => {
      const fullData = {
        ...validData,
        email: 'test@example.com',
        lossReserve: '10000',
      };
      expect(claimFormSchema.safeParse(fullData).success).toBe(true);
    });
  });

  describe('required fields validation', () => {
    it('should fail for missing notifier name', () => {
      const result = claimFormSchema.safeParse({
        ...validData,
        notifierName: '',
      });
      expect(result.success).toBe(false);
    });

    it('should fail for missing phone', () => {
      const result = claimFormSchema.safeParse({
        ...validData,
        phone: '',
      });
      expect(result.success).toBe(false);
    });

    it('should fail for missing cause of loss', () => {
      const result = claimFormSchema.safeParse({
        ...validData,
        causeOfLoss: '',
      });
      expect(result.success).toBe(false);
    });

    it('should fail for missing incident date', () => {
      const result = claimFormSchema.safeParse({
        ...validData,
        incidentDateTime: '',
      });
      expect(result.success).toBe(false);
    });

    it('should fail for missing loss place', () => {
      const result = claimFormSchema.safeParse({
        ...validData,
        lossPlace: '',
      });
      expect(result.success).toBe(false);
    });

    it('should fail for missing province', () => {
      const result = claimFormSchema.safeParse({
        ...validData,
        province: '',
      });
      expect(result.success).toBe(false);
    });

    it('should fail for missing district', () => {
      const result = claimFormSchema.safeParse({
        ...validData,
        district: '',
      });
      expect(result.success).toBe(false);
    });

    it('should fail for missing subdistrict', () => {
      const result = claimFormSchema.safeParse({
        ...validData,
        subdistrict: '',
      });
      expect(result.success).toBe(false);
    });

    it('should fail for missing zipcode', () => {
      const result = claimFormSchema.safeParse({
        ...validData,
        zipcode: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('XSS validation', () => {
    it('should reject XSS in notifierName', () => {
      const result = claimFormSchema.safeParse({
        ...validData,
        notifierName: '<script>alert("xss")</script>',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('ข้อความมีรูปแบบที่ไม่อนุญาต');
      }
    });

    it('should reject XSS in lossPlace', () => {
      const result = claimFormSchema.safeParse({
        ...validData,
        lossPlace: '<img src=x onerror=alert(1)>',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('ข้อความมีรูปแบบที่ไม่อนุญาต');
      }
    });

    it('should allow normal text with special characters', () => {
      const result = claimFormSchema.safeParse({
        ...validData,
        lossPlace: 'สวัสดี! นี่คือการทดสอบ @#$%',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('max length validation', () => {
    it('should reject loss place exceeding max length', () => {
      const result = claimFormSchema.safeParse({
        ...validData,
        lossPlace: 'A'.repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });
});

// ============================================
// File Validation
// ============================================

describe('validateFileType', () => {
  describe('valid file types', () => {
    it('should accept JPEG images', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(validateFileType(file)).toEqual({ valid: true });
    });

    it('should accept PNG images', () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      expect(validateFileType(file)).toEqual({ valid: true });
    });

    it('should accept PDF files', () => {
      const file = new File([''], 'test.pdf', { type: 'application/pdf' });
      expect(validateFileType(file)).toEqual({ valid: true });
    });

    it('should accept Word documents', () => {
      const file = new File([''], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      expect(validateFileType(file)).toEqual({ valid: true });
    });

    it('should accept Excel files', () => {
      const file = new File([''], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      expect(validateFileType(file)).toEqual({ valid: true });
    });
  });

  describe('invalid file types', () => {
    it('should reject executable files', () => {
      const file = new File([''], 'test.exe', { type: 'application/x-msdownload' });
      const result = validateFileType(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('ไม่รองรับ');
    });

    it('should reject unknown file types', () => {
      const file = new File([''], 'test.xyz', { type: 'application/xyz' });
      const result = validateFileType(file);
      expect(result.valid).toBe(false);
    });

    it('should reject HTML files', () => {
      const file = new File([''], 'test.html', { type: 'text/html' });
      const result = validateFileType(file);
      expect(result.valid).toBe(false);
    });

    it('should reject JavaScript files', () => {
      const file = new File([''], 'test.js', { type: 'application/javascript' });
      const result = validateFileType(file);
      expect(result.valid).toBe(false);
    });
  });
});

describe('validateFileSize', () => {
  it('should accept files under limit', () => {
    const file = new File(['x'.repeat(1000)], 'test.txt', { type: 'text/plain' });
    expect(validateFileSize(file)).toEqual({ valid: true });
  });

  it('should accept files at exactly the limit', () => {
    const content = new ArrayBuffer(5 * 1024 * 1024); // exactly 5MB
    const file = new File([content], 'exact.txt', { type: 'text/plain' });
    expect(validateFileSize(file)).toEqual({ valid: true });
  });

  it('should reject files over limit', () => {
    const largeContent = new ArrayBuffer(6 * 1024 * 1024); // 6MB
    const file = new File([largeContent], 'large.txt', { type: 'text/plain' });
    const result = validateFileSize(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('เกิน');
    expect(result.error).toContain('5MB');
  });
});

describe('validateFileNotEmpty', () => {
  it('should accept files with content', () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    expect(validateFileNotEmpty(file)).toEqual({ valid: true });
  });

  it('should reject empty files (0 bytes)', () => {
    const file = new File([], 'empty.txt', { type: 'text/plain' });
    const result = validateFileNotEmpty(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('ว่างเปล่า');
    expect(result.error).toContain('empty.txt');
  });

  it('should accept files with any size > 0', () => {
    const file = new File(['x'], 'tiny.txt', { type: 'text/plain' });
    expect(validateFileNotEmpty(file)).toEqual({ valid: true });
  });
});
