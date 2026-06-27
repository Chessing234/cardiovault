'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { formatAddress } from '@/lib/utils';
import { Bell, Database, Shield, Wallet } from 'lucide-react';

export function SettingsPanels() {
  const { walletAddress, isConnected, isAuthenticated } = useAuth();
  const addr =
    isConnected && walletAddress ? formatAddress(walletAddress) : 'Not connected';

  const [healthReminders, setHealthReminders] = useState(true);
  const [dataAccessAlerts, setDataAccessAlerts] = useState(true);
  const [riskAlerts, setRiskAlerts] = useState(true);
  const [consentChanges, setConsentChanges] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);
  const [zkAuto, setZkAuto] = useState(false);
  const [research, setResearch] = useState(false);

  return (
    <div className="grid max-w-3xl gap-6">
      <Card className="border-gray-800 bg-cv-dark p-6">
        <div className="mb-4 flex items-center gap-3">
          <Wallet className="h-5 w-5 text-cv-teal" />
          <h3 className="text-lg font-semibold text-white">Wallet</h3>
        </div>
        <p className="mb-4 text-sm text-gray-400">
          Your wallet anchors sessions via SIWE. Keys never leave your signer.
        </p>
        <div className="flex flex-col gap-3 rounded-lg border border-gray-800 bg-gray-900/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-400">Connected address</p>
            <p className="mt-1 font-mono text-sm text-white">{addr}</p>
            <p className="mt-2 text-xs text-gray-500">
              Authenticated: {isAuthenticated ? 'yes' : 'no'}
            </p>
          </div>
          {isAuthenticated && (
            <span className="w-fit rounded bg-green-500/20 px-2 py-1 text-xs text-green-400">
              Active
            </span>
          )}
        </div>
      </Card>

      <Card className="border-gray-800 bg-cv-dark p-6">
        <h3 className="text-lg font-semibold text-white">Profile</h3>
        <p className="mb-4 text-sm text-gray-400">Basics shown to your care team when consent allows.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="display" className="text-gray-300">
              Display name
            </Label>
            <Input
              id="display"
              defaultValue="Alex Rivera"
              className="border-gray-700 bg-gray-900 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">
              Contact email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="border-gray-700 bg-gray-900 text-white"
            />
          </div>
        </div>
      </Card>

      <Card className="border-gray-800 bg-cv-dark p-6">
        <div className="mb-4 flex items-center gap-3">
          <Bell className="h-5 w-5 text-cv-blue" />
          <h3 className="text-lg font-semibold text-white">Notifications</h3>
        </div>
        <p className="mb-4 text-sm text-gray-400">Control nudges without exposing clinical data on-chain.</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-white">Health reminders</Label>
              <p className="text-xs text-gray-500">Reminders for checkups and assessments</p>
            </div>
            <Switch
              checked={healthReminders}
              onCheckedChange={setHealthReminders}
              aria-label="Health reminders"
            />
          </div>
          <Separator className="bg-gray-800" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-white">Data access alerts</Label>
              <p className="text-xs text-gray-500">When someone accesses your health data</p>
            </div>
            <Switch
              checked={dataAccessAlerts}
              onCheckedChange={setDataAccessAlerts}
              aria-label="Data access alerts"
            />
          </div>
          <Separator className="bg-gray-800" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-white">Risk alerts</p>
              <p className="text-xs text-gray-500">When a new assessment finishes</p>
            </div>
            <Switch checked={riskAlerts} onCheckedChange={setRiskAlerts} aria-label="Risk alerts" />
          </div>
          <Separator className="bg-gray-800" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-white">Consent changes</p>
              <p className="text-xs text-gray-500">When a provider request updates</p>
            </div>
            <Switch
              checked={consentChanges}
              onCheckedChange={setConsentChanges}
              aria-label="Consent changes"
            />
          </div>
          <Separator className="bg-gray-800" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-white">Product updates</p>
              <p className="text-xs text-gray-500">CardioVault release notes</p>
            </div>
            <Switch
              checked={productUpdates}
              onCheckedChange={setProductUpdates}
              aria-label="Product updates"
            />
          </div>
        </div>
      </Card>

      <Card className="border-gray-800 bg-cv-dark p-6">
        <div className="mb-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-cv-red" />
          <h3 className="text-lg font-semibold text-white">Privacy & security</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-white">ZK proof auto-generation</Label>
              <p className="text-xs text-gray-500">Automatically generate proofs for insurance flows</p>
            </div>
            <Switch checked={zkAuto} onCheckedChange={setZkAuto} aria-label="ZK auto-generation" />
          </div>
          <Separator className="bg-gray-800" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-white">Research participation</Label>
              <p className="text-xs text-gray-500">Share anonymized data for research</p>
            </div>
            <Switch checked={research} onCheckedChange={setResearch} aria-label="Research participation" />
          </div>
        </div>
      </Card>

      <Card className="border-gray-800 bg-cv-dark p-6">
        <div className="mb-4 flex items-center gap-3">
          <Database className="h-5 w-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Storage</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">IPFS storage used (demo)</span>
            <span className="text-white">2.1 MB / 100 MB</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-800">
            <div className="h-2 rounded-full bg-cv-teal" style={{ width: '2.1%' }} />
          </div>
          <p className="text-xs text-gray-500">
            Live usage comes from your Pinata dashboard; this bar is illustrative until billing is
            wired.
          </p>
        </div>
      </Card>
    </div>
  );
}
