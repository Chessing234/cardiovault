'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShieldCheck, Stethoscope } from 'lucide-react';

const rows = [
  {
    patient: 'Jordan Lee',
    mrn: 'CV-10291',
    risk: '11.2%',
    consent: 'Vitals + imaging',
    lastVisit: '2026-06-02',
  },
  {
    patient: 'Samira Patel',
    mrn: 'CV-10444',
    risk: '16.8%',
    consent: 'Risk score only',
    lastVisit: '2026-05-20',
  },
  {
    patient: 'Marcus Chen',
    mrn: 'CV-09912',
    risk: '8.4%',
    consent: 'Full cardiovascular',
    lastVisit: '2026-06-10',
  },
];

export function ProviderPortal() {
  return (
    <div className="space-y-6">
      <Card className="border border-cv-teal/20 bg-gradient-to-br from-cv-dark to-gray-900 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cv-teal/15 text-cv-teal">
            <Stethoscope className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Clinic cockpit</h2>
            <p className="text-sm text-gray-400">
              Read-only patient summaries gated by on-chain consent — mock roster for the demo.
            </p>
          </div>
          <Badge className="ml-auto bg-cv-teal/20 text-cv-teal hover:bg-cv-teal/30">
            <ShieldCheck className="mr-1 h-3 w-3" aria-hidden />
            Consent-aware
          </Badge>
        </div>
      </Card>

      <Card className="border-gray-800 bg-cv-dark p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Patient</TableHead>
              <TableHead className="text-gray-400">Record</TableHead>
              <TableHead className="text-gray-400">10-yr risk</TableHead>
              <TableHead className="text-gray-400">Consent scope</TableHead>
              <TableHead className="text-gray-400">Last encounter</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.mrn} className="border-gray-800 hover:bg-gray-800/40">
                <TableCell className="font-medium text-white">{r.patient}</TableCell>
                <TableCell className="font-mono text-xs text-gray-400">{r.mrn}</TableCell>
                <TableCell className="text-cv-red">{r.risk}</TableCell>
                <TableCell className="max-w-[200px] truncate text-gray-300" title={r.consent}>
                  {r.consent}
                </TableCell>
                <TableCell className="text-gray-400">{r.lastVisit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
