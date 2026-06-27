'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, HeartPulse, Shield, Stethoscope, Upload } from 'lucide-react';

const actions = [
  {
    icon: HeartPulse,
    label: 'New Assessment',
    href: '/risk',
    variant: 'default' as const,
    className: 'bg-cv-red hover:bg-red-700',
  },
  {
    icon: Shield,
    label: 'Manage Consent',
    href: '/consent',
    variant: 'outline' as const,
    className: '',
  },
  {
    icon: Upload,
    label: 'Upload Image',
    href: '/images',
    variant: 'outline' as const,
    className: '',
  },
  {
    icon: Stethoscope,
    label: 'Provider Portal',
    href: '/provider',
    variant: 'outline' as const,
    className: '',
  },
  {
    icon: GraduationCap,
    label: 'Learn More',
    href: '/academy',
    variant: 'outline' as const,
    className: '',
  },
];

export function QuickActions() {
  return (
    <Card className="border-gray-800 bg-cv-dark p-5">
      <h3 className="mb-4 text-lg font-semibold text-white">Quick Actions</h3>
      <div className="space-y-2">
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className="block">
            <Button
              variant={action.variant}
              className={`w-full justify-start gap-2 border-gray-700 bg-gray-800 text-white hover:bg-gray-700 ${action.className}`}
            >
              <action.icon className="h-4 w-4 shrink-0" aria-hidden />
              {action.label}
            </Button>
          </Link>
        ))}
      </div>
    </Card>
  );
}
