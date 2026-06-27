import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddress(address: string, chars = 4): string {
  const a = address.trim();
  if (!a.startsWith('0x') || a.length < 2 + chars * 2) {
    return a;
  }
  return `${a.slice(0, 2 + chars)}...${a.slice(-chars)}`;
}
