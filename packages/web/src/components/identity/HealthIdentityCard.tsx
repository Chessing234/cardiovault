'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useHealthIdentity } from '@/hooks/useHealthIdentity';
import { useHealthIdentityActions } from '@/hooks/useHealthIdentityActions';
import { Fingerprint, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export function HealthIdentityCard() {
  const { hasIdentity, tokenId, isLoading, isRegistered } = useHealthIdentity();
  const { registerIdentity, isPending, txHash } = useHealthIdentityActions();

  const onRegister = async () => {
    try {
      await registerIdentity();
      toast.success('Creating health identity…', { description: 'Confirm the transaction in your wallet.' });
    } catch (e) {
      toast.error('Registration failed', {
        description: e instanceof Error ? e.message : 'Could not register identity',
      });
    }
  };

  return (
    <Card className="border-gray-800 bg-gradient-to-br from-cv-dark to-gray-900 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cv-teal/15 text-cv-teal">
            <Fingerprint className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h3 className="font-semibold text-white">Health identity (SBT)</h3>
            <p className="mt-1 text-sm text-gray-400">
              Soulbound on-chain identity required for ZK proof submission and consent scopes.
            </p>
            {isLoading ? (
              <p className="mt-2 text-xs text-gray-500">Checking chain…</p>
            ) : hasIdentity ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-green-500/40 text-green-400">
                  <ShieldCheck className="mr-1 h-3 w-3" aria-hidden />
                  {isRegistered ? 'Active' : 'Inactive'}
                </Badge>
                {tokenId != null && (
                  <span className="font-mono text-xs text-gray-500">Token #{tokenId.toString()}</span>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-amber-400">Not registered — mint before generating a ZK proof.</p>
            )}
          </div>
        </div>

        {!hasIdentity && !isLoading && (
          <Button
            type="button"
            onClick={() => void onRegister()}
            disabled={isPending}
            className="shrink-0 bg-cv-teal text-white hover:bg-teal-700"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Confirm in wallet…
              </>
            ) : (
              'Create identity'
            )}
          </Button>
        )}
      </div>
      {txHash && (
        <p className="mt-3 truncate font-mono text-xs text-gray-500" title={txHash}>
          Tx: {txHash}
        </p>
      )}
    </Card>
  );
}
