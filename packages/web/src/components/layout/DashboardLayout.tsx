'use client';

import { ReactNode, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNavSheet } from '@/components/layout/MobileNavSheet';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarWidth = collapsed ? '4rem' : '16rem';

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#0a0a0f]"
      style={{ ['--cv-sidebar-width' as string]: sidebarWidth }}
    >
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <MobileNavSheet open={mobileOpen} onOpenChange={setMobileOpen} />
      <div
        className="min-h-screen transition-[padding] duration-300 md:pl-[var(--cv-sidebar-width)]"
      >
        <TopBar onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="w-full max-w-full p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
