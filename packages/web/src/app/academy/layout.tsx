import { AcademyProgressProvider } from '@/components/academy/AcademyProgressProvider';

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return <AcademyProgressProvider>{children}</AcademyProgressProvider>;
}
