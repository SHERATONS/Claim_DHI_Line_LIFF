import { Card } from '@/components/ui';
import { faCamera } from '@fortawesome/free-solid-svg-icons';
import { ClaimFileUploadGroup, type FileUploadGroupProps } from './ClaimFileUploadGroup';

type DamageImageUploadProps = FileUploadGroupProps & {
    instructions?: string[];
}

export function DamageImageUpload({
    instructions,
    ...props
}: DamageImageUploadProps) {
    return (
        <Card title="เอกสารประกอบการพิจารณา - รูปความเสียหาย" icon={faCamera}>
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

