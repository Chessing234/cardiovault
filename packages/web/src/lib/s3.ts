import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { s3Client, S3_CONFIG } from './aws-config';
import {
  getPatientImages,
  storeImageMetadata,
  markImageDeleted,
  getImageRecordById,
  logAccessEvent,
} from './aurora';

const SSE = 'AES256' as const;

export interface ImageWithUrl {
  recordId: string;
  s3Key: string;
  imageType: string;
  metadata: Record<string, unknown> | null;
  uploadedAt: string;
  viewUrl: string;
}

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/dicom' || mime === 'application/dicom') return 'dcm';
  return 'bin';
}

export async function uploadMedicalImage(
  walletAddress: string,
  file: Buffer,
  imageType: string,
  metadata: object,
  contentType: string,
): Promise<{ s3Key: string; url: string; recordId: string }> {
  const wallet = walletAddress.toLowerCase();
  const ts = Date.now();
  const id = randomUUID();
  const ext = extFromMime(contentType);
  const s3Key = `medical-images/${wallet}/${ts}-${id}.${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: s3Key,
      Body: file,
      ContentType: contentType,
      ServerSideEncryption: SSE,
      Metadata: {
        wallet: wallet,
        imageType,
      },
    }),
  );

  const recordId = await storeImageMetadata(wallet, s3Key, imageType, {
    ...metadata,
    contentType,
    size: file.length,
  });

  const url = await getPresignedViewUrl(s3Key, 3600);
  await logAccessEvent(wallet, wallet, 'upload', 'medical_image', { s3Key, recordId });
  return { s3Key, url, recordId };
}

export async function getPresignedViewUrl(s3Key: string, expirySeconds = 3600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: S3_CONFIG.bucket, Key: s3Key });
  return getSignedUrl(s3Client, cmd, { expiresIn: expirySeconds });
}

/**
 * Soft-delete metadata and remove the S3 object (immediate cleanup; production may defer S3 delete).
 */
export async function deleteMedicalImage(s3Key: string, recordId: string, walletAddress: string): Promise<void> {
  const wallet = walletAddress.toLowerCase();
  const rec = await getImageRecordById(Number(recordId));
  if (!rec || rec.wallet_address !== wallet) {
    throw new Error('Image not found or wallet mismatch');
  }
  if (rec.s3_key !== s3Key) {
    throw new Error('S3 key does not match record');
  }
  await markImageDeleted(recordId);
  await s3Client.send(new DeleteObjectCommand({ Bucket: S3_CONFIG.bucket, Key: s3Key }));
  await logAccessEvent(wallet, wallet, 'delete', 'medical_image', { s3Key, recordId });
}

export async function getPatientImageGallery(walletAddress: string): Promise<ImageWithUrl[]> {
  const rows = await getPatientImages(walletAddress);
  const out: ImageWithUrl[] = [];
  for (const r of rows) {
    const viewUrl = await getPresignedViewUrl(r.s3_key, 3600);
    out.push({
      recordId: String(r.id),
      s3Key: r.s3_key,
      imageType: r.image_type,
      metadata: r.metadata,
      uploadedAt: r.uploaded_at,
      viewUrl,
    });
  }
  return out;
}

export async function headMedicalObject(s3Key: string) {
  return s3Client.send(new HeadObjectCommand({ Bucket: S3_CONFIG.bucket, Key: s3Key }));
}
