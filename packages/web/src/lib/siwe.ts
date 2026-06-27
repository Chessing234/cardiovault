import { SiweMessage } from 'siwe';

const DOMAIN =
  typeof window !== 'undefined' ? window.location.host : process.env.NEXT_PUBLIC_APP_HOST ?? 'cardiovault.io';

const ORIGIN =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? 'https://cardiovault.io';

export interface SIWEFields {
  address: string;
  chainId: number;
  nonce: string;
  statement?: string;
}

const DEFAULT_STATEMENT =
  'Sign in to CardioVault to access your decentralized health identity. By signing, you authenticate your wallet and authorize session creation.';

/**
 * Create a SIWE message for the user to sign (EIP-4361).
 */
export function createSIWEMessage(fields: SIWEFields): string {
  const statement = fields.statement ?? DEFAULT_STATEMENT;
  const msg = new SiweMessage({
    domain: DOMAIN,
    address: fields.address,
    statement,
    uri: ORIGIN,
    version: '1',
    chainId: fields.chainId,
    nonce: fields.nonce,
    issuedAt: new Date().toISOString(),
  });
  return msg.prepareMessage();
}

/**
 * Verify a SIWE signature on the server.
 */
export async function verifySIWEMessage(
  message: string,
  signature: string,
): Promise<{ valid: boolean; address?: `0x${string}`; error?: string }> {
  try {
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });
    if (!result.success) {
      return {
        valid: false,
        error: result.error?.type ?? 'Signature verification failed',
      };
    }
    return { valid: true, address: result.data.address as `0x${string}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Verification error';
    return { valid: false, error: msg };
  }
}

export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
