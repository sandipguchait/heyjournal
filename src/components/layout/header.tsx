'use client';

import React from 'react';
import { useRouter } from '@/lib/router';
import { useApp } from '@/lib/app-context';
import { cn } from '@/lib/utils';
import { Menu, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const pageTitles: Record<string, string> = {
  'dashboard': 'Dashboard',
  'trade-new': 'Add Trade',
  'trade-edit': 'Edit Trade',
  'trade-detail': 'Trade Detail',
  'journal': 'Trade Journal',
  'analytics': 'Analytics',
  'calendar': 'Calendar',
  'reviews': 'Reviews',
  'review-daily-new': 'Daily Review',
  'review-daily-edit': 'Daily Review',
  'review-period-new': 'Weekly Review',
  'review-period-edit': 'Period Review',
  'settings': 'Settings',
  'import-export': 'Import / Export',
};

export function AppHeader() {
  const { route, navigate } = useRouter();
  const { sidebarOpen, setSidebarOpen } = useApp();
  const title = pageTitles[route] || 'Heyjournal';

  return (
    <header className="sticky top-0 z-30 h-14 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center h-full px-4 gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="flex-1" />
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => navigate('trades/new')}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Trade</span>
        </Button>
      </div>
    </header>
  );
}
