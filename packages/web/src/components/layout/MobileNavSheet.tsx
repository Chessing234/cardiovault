'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HeartPulse } from 'lucide-react';
import { navItems } from '@/lib/nav-config';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface MobileNavSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNavSheet({ open, onOpenChange }: MobileNavSheetProps) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[min(100vw,18rem)] border-gray-800 bg-cv-dark p-0 text-white"
      >
        <SheetHeader className="border-b border-gray-800 p-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold text-white">
            <HeartPulse className="h-6 w-6 text-cv-red" aria-hidden />
            CardioVault
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cv-red/40',
                  isActive
                    ? 'border border-cv-red/30 bg-cv-red/10 text-cv-red'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
