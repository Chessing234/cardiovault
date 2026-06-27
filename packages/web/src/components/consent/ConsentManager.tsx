'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ShieldX, User } from 'lucide-react';

interface ConsentEntry {
  id: string;
  accessor: string;
  accessorName: string;
  purpose: string;
  dataCategories: string[];
  grantedAt: string;
  expiresAt: string;
  isActive: boolean;
}

const mockConsents: ConsentEntry[] = [
  {
    id: '1',
    accessor: '0x1234...5678',
    accessorName: 'Dr. Sarah Chen',
    purpose: 'Annual cardiovascular checkup',
    dataCategories: ['vitals', 'cardiovascular'],
    grantedAt: '2026-05-01',
    expiresAt: '2027-05-01',
    isActive: true,
  },
  {
    id: '2',
    accessor: '0xabcd...efgh',
    accessorName: 'BlueCross Insurance',
    purpose: 'Premium discount verification',
    dataCategories: ['risk_score'],
    grantedAt: '2026-03-15',
    expiresAt: '2027-03-15',
    isActive: true,
  },
];

export function ConsentManager() {
  const [consents, setConsents] = useState(mockConsents);

  const toggleConsent = (id: string) => {
    setConsents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
  };

  const revokeConsent = (id: string) => {
    setConsents((prev) => prev.filter((c) => c.id !== id));
  };

  const active = consents.filter((c) => c.isActive);

  return (
    <div className="space-y-4">
      <Card className="border-gray-800 bg-cv-dark p-5">
        <h3 className="mb-4 text-lg font-semibold text-white">Active permissions</h3>
        <div className="space-y-3">
          {active.map((consent) => (
            <div
              key={consent.id}
              className="flex flex-col gap-4 rounded-lg bg-gray-800/50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <User className="h-4 w-4 shrink-0 text-cv-blue" aria-hidden />
                  <span className="font-medium text-white">{consent.accessorName}</span>
                  <Badge
                    variant="outline"
                    className="border-green-500 text-xs text-green-400"
                  >
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-gray-400">{consent.purpose}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap gap-1">
                    {consent.dataCategories.map((cat) => (
                      <Badge
                        key={cat}
                        variant="secondary"
                        className="bg-gray-700 text-xs text-gray-300"
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3 shrink-0" aria-hidden />
                    Expires {consent.expiresAt}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                <Switch
                  checked={consent.isActive}
                  onCheckedChange={() => toggleConsent(consent.id)}
                  aria-label={`Toggle access for ${consent.accessorName}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeConsent(consent.id)}
                  className="text-red-400 hover:bg-red-400/10 hover:text-red-300"
                  aria-label={`Revoke ${consent.accessorName}`}
                >
                  <ShieldX className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          ))}
          {active.length === 0 && (
            <p className="py-8 text-center text-gray-500">No active permissions</p>
          )}
        </div>
      </Card>

      <Card className="border-gray-800 bg-cv-dark p-5">
        <h3 className="mb-4 text-lg font-semibold text-white">Default privacy preferences</h3>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-white">Allow research use</p>
              <p className="text-sm text-gray-400">
                Anonymized data used for cardiovascular research
              </p>
            </div>
            <Switch defaultChecked aria-label="Allow research use" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-white">Insurance sharing</p>
              <p className="text-sm text-gray-400">
                Share risk scores with insurance providers
              </p>
            </div>
            <Switch defaultChecked aria-label="Insurance sharing" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-white">Emergency access</p>
              <p className="text-sm text-gray-400">
                Allow emergency physicians to access data
              </p>
            </div>
            <Switch defaultChecked disabled aria-label="Emergency access (required)" />
          </div>
        </div>
      </Card>
    </div>
  );
}
