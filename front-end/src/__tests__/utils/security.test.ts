import { describe, it, expect } from 'vitest';
import {
  sanitizeFileName,
  containsXSS,
  sanitizeTextInput,
  sanitizeText,
  generateSecureId,
} from '@/utils/security';

describe('sanitizeFileName', () => {
  it('should remove invalid characters', () => {
    expect(sanitizeFileName('test<script>.jpg')).toBe('test_script_.jpg');
    expect(sanitizeFileName('file:name.pdf')).toBe('file_name.pdf');
  });

  it('should prevent path traversal', () => {
    // Updated: sanitizeFileName normalizes .. to _ and collapses underscores
    const result1 = sanitizeFileName('../../../etc/passwd');
    expect(result1).not.toContain('..');
    expect(result1).toContain('etc');
    expect(result1).toContain('passwd');

    const result2 = sanitizeFileName('..\\..\\windows');
    expect(result2).not.toContain('..');
  });

  it('should not start with dot', () => {
    expect(sanitizeFileName('.htaccess')).toBe('_htaccess');
  });

  it('should limit filename length', () => {
    const longName = 'a'.repeat(300) + '.jpg';
    expect(sanitizeFileName(longName).length).toBeLessThanOrEqual(255);
  });

  it('should preserve valid filenames', () => {
    expect(sanitizeFileName('document.pdf')).toBe('document.pdf');
    expect(sanitizeFileName('photo_2024.jpg')).toBe('photo_2024.jpg');
  });

  it('should handle spaces', () => {
    expect(sanitizeFileName('my file.pdf')).toBe('my_file.pdf');
  });

  it('should handle empty or invalid input', () => {
    expect(sanitizeFileName('')).toBe('unnamed_file');
  });
});

describe('containsXSS', () => {
  it('should detect script tags', () => {
    expect(containsXSS('<script>alert(1)</script>')).toBe(true);
    expect(containsXSS('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
  });

  it('should detect javascript: protocol', () => {
    expect(containsXSS('javascript:alert(1)')).toBe(true);
  });

  it('should detect event handlers', () => {
    expect(containsXSS('<img onerror=alert(1)>')).toBe(true);
    expect(containsXSS('<div onclick=evil()>')).toBe(true);
    expect(containsXSS('<div onclick =evil()>')).toBe(true);
  });

  it('should detect iframe/object/embed', () => {
    expect(containsXSS('<iframe src="evil">')).toBe(true);
    expect(containsXSS('<object data="evil">')).toBe(true);
    expect(containsXSS('<embed src="evil">')).toBe(true);
  });

  it('should allow normal text', () => {
    expect(containsXSS('Hello World')).toBe(false);
    expect(containsXSS('test@example.com')).toBe(false);
    expect(containsXSS('Price: $100')).toBe(false);
  });
});

describe('sanitizeTextInput', () => {
  it('should return object with text and hadXSS', () => {
    const result = sanitizeTextInput('hello');
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('hadXSS');
  });

  it('should remove null bytes', () => {
    const result = sanitizeTextInput('test\x00value');
    expect(result.text).toBe('testvalue');
    expect(result.hadXSS).toBe(false);
  });

  it('should trim whitespace', () => {
    const result = sanitizeTextInput('  hello  ');
    expect(result.text).toBe('hello');
  });

  it('should limit length', () => {
    const longText = 'a'.repeat(20000);
    const result = sanitizeTextInput(longText);
    expect(result.text.length).toBeLessThanOrEqual(10000);
  });

  it('should handle empty input', () => {
    const result = sanitizeTextInput('');
    expect(result.text).toBe('');
    expect(result.hadXSS).toBe(false);
  });

  it('should detect and encode XSS', () => {
    const result = sanitizeTextInput('<script>alert(1)</script>');
    expect(result.hadXSS).toBe(true);
    expect(result.text).not.toContain('<script>');
    expect(result.text).toContain('&lt;');
  });
});

describe('sanitizeText', () => {
  it('should return plain string', () => {
    expect(sanitizeText('hello')).toBe('hello');
    expect(sanitizeText('  trimmed  ')).toBe('trimmed');
  });
});

describe('generateSecureId', () => {
  it('should generate 32 character hex string', () => {
    const id = generateSecureId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateSecureId());
    }
    expect(ids.size).toBe(100);
  });
});
