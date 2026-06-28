'use client';
// Admin-Dashboard/src/components/admin/Sidebar.tsx
// Part 55.13 — Updated with theme-aware styling, logo with white background, and mobile auto-collapse.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
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
  Heart,
  Menu,
  X,
} from 'lucide-react';
import { adminSignOut } from '@/lib/auth';
import { toast } from 'sonner';
import { useTheme } from '../../context/ThemeContext';
import Image from 'next/image';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  accent?: 'orange' | 'pink';
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Users', href: '/dashboard/users', icon: <Users className="w-4 h-4" /> },
  { label: 'Credits', href: '/dashboard/credits', icon: <CreditCard className="w-4 h-4" /> },
  { label: 'Payments', href: '/dashboard/payments', icon: <Receipt className="w-4 h-4" /> },
  { label: 'Abuse Detection', href: '/dashboard/abuse', icon: <AlertOctagon className="w-4 h-4" />, accent: 'orange' },
  { label: 'Content', href: '/dashboard/content', icon: <FileText className="w-4 h-4" /> },
  { label: 'Workspaces', href: '/dashboard/workspaces', icon: <Building2 className="w-4 h-4" /> },
  { label: 'Social', href: '/dashboard/social', icon: <Heart className="w-4 h-4" />, accent: 'pink' },
  { label: 'Audit Log', href: '/dashboard/audit', icon: <Activity className="w-4 h-4" /> },
];

function getAccentClasses(active: boolean, accent?: 'orange' | 'pink'): string {
  if (!active) return 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]';

  if (accent === 'orange') {
    return 'bg-orange-500/15 text-orange-400 border border-orange-500/20';
  }
  if (accent === 'pink') {
    return 'bg-pink-500/15 text-pink-400 border border-pink-500/20';
  }
  return 'bg-primary/15 text-primary border border-primary/20';
}

interface SidebarProps { adminEmail: string; }

export function Sidebar({ adminEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLight } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Check if we're on the client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle window resize for mobile detection
  useEffect(() => {
    if (!isMounted) return;

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(false);
        setMobileOpen(false);
      } else {
        setCollapsed(false);
        setMobileOpen(true);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMounted]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await adminSignOut();
    toast.success('Signed out successfully');
    router.replace('/login');
  };

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  const bgGradient = isLight
    ? 'linear-gradient(180deg, var(--background-elevated) 0%, var(--background) 100%)'
    : 'linear-gradient(180deg, var(--background-card) 0%, var(--background) 100%)';

  // On mobile, the sidebar is always "expanded" (shows labels) when open
  const sidebarWidth = isMobile ? '280px' : (collapsed ? '64px' : '240px');

  // Logo component
  const Logo = ({ showText = true }: { showText?: boolean }) => (
    <div className="flex items-center gap-3">
      <div 
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <Image
          src="/icon.png"
          alt="DeepDive Logo"
          width={32}
          height={32}
          className="object-contain"
          style={{ 
            width: 30, 
            height: 30,
            display: 'block',
          }}
          priority
        />
      </div>
      {showText && (
        <div className="overflow-hidden">
          <p className="text-sm font-bold leading-tight whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
            DeepDive
          </p>
          <p className="text-[10px] font-medium whitespace-nowrap" style={{ color: 'var(--primary)' }}>
            Admin Panel
          </p>
        </div>
      )}
    </div>
  );

  // Sidebar content
  const SidebarContent = () => (
    <>
      {/* Logo section with white background icon */}
      <div className="flex items-center justify-between px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        {/* Logo with text - always visible on mobile when open, desktop when expanded */}
        {(!collapsed || isMobile) ? (
          <Logo showText={true} />
        ) : (
          /* On desktop collapsed: show only logo */
          <Logo showText={false} />
        )}
        
        {/* Close button - only visible on mobile when sidebar is open */}
        {isMobile && mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const activeClasses = getAccentClasses(active, item.accent);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed && !isMobile ? item.label : undefined}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                activeClasses,
              ].join(' ')}
              onClick={() => {
                if (isMobile) setMobileOpen(false);
              }}
            >
              <span className="shrink-0">{item.icon}</span>
              {/* Always show labels on mobile when sidebar is open, on desktop only when not collapsed */}
              {(!collapsed || isMobile) && (
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                  {item.label}
                </span>
              )}
              {(!collapsed || isMobile) && item.badge && (
                <span
                  className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{
                    backgroundColor: 'rgba(108, 99, 255, 0.2)',
                    color: 'var(--primary)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t p-3" style={{ borderColor: 'var(--border)' }}>
        {(!collapsed || isMobile) && (
          <div className="mb-3 px-2">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
              Signed in as
            </p>
            <p className="text-xs truncate font-medium" style={{ color: 'var(--text-secondary)' }}>
              {adminEmail}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title={collapsed && !isMobile ? 'Sign out' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
          style={{
            color: 'var(--text-muted)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--error)';
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span>Sign out</span>}
        </button>
      </div>
    </>
  );

  // Don't render anything during SSR
  if (!isMounted) {
    return (
      <aside
        className="relative flex flex-col h-screen border-r transition-all duration-300 shrink-0 hidden md:flex"
        style={{
          width: '240px',
          background: bgGradient,
          borderColor: 'var(--border)',
        }}
      >
        {/* Placeholder content - will be replaced after hydration */}
        <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0" />
          <div className="overflow-hidden">
            <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-16 bg-white/10 rounded animate-pulse mt-1" />
          </div>
        </div>
      </aside>
    );
  }

  // Mobile view: overlay sidebar with full labels
  if (isMobile) {
    return (
      <>
        {/* Mobile toggle button - only visible when sidebar is closed */}
        {!mobileOpen && (
          <button
            onClick={() => setMobileOpen(true)}
            className="fixed top-4 left-4 z-50 md:hidden p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'var(--background-card)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 md:hidden"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
              onClick={() => setMobileOpen(false)}
            />
            {/* Sidebar - always shows labels on mobile */}
            <aside
              className="fixed top-0 left-0 z-40 h-screen transition-transform duration-300 ease-in-out md:hidden"
              style={{
                width: '280px',
                background: bgGradient,
                borderColor: 'var(--border)',
                transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
                borderRight: '1px solid var(--border)',
                boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
              }}
            >
              <SidebarContent />
            </aside>
          </>
        )}
      </>
    );
  }

  // Desktop view: always visible with collapse toggle
  return (
    <aside
      className="relative flex flex-col h-screen border-r transition-all duration-300 shrink-0 hidden md:flex"
      style={{
        width: sidebarWidth,
        background: bgGradient,
        borderColor: 'var(--border)',
      }}
    >
      {/* Collapse toggle button (desktop only) */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-[68px] z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
        style={{
          backgroundColor: 'var(--background-card)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
        }}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      <SidebarContent />
    </aside>
  );
}