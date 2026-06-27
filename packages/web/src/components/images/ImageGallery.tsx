'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  uploadToIPFS,
  getFromIPFS,
  generateEncryptionKey,
  decryptFile,
  unpinFromIPFS,
  IPFS_KEY_NONCE,
  getIpfsGateway,
} from '@/lib/ipfs';
import { useAuth } from '@/hooks/useAuth';
import {
  Copy,
  Eye,
  Image as ImageIcon,
  Loader2,
  Lock,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface MedicalImage {
  id: string;
  cid: string;
  name: string;
  type: string;
  uploadedAt: string;
  encrypted: boolean;
  size: number;
  mimeType?: string;
  s3Key?: string;
  recordId?: string;
}

const MOCK_IMAGES: MedicalImage[] = [
  {
    id: 'mock-1',
    cid: 'QmExample1',
    name: 'ECG_2026_01.pdf',
    type: 'ECG',
    uploadedAt: '2026-05-15',
    encrypted: true,
    size: 245000,
    mimeType: 'application/pdf',
  },
  {
    id: 'mock-2',
    cid: 'QmExample2',
    name: 'echocardiogram_june.jpg',
    type: 'Echocardiogram',
    uploadedAt: '2026-06-01',
    encrypted: true,
    size: 1800000,
    mimeType: 'image/jpeg',
  },
];

const DEMO_PREFIX = 'QmExample';

function galleryStorageKey(wallet: string) {
  return `cv-ipfs-gallery-${wallet.toLowerCase()}`;
}

function isDemoCid(cid: string) {
  return cid.startsWith(DEMO_PREFIX);
}

export function ImageGallery() {
  const { walletAddress, isAuthenticated } = useAuth();
  const [images, setImages] = useState<MedicalImage[]>(MOCK_IMAGES);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MedicalImage | null>(null);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [loadingView, setLoadingView] = useState(false);

  const persist = useCallback(
    (list: MedicalImage[]) => {
      if (!walletAddress) return;
      const mockIds = new Set(MOCK_IMAGES.map((m) => m.id));
      const stored = list.filter((i) => !mockIds.has(i.id));
      try {
        localStorage.setItem(galleryStorageKey(walletAddress), JSON.stringify(stored));
      } catch {
        toast.error('Could not save gallery to local storage');
      }
    },
    [walletAddress]
  );

  useEffect(() => {
    if (!walletAddress || !isAuthenticated) {
      setImages(MOCK_IMAGES);
      return;
    }
    try {
      const raw = localStorage.getItem(galleryStorageKey(walletAddress));
      if (raw) {
        const parsed = JSON.parse(raw) as MedicalImage[];
        if (Array.isArray(parsed) && parsed.length) {
          setImages([...MOCK_IMAGES, ...parsed]);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setImages(MOCK_IMAGES);
  }, [walletAddress, isAuthenticated]);

  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setEncryptionKey(null);
      return;
    }
    void generateEncryptionKey(walletAddress, IPFS_KEY_NONCE).then(setEncryptionKey);
  }, [walletAddress]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!walletAddress) {
        toast.error('Connect your wallet to upload');
        return;
      }
      const key = encryptionKey;
      if (!key) {
        toast.error('Encryption key not ready yet');
        return;
      }

      setUploading(true);
      for (const file of acceptedFiles) {
        try {
          const result = await uploadToIPFS(
            file,
            true,
            key,
            {
              walletAddress: walletAddress.toLowerCase(),
              uploadDate: new Date().toISOString(),
            },
            {
              walletAddress,
              backupS3: true,
            }
          );

          const newImage: MedicalImage = {
            id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            cid: result.cid,
            name: file.name,
            type: getImageType(file.name),
            uploadedAt: new Date().toISOString().split('T')[0],
            encrypted: result.encrypted,
            size: result.size,
            mimeType: file.type || undefined,
            s3Key: result.s3Key,
            recordId: result.recordId,
          };

          setImages((prev) => {
            const mockIds = new Set(MOCK_IMAGES.map((m) => m.id));
            const rest = prev.filter((i) => !mockIds.has(i.id));
            const next = [...MOCK_IMAGES, newImage, ...rest];
            persist(next);
            return next;
          });
          toast.success('Pinned to IPFS', { description: result.cid });
        } catch (error) {
          console.error('Upload failed:', error);
          toast.error('Upload failed', {
            description: error instanceof Error ? error.message : 'Please try again.',
          });
        }
      }

      setUploading(false);
    },
    [walletAddress, encryptionKey, persist]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading || !walletAddress,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.dcm'],
      'application/pdf': ['.pdf'],
      'application/dicom': ['.dcm'],
    },
    maxSize: 10 * 1024 * 1024,
  });

  const handleView = async (image: MedicalImage) => {
    setSelectedImage(image);
    setViewingUrl(null);
    setLoadingView(true);

    try {
      if (isDemoCid(image.cid)) {
        setViewingUrl(
          image.mimeType?.includes('pdf')
            ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
            : 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80'
        );
        return;
      }

      if (!walletAddress) {
        toast.error('Wallet required to decrypt');
        return;
      }

      const key = await generateEncryptionKey(walletAddress, IPFS_KEY_NONCE);
      const raw = await getFromIPFS(image.cid);

      if (image.encrypted) {
        const plain = decryptFile(raw, key);
        const mime = image.mimeType || 'application/octet-stream';
        const blob = new Blob([plain], { type: mime });
        const url = URL.createObjectURL(blob);
        setViewingUrl(url);
      } else {
        const blob = new Blob([raw], { type: image.mimeType || 'application/octet-stream' });
        setViewingUrl(URL.createObjectURL(blob));
      }
    } catch (e) {
      console.error(e);
      toast.error('Could not load file', {
        description: e instanceof Error ? e.message : 'IPFS or decrypt failed',
      });
    } finally {
      setLoadingView(false);
    }
  };

  const closeDialog = (open: boolean) => {
    if (!open) {
      if (viewingUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(viewingUrl);
      }
      setSelectedImage(null);
      setViewingUrl(null);
    }
  };

  const handleDelete = async (image: MedicalImage) => {
    if (isDemoCid(image.cid)) {
      toast.message('Demo sample', { description: 'Not stored on IPFS — removed from list only.' });
      setImages((prev) => {
        const next = prev.filter((img) => img.id !== image.id);
        persist(next);
        return next;
      });
      return;
    }
    try {
      await unpinFromIPFS(image.cid);
      toast.success('Unpinned from IPFS');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Unpin failed', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
    setImages((prev) => {
      const next = prev.filter((img) => img.id !== image.id);
      persist(next);
      return next;
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const copyCid = async (cid: string) => {
    try {
      await navigator.clipboard.writeText(cid);
      toast.success('CID copied');
    } catch {
      toast.error('Clipboard unavailable');
    }
  };

  const isDicom =
    selectedImage?.mimeType?.includes('dicom') ||
    selectedImage?.name.toLowerCase().endsWith('.dcm');

  const isPdf =
    selectedImage?.mimeType?.includes('pdf') ||
    selectedImage?.name.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={cn(
          'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors',
          isDragActive ? 'border-cv-teal bg-cv-teal/5' : 'border-gray-700 hover:border-gray-600',
          (!walletAddress || uploading) && 'pointer-events-none opacity-60'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-3 h-10 w-10 text-gray-500" />
        <p className="mb-1 font-medium text-white">
          {isDragActive ? 'Drop files here' : 'Drag & drop medical images here'}
        </p>
        <p className="mb-3 text-sm text-gray-500">
          Supports: PNG, JPG, DICOM, PDF (max 10MB). Files are encrypted in the browser before
          pinning.
        </p>
        <Button variant="outline" className="border-gray-600 text-gray-300" type="button" disabled={uploading}>
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading to IPFS…
            </>
          ) : (
            'Select files'
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image) => (
          <Card key={image.id} className="group overflow-hidden border-gray-800 bg-cv-dark">
            <div className="relative flex h-40 items-center justify-center bg-gray-800">
              <ImageIcon className="h-12 w-12 text-gray-600" />
              {image.encrypted && (
                <div className="absolute right-2 top-2 flex items-center gap-1 rounded bg-cv-dark/80 px-2 py-1 text-xs text-cv-teal">
                  <Lock className="h-3 w-3" />
                  Encrypted
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{image.name}</p>
                <p className="text-xs text-gray-500">
                  {image.type} | {formatSize(image.size)}
                </p>
                <p className="text-xs text-gray-600">{image.uploadedAt}</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="max-w-[180px] truncate rounded bg-gray-900 px-1.5 py-0.5 text-[10px] text-gray-400">
                    {image.cid}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-gray-400 hover:text-white"
                    onClick={() => void copyCid(image.cid)}
                    aria-label="Copy CID"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => void handleView(image)}
                  className="flex-1 text-cv-teal hover:bg-cv-teal/10 hover:text-teal-300"
                >
                  <Eye className="mr-1 h-4 w-4" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => void handleDelete(image)}
                  className="text-red-400 hover:bg-red-400/10 hover:text-red-300"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={closeDialog}>
        <DialogContent className="max-w-3xl border-gray-800 bg-cv-dark">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedImage?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex h-96 items-center justify-center overflow-hidden rounded-lg bg-gray-900">
            {loadingView ? (
              <Loader2 className="h-8 w-8 animate-spin text-cv-teal" />
            ) : viewingUrl ? (
              isDicom ? (
                <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
                  <p className="text-sm text-gray-400">
                    DICOM previews need a clinical viewer (e.g. cornerstone.js). Download the decrypted
                    study below.
                  </p>
                  <a
                    href={viewingUrl}
                    download={selectedImage?.name ?? 'study.dcm'}
                    className="rounded-lg bg-cv-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                  >
                    Download DICOM
                  </a>
                </div>
              ) : isPdf || viewingUrl.toLowerCase().includes('.pdf') ? (
                <iframe title="preview" src={viewingUrl} className="h-full w-full rounded-lg" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={viewingUrl} alt="" className="max-h-full max-w-full object-contain" />
              )
            ) : (
              <ImageIcon className="h-16 w-16 text-gray-600" />
            )}
          </div>
          {selectedImage?.encrypted && (
            <p className="flex items-center gap-1 text-xs text-cv-teal">
              <Lock className="h-3 w-3" />
              Encrypted payload — decrypted locally with your wallet-derived key. Gateway:{' '}
              {getIpfsGateway()}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getImageType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('ecg') || lower.includes('ekg')) return 'ECG';
  if (lower.includes('echo')) return 'Echocardiogram';
  if (lower.includes('mri')) return 'MRI';
  if (lower.includes('ct') || lower.includes('cat')) return 'CT Scan';
  if (lower.includes('xray') || lower.includes('x-ray')) return 'X-Ray';
  return 'Medical Image';
}
