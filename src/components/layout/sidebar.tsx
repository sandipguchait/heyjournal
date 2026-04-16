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
  Calendar,
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
import { useTheme } from '@/lib/theme-provider';
import { Sun, Moon, Monitor } from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'trade-new', label: 'Add Trade', icon: PlusCircle },
  { id: 'journal', label: 'Trade Journal', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'reviews', label: 'Reviews', icon: FileText },
  { id: 'import-export', label: 'Import / Export', icon: Upload },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const { route, navigate } = useRouter();
  const { sidebarOpen, setSidebarOpen } = useApp();
  const { theme, setTheme } = useTheme();

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

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out',
          'lg:relative lg:z-auto',
          sidebarOpen ? 'w-64' : 'w-0 lg:w-16',
          !sidebarOpen && 'overflow-hidden lg:overflow-visible'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center h-16 px-4 border-b border-border shrink-0',
          !sidebarOpen && 'lg:justify-center lg:px-2'
        )}>
          {sidebarOpen && (
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('dashboard')}>
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight">Heyjournal</span>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center cursor-pointer" onClick={() => navigate('dashboard')}>
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeRouteKey === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-accent text-accent-foreground',
                    !sidebarOpen && 'lg:justify-center lg:px-2'
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        <Separator />

        {/* Bottom controls */}
        <div className={cn(
          'flex items-center p-3 gap-2',
          !sidebarOpen && 'lg:justify-center lg:px-2'
        )}>
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            title={`Theme: ${theme}`}
          >
            <ThemeIcon className="w-4 h-4" />
          </Button>
          {sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
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
