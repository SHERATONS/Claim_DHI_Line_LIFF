import { Card } from '@/components/ui';
import { faFileAlt } from '@fortawesome/free-solid-svg-icons';
import { ClaimFileUploadGroup, type FileUploadGroupProps } from './ClaimFileUploadGroup';

interface PersonalDocumentUploadProps extends FileUploadGroupProps {
    instructions?: string[];
}

export function PersonalDocumentUpload({
    instructions,
    ...props
}: PersonalDocumentUploadProps) {
    return (
        <Card title="เอกสารประกอบการพิจารณา - เอกสารส่วนตัว" icon={faFileAlt}>
            <div className="mb-3">
                <ul className="mb-0 ps-3 list-unstyled">
                    {instructions?.map((item, index) => (
                        <li key={index}>{item}</li>
                    ))}
                </ul>
                <div className="text-muted small mt-1 ps-3">
                    ชนิดไฟล์ที่ได้รับอนุญาต &quot;รูปภาพ, Word, Excel, PDF&quot;
                </div>
            </div>
            <ClaimFileUploadGroup {...props} />
        </Card>
    );
}
