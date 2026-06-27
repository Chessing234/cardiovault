import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  GraduationCap,
  HeartPulse,
  Image,
  LayoutDashboard,
  MessageSquareHeart,
  Settings,
  ShieldCheck,
} from 'lucide-react';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

/** Primary app navigation — shared by desktop sidebar and mobile sheet (8 items). */
export const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: HeartPulse, label: 'Health Data', href: '/health-data' },
  { icon: Activity, label: 'Risk Assessment', href: '/risk' },
  { icon: Image, label: 'Medical Images', href: '/images' },
  { icon: ShieldCheck, label: 'Consent', href: '/consent' },
  { icon: MessageSquareHeart, label: 'AI Assistant', href: '/assistant' },
  { icon: GraduationCap, label: 'Academy', href: '/academy' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];
