import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { ImageGallery } from '@/components/images/ImageGallery';
import { Image as ImageLucide } from 'lucide-react';

export default function ImagesPage() {
  return (
    <DashboardLayout>
      <AuthGuard>
        <div className="max-w-5xl">
          <div className="mb-2 flex items-center gap-3">
            <ImageLucide className="h-8 w-8 text-cv-blue" />
            <h1 className="text-3xl font-bold text-white">Medical Images</h1>
          </div>
          <p className="mb-6 text-gray-400">
            Your medical imaging stored on IPFS with client-side encryption before upload. Pinata
            never sees plaintext; optional S3 mirrors the encrypted blob when AWS is configured.
          </p>
          <ImageGallery />
        </div>
      </AuthGuard>
    </DashboardLayout>
  );
}
