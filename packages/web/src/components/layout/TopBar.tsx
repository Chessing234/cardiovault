'use client';

import { ConnectButton } from '@/components/ConnectButton';
import { Bell, Menu, Search } from 'lucide-react';

export function TopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-800 bg-cv-dark/80 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cv-red/40 md:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search health records, medications..."
              className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 transition-colors focus:border-cv-red focus:outline-none focus:ring-2 focus:ring-cv-red/20"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cv-red/40"
            aria-label="Notifications, 2 unread"
          >
            <Bell className="h-5 w-5" aria-hidden />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-cv-red text-[10px] font-medium text-white">
              2
            </span>
          </button>
          <div className="hidden h-6 w-px bg-gray-800 sm:block" />
          <div className="[&_button]:max-w-[10rem] sm:[&_button]:max-w-none">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
