import { Brain, GraduationCap, HeartPulse, Image, Lock, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';

const features = [
  {
    icon: ShieldCheck,
    title: 'Zero-knowledge health proofs',
    description:
      'Prove cardiovascular risk thresholds to third parties without revealing underlying vitals on-chain.',
    color: 'text-cv-teal',
    bg: 'bg-cv-teal/10',
  },
  {
    icon: Brain,
    title: 'AI risk prediction',
    description:
      'Structured assessments and dashboards translate your inputs into clear, demo-safe risk narratives.',
    color: 'text-cv-blue',
    bg: 'bg-cv-blue/10',
  },
  {
    icon: HeartPulse,
    title: 'Health identity (SBT-ready)',
    description:
      'Wallet-bound sessions via SIWE, with contracts and UI ready for soulbound identity flows.',
    color: 'text-cv-red',
    bg: 'bg-cv-red/10',
  },
  {
    icon: Lock,
    title: 'Client-side encrypted imaging',
    description:
      'Medical files are encrypted before IPFS pinning; optional S3 mirrors encrypted blobs for hot cache.',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
  },
  {
    icon: Image,
    title: 'Medical imaging vault',
    description:
      'Drag-and-drop ECGs, echoes, PDFs, and DICOM exports with CID copy, previews, and gallery persistence.',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
  },
  {
    icon: GraduationCap,
    title: 'CardioVault Academy',
    description:
      'Gamified modules, quizzes, and Heart Points — with layout ready for soulbound credential copy.',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
  },
] as const;

export function Features() {
  return (
    <section id="features" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Why CardioVault?</h2>
          <p className="mx-auto max-w-2xl text-gray-400">
            A cohesive demo that threads wallet auth, health data, risk, ZK utilities, RAG assistant,
            academy, IPFS gallery, and consent-aware contracts.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-gray-800 bg-cv-dark/50 p-6 transition-colors hover:border-gray-700"
            >
              <div className={`mb-4 w-fit rounded-xl p-3 ${feature.bg}`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} aria-hidden />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
