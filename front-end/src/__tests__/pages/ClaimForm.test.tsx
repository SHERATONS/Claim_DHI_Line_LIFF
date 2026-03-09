import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClaimForm from '@/pages/ClaimForm';

// Mock hooks
vi.mock('@/hooks', () => ({
  useLiff: vi.fn(() => ({
    isInitialized: true,
    isLoggedIn: true,
    isInClient: true,
    error: null,
    profile: { userId: 'U123', displayName: 'Test User' },
    getAccessToken: vi.fn(() => 'test-token'),
    closeWindow: vi.fn(),
  })),
  useFileUpload: vi.fn(() => ({
    files: [],
    addFiles: vi.fn(() => Promise.resolve([])),
    removeFile: vi.fn(),
    clearFiles: vi.fn(),
    updateFileStatus: vi.fn(),
    totalSize: 0,
    canAddMore: true,
  })),
  useCaptcha: vi.fn(() => ({
    isReady: true,
    isLoading: false,
    error: null,
    executeRecaptcha: vi.fn(() => Promise.resolve('mock-captcha-token')),
  })),
  useLocationCascade: vi.fn(() => ({
    provinces: [],
    districts: [],
    subdistricts: [],
    selectedProvince: '',
    selectedDistrict: '',
    selectedSubdistrict: '',
    zipcode: '',
    loadingProvinces: false,
    loadingDistricts: false,
    loadingSubdistricts: false,
    setSelectedProvince: vi.fn(),
    setSelectedDistrict: vi.fn(),
    setSelectedSubdistrict: vi.fn(),
    fetchProvinces: vi.fn(() => Promise.resolve()),
  })),
}));

// Mock API service
vi.mock('@/services/api', () => ({
  submitClaim: vi.fn(() =>
    Promise.resolve({ success: true, caseNumber: 'CASE-001', caseId: 'uuid-123' })
  ),
  uploadFilesParallel: vi.fn(() => Promise.resolve([])),
}));

// Mock causeOfLoss config
vi.mock('@/config/causeOfLoss', () => ({
  getContactEmail: vi.fn(() => undefined),
  CAUSE_OF_LOSS_OPTIONS: [
    { value: '974', label: 'ภัยน้ำท่วม (974)' },
    { value: '787', label: 'ภัยจากน้ำ (787)' },
  ],
}));

describe('ClaimForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form title', () => {
    render(<ClaimForm />);
    expect(screen.getByText('DHIPAYA INSURANCE')).toBeInTheDocument();
    expect(screen.getByText(/แจ้งเคลมน้ำท่วม/)).toBeInTheDocument();
  });

  it('should render all form sections', () => {
    render(<ClaimForm />);

    expect(screen.getByText('ข้อมูลผู้เอาประกันภัย')).toBeInTheDocument();
    expect(screen.getByText('รายละเอียดเคลม')).toBeInTheDocument();
    expect(screen.getByText('เอกสารประกอบการพิจารณา - รูปความเสียหาย')).toBeInTheDocument();
    expect(screen.getByText('เอกสารประกอบการพิจารณา - เอกสารส่วนตัว')).toBeInTheDocument();
  });

  it('should render submit button', () => {
    render(<ClaimForm />);
    expect(screen.getByRole('button', { name: 'ยืนยันข้อมูล' })).toBeInTheDocument();
  });

  it('should render policy number input', () => {
    render(<ClaimForm />);
    expect(screen.getByLabelText(/เลขที่กรมธรรม์/)).toBeInTheDocument();
  });

  it('should render phone input', () => {
    render(<ClaimForm />);
    expect(screen.getByLabelText(/เบอร์มือถือ/)).toBeInTheDocument();
  });

  it('should render notifier name input', () => {
    render(<ClaimForm />);
    expect(screen.getByLabelText(/ชื่อ นามสกุล ผู้แจ้ง/)).toBeInTheDocument();
  });
});

describe('ClaimForm Sections', () => {
  it('should render InsuredInfoSection fields', () => {
    render(<ClaimForm />);

    expect(screen.getByLabelText(/เลขที่กรมธรรม์/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ชื่อ นามสกุล ผู้เอาประกันภัย/)).toBeInTheDocument();
    expect(screen.getByLabelText(/หมายเลขบัตรประชาชน/)).toBeInTheDocument();
    expect(screen.getByText(/ผู้แจ้งคือบุคคลเดียวกับผู้เอาประกันภัย/)).toBeInTheDocument();
  });

  it('should render ClaimDetailsSection fields', () => {
    render(<ClaimForm />);

    expect(screen.getByLabelText(/ประเภทภัย/)).toBeInTheDocument();
    expect(screen.getByLabelText(/วันที่\/เวลาเกิดเหตุ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/สถานที่เกิดเหตุ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/จังหวัด/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ประมาณการค่าสินไหม/)).toBeInTheDocument();
  });

  it('should render DocumentUploadSection (2 sections)', () => {
    render(<ClaimForm />);

    expect(screen.getByText(/กรุณาอัปโหลดรูปถ่าย/)).toBeInTheDocument();
    expect(screen.getByText(/กรุณาอัปโหลดเอกสาร/)).toBeInTheDocument();
  });
});

describe('ClaimForm Submission', () => {
  it('should render submit button as enabled by default', () => {
    render(<ClaimForm />);

    const submitButton = screen.getByRole('button', { name: 'ยืนยันข้อมูล' });
    // Button is enabled - validation happens on submit
    expect(submitButton).not.toBeDisabled();
  });
});
