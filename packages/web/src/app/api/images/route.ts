import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getPatientImageGallery, getPresignedViewUrl, uploadMedicalImage } from '@/lib/s3';
import { getImageRecordByS3Key } from '@/lib/aurora';
import { errorJson, json, withCors } from '@/lib/api-helpers';
import { getIronAuthSession } from '@/lib/auth-session';
import { walletsMatch } from '@/lib/session-cookie';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/dicom', 'application/dicom']);

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

/** POST multipart: file, walletAddress, imageType, metadata? (JSON string) */
export async function POST(request: NextRequest) {
  try {
    const session = await getIronAuthSession();
    if (session.isAuthenticated !== true || !session.address) return errorJson('Unauthorized', 401);

    const form = (await request.formData()) as unknown as {
      get(name: string): FormDataEntryValue | null;
    };
    const walletAddress = String(form.get('walletAddress') ?? '');
    const imageType = String(form.get('imageType') ?? '');
    const file = form.get('file');
    const metaRaw = form.get('metadata');

    if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      return errorJson('walletAddress is required', 400);
    }
    if (!walletsMatch(session.address, walletAddress)) {
      return errorJson('walletAddress does not match session', 403);
    }
    if (!imageType) return errorJson('imageType is required', 400);
    if (!(file instanceof File)) return errorJson('file is required', 400);

    const contentType = file.type || 'application/octet-stream';
    if (!ALLOWED.has(contentType)) {
      return errorJson(`Unsupported Content-Type: ${contentType}`, 400);
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return errorJson('File exceeds 10MB limit', 400);
    }

    let metadata: Record<string, unknown> = {};
    if (typeof metaRaw === 'string' && metaRaw.trim()) {
      try {
        metadata = JSON.parse(metaRaw) as Record<string, unknown>;
      } catch {
        return errorJson('metadata must be valid JSON', 400);
      }
    }

    const { s3Key, url, recordId } = await uploadMedicalImage(walletAddress, buf, imageType, metadata, contentType);
    return json({ s3Key, viewUrl: url, recordId }, 201);
  } catch (e) {
    console.error(e);
    return errorJson('Upload failed', 500);
  }
}

/** GET — gallery (?walletAddress=) or presigned view (?view=1&s3Key=). */
export async function GET(request: NextRequest) {
  try {
    const session = await getIronAuthSession();
    if (session.isAuthenticated !== true || !session.address) return errorJson('Unauthorized', 401);

    const view = request.nextUrl.searchParams.get('view');
    const s3Key = request.nextUrl.searchParams.get('s3Key');
    if (view === '1' || view === 'true') {
      if (!s3Key) return errorJson('s3Key is required for view', 400);
      const rec = await getImageRecordByS3Key(s3Key);
      if (!rec || !walletsMatch(session.address, rec.wallet_address)) {
        return errorJson('Not found', 404);
      }
      const url = await getPresignedViewUrl(s3Key, 3600);
      return json({ viewUrl: url, s3Key, recordId: String(rec.id) });
    }

    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    if (!walletAddress) return errorJson('walletAddress is required', 400);
    if (!walletsMatch(session.address, walletAddress)) {
      return errorJson('walletAddress does not match session', 403);
    }
    const gallery = await getPatientImageGallery(walletAddress);
    return json({ gallery });
  } catch (e) {
    console.error(e);
    return errorJson('Failed to list images', 500);
  }
}
