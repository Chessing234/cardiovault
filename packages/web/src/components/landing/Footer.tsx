'use client';

import Link from 'next/link';
import { Github, HeartPulse } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-[#050508] px-4 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-white">
            <HeartPulse className="h-6 w-6 text-cv-red" aria-hidden />
            <span className="text-lg font-bold">CardioVault</span>
          </div>
          <p className="max-w-sm text-sm text-gray-500">
            Demo-ready cardiovascular stack: SIWE sessions, risk signals, ZK-friendly proofs, IPFS
            imaging, and CardioVault Academy — built for hackathon judges and real pilots.
          </p>
          <Link
            href="https://github.com/"
            className="mt-4 inline-flex items-center gap-2 text-sm text-cv-teal hover:text-teal-300"
            target="_blank"
            rel="noreferrer"
          >
            <Github className="h-4 w-4" aria-hidden />
            View on GitHub
          </Link>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Demo checklist
          </p>
          <ul className="space-y-1 text-sm text-gray-400">
            <li>Wallet + SIWE session</li>
            <li>Health data → risk workspace</li>
            <li>ZK proof utilities + verifier contracts</li>
            <li>RAG assistant + Academy + IPFS gallery</li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-center text-xs text-gray-600">
        Educational demo — not a medical device. Privacy-first, HIPAA-aware design patterns; consult
        counsel before clinical use.
      </p>
    </footer>
  );
}
