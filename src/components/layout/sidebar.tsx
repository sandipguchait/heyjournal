'use client';

import React from 'react';
import { useRouter } from '@/lib/router';
import { useApp } from '@/lib/app-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  PlusCircle,
  BookOpen,
  BarChart3,
  CalendarDays,
  FileText,
  Settings,
  Upload,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'trade-new', label: 'Add Trade', icon: PlusCircle },
  { id: 'journal', label: 'Trade Journal', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'reviews', label: 'Reviews', icon: FileText },
  { id: 'import-export', label: 'Import / Export', icon: Upload },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const { route, navigate } = useRouter();
  const { sidebarOpen, setSidebarOpen } = useApp();

  const activeRoute = route === 'trade-detail' || route === 'trade-edit' ? 'journal' : route;
  const activeRouteKey = route === 'review-daily-new' || route === 'review-daily-edit' || route === 'review-period-new' || route === 'review-period-edit' ? 'reviews' : activeRoute;

  const handleNav = (id: string) => {
    if (id === 'trade-new') {
      navigate('trades/new');
    } else if (id === 'import-export') {
      navigate('settings/import-export');
    } else {
      navigate(id);
    }
  };



  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full flex flex-col transition-all duration-300 ease-in-out',
          'lg:relative lg:z-auto',
          'bg-[#0f0f11] border-r border-white/[0.06]',
          sidebarOpen ? 'w-64' : 'w-0 lg:w-16',
          !sidebarOpen && 'overflow-hidden lg:overflow-visible'
        )}
      >
        {/* Logo / Branding */}
        <div className={cn(
          'flex items-center h-16 px-4 border-b border-white/[0.06] shrink-0',
          !sidebarOpen && 'lg:justify-center lg:px-2'
        )}>
          {sidebarOpen && (
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('dashboard')}>
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[15px] tracking-tight leading-tight">Trading Journal</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] leading-tight">The Disciplined Observer</span>
              </div>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 cursor-pointer" onClick={() => navigate('dashboard')}>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-0.5 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeRouteKey === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    !isActive && 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
                    isActive && 'bg-primary/15 text-primary',
                    !sidebarOpen && 'lg:justify-center lg:px-2'
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary')} />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        <Separator className="bg-white/[0.06]" />

        {/* Bottom controls */}
        <div className={cn(
          'flex items-center p-3 gap-2',
          !sidebarOpen && 'lg:justify-center lg:px-2'
        )}>
          {sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
        </div>
      </aside>

      {/* Expand button when collapsed (desktop only) */}
      {!sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-3 top-5 z-40 hidden lg:flex w-8 h-8 bg-card border border-border rounded-full shadow-sm hover:bg-accent"
          onClick={() => setSidebarOpen(true)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </>
  );
}
