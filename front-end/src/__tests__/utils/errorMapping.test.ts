import { describe, it, expect } from 'vitest';
import { mapErrorMessage } from '@/utils/errorMapping';

describe('mapErrorMessage', () => {
  it('should return generic message for empty input', () => {
    const result = mapErrorMessage('');
    expect(result).toContain('ไม่สามารถดำเนินการได้');
  });

  it('should pass through Thai messages starting with กรุณาระบุ', () => {
    const input = 'กรุณาระบุชื่อผู้แจ้ง';
    const result = mapErrorMessage(input);
    expect(result).toBe(input);
  });

  it('should pass through Thai messages with รูปแบบ...ไม่ถูกต้อง', () => {
    const input = 'รูปแบบอีเมลไม่ถูกต้อง';
    const result = mapErrorMessage(input);
    expect(result).toBe(input);
  });

  it('should pass through Thai messages with ยาวเกิน', () => {
    const input = 'ข้อมูลยาวเกินไป';
    const result = mapErrorMessage(input);
    expect(result).toBe(input);
  });

  it('should map invalid date errors to friendly message', () => {
    const result = mapErrorMessage('invalid date format');
    expect(result).toBe('วันที่เกิดเหตุไม่ถูกต้อง กรุณาเลือกวันที่ใหม่');
  });

  it('should map Incident_Date errors to friendly message', () => {
    const result = mapErrorMessage('Incident_Date validation failed');
    expect(result).toBe('วันที่เกิดเหตุไม่ถูกต้อง กรุณาตรวจสอบและเลือกใหม่');
  });

  it('should map Email invalid errors to friendly message', () => {
    const result = mapErrorMessage('Email address invalid');
    expect(result).toBe('รูปแบบ Email ไม่ถูกต้อง');
  });

  it('should map Phone invalid errors to friendly message', () => {
    const result = mapErrorMessage('Phone number invalid format');
    expect(result).toBe('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง');
  });

  it('should map REQUIRED_FIELD_MISSING errors to friendly message', () => {
    const result = mapErrorMessage('REQUIRED_FIELD_MISSING: Name');
    expect(result).toBe('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
  });

  it('should map STRING_TOO_LONG errors to friendly message', () => {
    const result = mapErrorMessage('STRING_TOO_LONG: Description max 255');
    expect(result).toBe('ข้อมูลที่กรอกยาวเกินไป กรุณาย่อให้สั้นลง');
  });

  it('should map FIELD_INTEGRITY_EXCEPTION errors to friendly message', () => {
    const result = mapErrorMessage('FIELD_INTEGRITY_EXCEPTION: Invalid reference');
    expect(result).toBe('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่');
  });

  it('should map INSUFFICIENT_ACCESS errors to friendly message', () => {
    const result = mapErrorMessage('INSUFFICIENT_ACCESS: Cannot modify record');
    expect(result).toBe('ไม่มีสิทธิ์ในการดำเนินการ กรุณาติดต่อผู้ดูแลระบบ');
  });

  it('should map NO_ACCESS errors to friendly message', () => {
    const result = mapErrorMessage('NO_ACCESS to object');
    expect(result).toBe('ไม่สามารถเข้าถึงระบบได้ กรุณาลองใหม่อีกครั้ง');
  });

  it('should map ContentVersion errors to friendly message', () => {
    const result = mapErrorMessage('ContentVersion insert failed');
    expect(result).toBe('ไม่สามารถอัปโหลดไฟล์ได้ กรุณาลองใหม่หรือลดขนาดไฟล์');
  });

  it('should map file size errors to friendly message', () => {
    const result = mapErrorMessage('file size exceeds limit');
    expect(result).toBe('ไฟล์มีขนาดใหญ่เกินไป กรุณาลดขนาดไฟล์');
  });

  it('should map network errors to friendly message', () => {
    const result = mapErrorMessage('network connection failed');
    expect(result).toBe('การเชื่อมต่อขัดข้อง กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่');
  });

  it('should map timeout errors to friendly message', () => {
    const result = mapErrorMessage('request timeout after 30s');
    expect(result).toBe('การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง');
  });

  it('should map Insert failed errors to friendly message', () => {
    const result = mapErrorMessage('Insert failed for Case');
    expect(result).toBe('ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบข้อมูลและลองใหม่');
  });

  it('should map Update failed errors to friendly message', () => {
    const result = mapErrorMessage('Update failed: record locked');
    expect(result).toBe('ไม่สามารถอัปเดตข้อมูลได้ กรุณาลองใหม่');
  });

  it('should map technical Exception errors to generic message', () => {
    const result = mapErrorMessage('NullPointerException at line 42');
    expect(result).toContain('ไม่สามารถดำเนินการได้');
  });

  it('should map technical Error: messages to generic message', () => {
    const result = mapErrorMessage('Error: Unexpected token at position 0');
    expect(result).toContain('ไม่สามารถดำเนินการได้');
  });

  it('should map generic failed messages to generic message', () => {
    const result = mapErrorMessage('Operation failed due to unknown reason');
    expect(result).toContain('ไม่สามารถดำเนินการได้');
  });

  it('should pass through user-friendly messages that do not match patterns', () => {
    const input = 'ระบบไม่พร้อมใช้งาน';
    const result = mapErrorMessage(input);
    expect(result).toBe(input);
  });

  it('should be case-insensitive for error patterns', () => {
    expect(mapErrorMessage('INVALID DATE')).toBe('วันที่เกิดเหตุไม่ถูกต้อง กรุณาเลือกวันที่ใหม่');
    expect(mapErrorMessage('NETWORK ERROR')).toBe('การเชื่อมต่อขัดข้อง กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่');
  });
});
