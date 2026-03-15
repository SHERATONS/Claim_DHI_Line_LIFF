# Frontend Refactoring Rules

These rules dictate how AI coding assistants should approach modifying and refactoring components within the `front-end` directory.

When acting on a file or folder, the following **7 core rules** must be strictly applied:

### 1. Fix errors and bugs
Look for and resolve any syntax errors, type mismatches (TypeScript), or logic errors present in the code.

### 2. Preserve used fields
Do **NOT** add new fields or delete any fields that are *actually being used* in the application. The core data structure and payload footprint must remain intact.

### 3. Clean the code completely (Folder-wide)
Improve readability, formatting, and maintainability. 
- Refactor raw HTML elements (like raw `<input>`) into existing reusable UI components (like `<Input>`).
- If a form requires free-text input rather than a strict enum `Select`, convert `<Select>` components into `<Input>` and remove the imported constant variables (e.g., `DAMAGE_TYPE_TA`).
- **CRITICAL**: If you are given a **Folder**, you must apply this rule (and all other rules) to **every file** within that folder (e.g., `index.tsx`, `ClaimDetailsSection.tsx`, etc.).

### 4. Delete Unused Variables
If an interface (like `FormValues`, `FormErrors`) or a component defines variables or properties that are **not** used anywhere in that specific file context, delete them to keep the file clean.

### 5. Sync validation schema
Ensure the validation schema (e.g., zod schemas in `src/utils/validation.ts`) correctly relates to and **strictly matches ONLY the actual fields** present in the file (such as the `ClaimDetailsSection` component). Do not validate fields that the user does not submit.

### 6. Sync Payload & Remove Local Submit
In every claim's `index.tsx` file:
- Ensure the `payload` object inside `handleSubmit` exactly matches the keys and structure of the `FormValues`.
- **Remove any `localSubmit` or `USE_LOCAL_SAVE` fallback logic.** The code should submit directly to the backend API (`submitClaim`).

### 7. Ensure `PersonalDocumentUpload` in `index.tsx`
Every `index.tsx` claim form file MUST include exactly **one** `<PersonalDocumentUpload />` component handling the document upload states. It must be matched with the following specific instructions:

```tsx
<PersonalDocumentUpload
  files={docUpload.files}
  onFilesAdd={handleDocFilesAdd}
  onFileRemove={docUpload.removeFile}
  canAddMore={docUpload.canAddMore}
  maxFiles={10}
  errors={docFileErrors}
  instructions={[
    '1. อัพโหลดเอกสาร',
    '- สำเนาบัตรประชาชน',
    '- สำเนากรมธรรม์',
    '- สำเนาบัญชีธนาคาร',
    '2. ใบประเมินราคาซ่อม (ถ้ามี)',
  ]}
/>
```
