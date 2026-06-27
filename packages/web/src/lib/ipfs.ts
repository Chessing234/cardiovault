/**
 * IPFS medical image storage with client-side encryption.
 * Pinning uses Pinata via server routes — never put PINATA_JWT or secret keys in NEXT_PUBLIC_*.
 *
 * Encryption: AES-256-CBC + PKCS7 via crypto-js (IV prepended to ciphertext).
 */

import CryptoJS from 'crypto-js';

export interface IPFSUploadResult {
  cid: string;
  url: string;
  size: number;
  encrypted: boolean;
  s3Key?: string;
  recordId?: string;
}

/** Default nonce so the same wallet always derives the same key (required to decrypt past uploads). */
export const IPFS_KEY_NONCE = 'cardiovault-medical-imaging-v1';

export function getIpfsGateway(): string {
  const g = process.env.NEXT_PUBLIC_IPFS_GATEWAY?.replace(/\/?$/, '');
  return g && g.length > 0 ? `${g}/` : 'https://gateway.pinata.cloud/ipfs/';
}

function wordArrayToArrayBuffer(wa: CryptoJS.lib.WordArray): ArrayBuffer {
  const out = new Uint8Array(wa.sigBytes);
  for (let i = 0; i < wa.sigBytes; i++) {
    out[i] = (wa.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return out.buffer;
}

/**
 * Encrypt file bytes using AES-256-CBC (SHA256(password) as key, random 16-byte IV).
 */
export function encryptFile(fileData: ArrayBuffer, password: string): ArrayBuffer {
  const iv = CryptoJS.lib.WordArray.random(16);
  const key = CryptoJS.SHA256(password);
  const wa = CryptoJS.lib.WordArray.create(new Uint8Array(fileData));
  const encrypted = CryptoJS.AES.encrypt(wa, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const combined = iv.clone().concat(encrypted.ciphertext);
  return wordArrayToArrayBuffer(combined);
}

/**
 * Decrypt payload produced by {@link encryptFile}.
 */
export function decryptFile(encryptedData: ArrayBuffer, password: string): ArrayBuffer {
  const u8 = new Uint8Array(encryptedData);
  if (u8.length < 16) {
    throw new Error('Invalid encrypted payload');
  }
  const iv = CryptoJS.lib.WordArray.create(u8.subarray(0, 16));
  const ct = CryptoJS.lib.WordArray.create(u8.subarray(16));
  const key = CryptoJS.SHA256(password);
  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: ct });
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return wordArrayToArrayBuffer(decrypted);
}

/**
 * Upload to IPFS via authenticated app API (forwards to Pinata with server secrets).
 */
export async function uploadToIPFS(
  file: File,
  encrypt: boolean = true,
  encryptionKey?: string,
  metadata?: Record<string, string>,
  options?: { walletAddress: string; backupS3?: boolean }
): Promise<IPFSUploadResult> {
  const walletAddress = options?.walletAddress;
  if (!walletAddress?.startsWith('0x')) {
    throw new Error('walletAddress is required for upload');
  }

  let body: File | Blob = file;
  if (encrypt) {
    if (!encryptionKey) throw new Error('encryptionKey is required when encrypt is true');
    const ab = await file.arrayBuffer();
    const encrypted = encryptFile(ab, encryptionKey);
    body = new Blob([encrypted], { type: 'application/octet-stream' });
  }

  const formData = new FormData();
  formData.append('file', body, encrypt ? `${file.name}.cvenc` : file.name);
  formData.append('walletAddress', walletAddress);
  formData.append('encrypted', encrypt ? 'true' : 'false');
  formData.append('originalName', file.name);
  formData.append('originalMime', file.type || 'application/octet-stream');
  formData.append('imageType', inferImageType(file.name));
  if (metadata && Object.keys(metadata).length) {
    formData.append('metadata', JSON.stringify(metadata));
  }
  if (options?.backupS3) {
    formData.append('backupS3', 'true');
  }

  const response = await fetch('/api/ipfs/pin', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `IPFS upload failed: ${response.statusText}`);
  }

  return (await response.json()) as IPFSUploadResult;
}

/**
 * Download raw bytes from a public IPFS gateway (still encrypted if you uploaded with encrypt=true).
 */
export async function getFromIPFS(cid: string): Promise<ArrayBuffer> {
  const response = await fetch(`${getIpfsGateway()}${cid}`);
  if (!response.ok) {
    throw new Error(`Failed to retrieve from IPFS: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

/**
 * Derive an encryption key from wallet + nonce (SHA256 hex string).
 * Use a stable {@link IPFS_KEY_NONCE} so the same wallet can decrypt historical uploads.
 */
export async function generateEncryptionKey(
  walletAddress: string,
  nonce: string
): Promise<string> {
  const combined = `${walletAddress.toLowerCase()}-${nonce}`;
  return CryptoJS.SHA256(combined).toString();
}

/**
 * Unpin via authenticated app API (forwards to Pinata).
 */
export async function unpinFromIPFS(cid: string): Promise<void> {
  const response = await fetch(
    `/api/ipfs/unpin?cid=${encodeURIComponent(cid)}`,
    { method: 'DELETE', credentials: 'include' }
  );
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Failed to unpin from IPFS: ${response.statusText}`);
  }
}

function inferImageType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('ecg') || lower.includes('ekg')) return 'ECG';
  if (lower.includes('echo')) return 'Echocardiogram';
  if (lower.includes('mri')) return 'MRI';
  if (lower.includes('ct') || lower.includes('cat')) return 'CT Scan';
  if (lower.includes('xray') || lower.includes('x-ray')) return 'X-Ray';
  return 'Medical Image';
}
