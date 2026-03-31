'use client';
// Admin-Dashboard/src/components/admin/Sidebar.tsx
// Part 32 UPDATE — Added Abuse Detection, Content, Workspaces nav items.
// Part 37 UPDATE — Added Social Analytics nav item.
// All existing Part 31–32 logic preserved.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertOctagon,
  FileText,
  Building2,
  // Part 37: Social icon
  Heart,
} from 'lucide-react';
import { adminSignOut } from '@/lib/auth';
import { toast }       from 'sonner';

interface NavItem {
  label:   string;
  href:    string;
  icon:    React.ReactNode;
  badge?:  string;
  accent?: 'orange' | 'pink';
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview',        href: '/dashboard',            icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Users',           href: '/dashboard/users',      icon: <Users           className="w-4 h-4" /> },
  { label: 'Credits',         href: '/dashboard/credits',    icon: <CreditCard      className="w-4 h-4" /> },
  { label: 'Payments',        href: '/dashboard/payments',   icon: <Receipt         className="w-4 h-4" /> },
  // Part 32 entries
  { label: 'Abuse Detection', href: '/dashboard/abuse',      icon: <AlertOctagon    className="w-4 h-4" />, accent: 'orange' },
  { label: 'Content',         href: '/dashboard/content',    icon: <FileText        className="w-4 h-4" /> },
  { label: 'Workspaces',      href: '/dashboard/workspaces', icon: <Building2       className="w-4 h-4" /> },
  // Part 37: Social analytics
  { label: 'Social',          href: '/dashboard/social',     icon: <Heart           className="w-4 h-4" />, accent: 'pink' },
  { label: 'Audit Log',       href: '/dashboard/audit',      icon: <Activity        className="w-4 h-4" /> },
];

// ─── Accent colour helpers ─────────────────────────────────────────────────────

function getAccentClasses(active: boolean, accent?: 'orange' | 'pink'): string {
  if (!active) return 'text-white/45 hover:text-white/80 hover:bg-white/[0.04]';

  if (accent === 'orange') {
    return 'bg-orange-500/15 text-orange-400 border border-orange-500/20';
  }
  if (accent === 'pink') {
    return 'bg-pink-500/15 text-pink-400 border border-pink-500/20';
  }
  return 'bg-[#6C63FF]/15 text-[#6C63FF] border border-[#6C63FF]/20';
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SidebarProps { adminEmail: string; }

export function Sidebar({ adminEmail }: SidebarProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [collapsed,  setCollapsed]  = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await adminSignOut();
    toast.success('Signed out successfully');
    router.replace('/login');
  };

  // Exact match for overview, prefix match for everything else
  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  return (
    <aside
      className="relative flex flex-col h-screen border-r border-white/[0.06] transition-all duration-300 shrink-0"
      style={{
        width:      collapsed ? '64px' : '220px',
        background: 'linear-gradient(180deg,#0D0D1A 0%,#0A0A14 100%)',
      }}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-[68px] z-10 w-6 h-6 rounded-full
                   bg-[#16162A] border border-white/[0.12] flex items-center justify-center
                   text-white/40 hover:text-white/80 hover:border-[#6C63FF]/40 transition-all"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-lg bg-[#6C63FF]/20 border border-[#6C63FF]/30 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-[#6C63FF]" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white leading-tight whitespace-nowrap">DeepDive</p>
            <p className="text-[10px] text-[#6C63FF] font-medium whitespace-nowrap">Admin Panel</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active       = isActive(item.href);
          const activeClasses = getAccentClasses(active, item.accent);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                activeClasses,
              ].join(' ')}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                  {item.label}
                </span>
              )}
              {!collapsed && item.badge && (
                <span className="ml-auto text-[10px] bg-[#6C63FF]/20 text-[#6C63FF] px-1.5 py-0.5 rounded-full font-semibold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/[0.06] p-3">
        {!collapsed && (
          <div className="mb-3 px-2">
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Signed in as</p>
            <p className="text-xs text-white/60 truncate font-medium">{adminEmail}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title={collapsed ? 'Sign out' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                     text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}