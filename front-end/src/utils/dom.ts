/**
 * DOM Utilities
 * ลอกจาก LIFF_Form.page — scrollToField function
 */

/**
 * Scroll to a field and focus it
 * Copied from VF page scrollToField function
 */
export function scrollToField(fieldId: string): void {
  const el = document.getElementById(fieldId);
  if (!el) return;

  // Scroll with offset (-100px from top, same as VF)
  const elementTop = el.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({
    top: elementTop - 100,
    behavior: 'smooth',
  });

  // Focus the element after scroll animation
  // ใช้ preventScroll: true ป้องกัน browser scroll ซ้ำ
  setTimeout(() => {
    el.focus({ preventScroll: true });
  }, 350);
}

/**
 * Mapping from form field names to DOM element IDs
 */
export const FIELD_ID_MAP: Record<string, string> = {
  notifierName: 'notifierName',
  phone: 'phone',
  email: 'email',
  causeOfLoss: 'causeOfLoss',
  incidentDateTime: 'incidentDateTime',
  lossPlace: 'lossPlace',
  province: 'province',
  district: 'district',
  subdistrict: 'subdistrict',
  zipcode: 'zipcode',
  lossReserve: 'lossReserve',
};

/**
 * Scroll to the first error field in the form
 * ใช้ requestAnimationFrame รอ DOM update ก่อน scroll
 */
export function scrollToFirstError(errorFields: string[]): void {
  // Priority order (same as VF validation order)
  const fieldOrder = [
    'notifierName',
    'phone',
    'email',
    'causeOfLoss',
    'incidentDateTime',
    'lossPlace',
    'province',
    'district',
    'subdistrict',
    'zipcode',
    'lossReserve',
  ];

  // Find first error field by order
  let targetFieldId: string | null = null;
  for (const field of fieldOrder) {
    if (errorFields.includes(field)) {
      targetFieldId = FIELD_ID_MAP[field] ?? null;
      break;
    }
  }

  // Fallback: first error field in array
  if (!targetFieldId && errorFields.length > 0) {
    targetFieldId = FIELD_ID_MAP[errorFields[0]!] ?? null;
  }

  if (!targetFieldId) return;

  // รอ DOM update ก่อน scroll (แก้ปัญหา scroll 2 step)
  requestAnimationFrame(() => {
    scrollToField(targetFieldId);
  });
}
