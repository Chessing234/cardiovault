'use client';

import Link from 'next/link';
import { ConnectButton } from '@/components/ConnectButton';
import { Activity, Brain, HeartPulse, Lock, Shield, Wallet } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-cv-red/5 via-transparent to-cv-blue/5" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cv-red/20 bg-cv-red/10 px-4 py-1.5">
          <HeartPulse className="h-4 w-4 text-cv-red" aria-hidden />
          <span className="text-sm font-medium text-cv-red">Decentralized cardiovascular health</span>
        </div>

        <h1 className="mb-6 text-5xl font-bold leading-tight text-white md:text-7xl">
          Own Your
          <br />
          <span className="text-cv-red">Heartbeat</span>
        </h1>

        <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-400">
          CardioVault combines wallet-native sessions, AI risk signals, zero-knowledge-friendly proofs,
          IPFS imaging, and CardioVault Academy — polished for live demos.
        </p>

        <div className="mb-12 flex flex-col justify-center gap-4 sm:flex-row sm:items-center">
          <div className="flex justify-center">
            <ConnectButton />
          </div>
          <Link
            href="#features"
            className="rounded-lg border border-gray-700 px-6 py-2.5 font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
          >
            Learn more
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4" aria-hidden />
            Built on Ethereum
          </span>
          <span className="flex items-center gap-2">
            <Brain className="h-4 w-4" aria-hidden />
            Powered by AI
          </span>
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4" aria-hidden />
            HIPAA-aware design
          </span>
          <span className="flex items-center gap-2">
            <Wallet className="h-4 w-4" aria-hidden />
            Join 10,000+ demo patients
          </span>
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4" aria-hidden />
            Live risk + ZK flows
          </span>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 animate-bounce justify-center">
        <div className="flex h-10 w-6 justify-center rounded-full border-2 border-gray-700 pt-2">
          <div className="h-2 w-1 rounded-full bg-gray-500" />
        </div>
      </div>
    </section>
  );
}
