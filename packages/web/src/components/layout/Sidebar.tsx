'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, formatAddress } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  HeartPulse,
} from 'lucide-react';
import { navItems } from '@/lib/nav-config';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const { isConnected, isAuthenticated, walletAddress } = useAuth();

  const display =
    isConnected && isAuthenticated && walletAddress
      ? formatAddress(walletAddress)
      : isConnected
        ? 'Sign in to continue'
        : 'Connect wallet';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-gray-800 bg-cv-dark transition-[width] duration-300 md:flex',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div
        className={cn(
          'flex border-b border-gray-800 p-4',
          collapsed ? 'flex-col items-center gap-3' : 'items-center justify-between gap-2'
        )}
      >
        {!collapsed && (
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2">
            <HeartPulse className="h-6 w-6 shrink-0 text-cv-red" aria-hidden />
            <span className="truncate text-lg font-bold text-white">CardioVault</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="mx-auto flex justify-center" title="Home">
            <HeartPulse className="h-6 w-6 text-cv-red" aria-hidden />
          </Link>
        )}
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-800/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cv-red/40"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cv-red/40',
                isActive
                  ? 'border-r-2 border-cv-red bg-cv-red/10 text-cv-red'
                  : 'border-r-2 border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden />
              {!collapsed && (
                <span className="truncate text-sm font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <div
          className={cn(
            'flex items-center gap-3',
            collapsed && 'justify-center'
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cv-red to-cv-blue text-xs font-bold text-white">
            CV
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-white">Patient</p>
              <p className="truncate text-xs text-gray-500" title={display}>
                {display}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
