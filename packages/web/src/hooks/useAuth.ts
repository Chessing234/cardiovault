'use client';

import { useAccount, useSignMessage, useDisconnect, useChainId } from 'wagmi';
import { useState, useCallback, useEffect } from 'react';
import { createSIWEMessage } from '@/lib/siwe';
import { useRouter } from 'next/navigation';

interface AuthState {
  isAuthenticated: boolean;
  address?: `0x${string}`;
  role?: string;
  isLoading: boolean;
  error?: string;
}

export function useAuth() {
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
  });

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      if (!res.ok) {
        setAuthState((prev) => ({ ...prev, isAuthenticated: false, address: undefined, role: undefined }));
        return;
      }
      const data = (await res.json()) as {
        isAuthenticated: boolean;
        address: `0x${string}`;
        role?: string;
      };
      setAuthState({
        isAuthenticated: data.isAuthenticated,
        address: data.address,
        role: data.role,
        isLoading: false,
      });
    } catch {
      setAuthState((prev) => ({ ...prev, isAuthenticated: false, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (!isConnected && authState.isAuthenticated) {
      void (async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        setAuthState({ isAuthenticated: false, isLoading: false });
        router.refresh();
      })();
    }
  }, [isConnected, authState.isAuthenticated, router]);

  const signIn = useCallback(async () => {
    if (!address || !chainId) return;

    setAuthState((prev) => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const nonceRes = await fetch('/api/auth/nonce', { credentials: 'include' });
      if (!nonceRes.ok) throw new Error('Failed to fetch nonce');
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      const message = createSIWEMessage({
        address,
        chainId,
        nonce,
      });

      const signature = await signMessageAsync({ message });

      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message, signature }),
      });

      if (!verifyRes.ok) {
        const errBody = (await verifyRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error || 'Verification failed');
      }

      const data = (await verifyRes.json()) as { address: `0x${string}`; role?: string };

      setAuthState({
        isAuthenticated: true,
        address: data.address,
        role: data.role,
        isLoading: false,
      });

      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [address, chainId, signMessageAsync, router]);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    disconnect();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
    });
    router.refresh();
  }, [disconnect, router]);

  return {
    ...authState,
    isConnected,
    walletAddress: address,
    signIn,
    signOut,
    refreshSession: checkSession,
  };
}
