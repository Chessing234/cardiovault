'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ConnectButton } from '@/components/ConnectButton';
import { Shield } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  fallback?: ReactNode;
}

/**
 * Wraps content that requires wallet connection + SIWE iron-session.
 */
export function AuthGuard({ children, requireAuth = true, fallback }: AuthGuardProps) {
  const { isConnected, isAuthenticated, isLoading } = useAuth();

  if (!requireAuth) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cv-red" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      fallback ?? (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cv-red/10">
            <Shield className="h-8 w-8 text-cv-red" />
          </div>
          <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
          <p className="max-w-md text-center text-gray-400">
            Connect your Web3 wallet to access your CardioVault health identity. Your data stays under your
            control.
          </p>
          <ConnectButton />
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    return (
      fallback ?? (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8">
          <h2 className="text-2xl font-bold text-white">Sign In Required</h2>
          <p className="max-w-md text-center text-gray-400">
            Sign a message with your wallet to verify ownership and access your health data.
          </p>
          <ConnectButton />
        </div>
      )
    );
  }

  return <>{children}</>;
}
