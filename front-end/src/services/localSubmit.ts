import JSZip from 'jszip';

interface LocalSubmitOptions {
    claimType: string;
    data: Record<string, any>;
    imageFiles?: File[];
    documentFiles?: File[];
}

/**
 * Simulate submission by creating a ZIP file containing the data and uploads.
 * imageFiles  → renamed image1.ext, image2.ext, ...
 * documentFiles → renamed document1.ext, document2.ext, ...
 */
export async function saveClaimLocally({ claimType, data, imageFiles = [], documentFiles = [] }: LocalSubmitOptions): Promise<void> {
    const zip = new JSZip();

    // Create timestamp for folder name
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') + '_' +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');

    const notifierName = (data.notifierName || 'Unknown').replace(/[^a-zA-Z0-9ก-๙]/g, '_');
    const folderName = `${claimType}_${notifierName}_${timestamp}`;

    const root = zip.folder(folderName);

    if (!root) {
        throw new Error('Failed to create ZIP folder');
    }

    // Add JSON data
    root.file('data.json', JSON.stringify(data, null, 2));

    // Add files — source-based naming regardless of MIME type
    const allFiles = imageFiles.length > 0 || documentFiles.length > 0;
    if (allFiles) {
        const uploads = root.folder('uploads');
        if (uploads) {
            // image<N>.ext  — files from DamageImageUpload
            imageFiles.forEach((file, i) => {
                const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
                uploads.file(`image${i + 1}.${ext}`, file);
            });

            // document<N>.ext — files from PersonalDocumentUpload
            documentFiles.forEach((file, i) => {
                const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
                uploads.file(`document${i + 1}.${ext}`, file);
            });
        }
    }

    // Generate and download
    const content = await zip.generateAsync({ type: 'blob' });

    // Create download link
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${folderName}.zip`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

