'use client';

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export function ConnectButton() {
  const { signIn, signOut, isAuthenticated, isLoading } = useAuth();

  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected = ready && account && chain;

        return (
          <div className="flex items-center gap-3">
            {!connected ? (
              <button
                type="button"
                onClick={openConnectModal}
                className="flex items-center gap-2 rounded-lg bg-cv-red px-6 py-2.5 font-medium text-white transition-colors hover:bg-red-700"
              >
                Connect Wallet
              </button>
            ) : chain.unsupported ? (
              <button
                type="button"
                onClick={openChainModal}
                className="rounded-lg bg-red-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-red-700"
              >
                Wrong Network
              </button>
            ) : !isAuthenticated ? (
              <button
                type="button"
                onClick={() => void signIn()}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg bg-cv-teal px-6 py-2.5 font-medium text-white transition-colors hover:bg-teal-600 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={openAccountModal}
                  className="rounded-lg border border-gray-700 bg-cv-dark px-4 py-2 font-mono text-sm text-white transition-colors hover:border-gray-500"
                >
                  {account.displayName}
                  {account.displayBalance ? ` (${account.displayBalance})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="text-sm text-gray-400 transition-colors hover:text-white"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
