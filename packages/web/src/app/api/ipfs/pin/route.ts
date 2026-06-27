import type { NextRequest } from 'next/server';
import { errorJson, json } from '@/lib/api-helpers';
import { getIronAuthSession } from '@/lib/auth-session';
import { walletsMatch } from '@/lib/session-cookie';
import { uploadMedicalImage } from '@/lib/s3';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024;
const PINATA_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

function pinataHeaders(): Record<string, string> | null {
  const jwt = process.env.PINATA_JWT?.trim();
  if (jwt) {
    return { Authorization: `Bearer ${jwt}` };
  }
  const key = process.env.PINATA_API_KEY?.trim();
  const secret = process.env.PINATA_SECRET_KEY?.trim();
  if (key && secret) {
    return {
      pinata_api_key: key,
      pinata_secret_api_key: secret,
    };
  }
  return null;
}

/** POST multipart: file, walletAddress, encrypted, originalName, originalMime, imageType, metadata?, backupS3? */
export async function POST(request: NextRequest) {
  try {
    const session = await getIronAuthSession();
    if (session.isAuthenticated !== true || !session.address) {
      return errorJson('Unauthorized', 401);
    }

    const headers = pinataHeaders();
    if (!headers) {
      return errorJson(
        'Pinata is not configured (set PINATA_JWT or PINATA_API_KEY + PINATA_SECRET_KEY on the server)',
        503
      );
    }

    const form = await request.formData();
    const walletAddress = String(form.get('walletAddress') ?? '');
    const encrypted = String(form.get('encrypted') ?? 'false') === 'true';
    const originalName = String(form.get('originalName') ?? 'medical-image');
    const originalMime = String(form.get('originalMime') ?? 'application/octet-stream');
    const imageType = String(form.get('imageType') ?? 'Medical Image');
    const metaRaw = form.get('metadata');
    const backupS3 = String(form.get('backupS3') ?? '') === 'true';

    if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      return errorJson('walletAddress is required', 400);
    }
    if (!walletsMatch(session.address, walletAddress)) {
      return errorJson('walletAddress does not match session', 403);
    }
    const fileEntry = form.get('file');
    if (!(fileEntry instanceof Blob)) {
      return errorJson('file is required', 400);
    }

    const buf = Buffer.from(await fileEntry.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return errorJson('File exceeds 10MB limit', 400);
    }

    let extraMeta: Record<string, string> = {};
    if (typeof metaRaw === 'string' && metaRaw.trim()) {
      try {
        const parsed = JSON.parse(metaRaw) as Record<string, unknown>;
        for (const [k, v] of Object.entries(parsed)) {
          extraMeta[k] = String(v);
        }
      } catch {
        return errorJson('metadata must be valid JSON', 400);
      }
    }

    const pinataForm = new FormData();
    const uploadName = originalName + (encrypted ? '.cvenc' : '');
    const filePart = new File([buf], uploadName, { type: 'application/octet-stream' });
    pinataForm.append('file', filePart);
    const pinataMetadata = JSON.stringify({
      name: originalName,
      keyvalues: {
        type: 'medical',
        encrypted: encrypted ? 'true' : 'false',
        walletAddress: walletAddress.toLowerCase(),
        originalMime,
        ...extraMeta,
      },
    });
    pinataForm.append('pinataMetadata', pinataMetadata);
    pinataForm.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

    const pinRes = await fetch(PINATA_URL, {
      method: 'POST',
      headers,
      body: pinataForm,
    });

    if (!pinRes.ok) {
      const text = await pinRes.text();
      console.error('Pinata error', pinRes.status, text);
      return errorJson(`Pinata pinning failed: ${pinRes.statusText}`, 502);
    }

    const result = (await pinRes.json()) as { IpfsHash: string; PinSize?: number };
    const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY?.replace(/\/?$/, '') || 'https://gateway.pinata.cloud/ipfs';
    const cid = result.IpfsHash;
    const url = `${gateway}/${cid}`;

    let s3Key: string | undefined;
    let recordId: string | undefined;
    if (backupS3 && process.env.S3_MEDICAL_IMAGES_BUCKET) {
      try {
        const up = await uploadMedicalImage(
          walletAddress,
          buf,
          imageType,
          {
            ipfsCid: cid,
            encrypted,
            originalName,
            originalMime,
            ...extraMeta,
          },
          'application/octet-stream'
        );
        s3Key = up.s3Key;
        recordId = up.recordId;
      } catch (e) {
        console.error('S3 backup after IPFS failed', e);
      }
    }

    return json({
      cid,
      url,
      size: result.PinSize ?? buf.length,
      encrypted,
      s3Key,
      recordId,
    });
  } catch (e) {
    console.error(e);
    return errorJson('IPFS pin failed', 500);
  }
}
