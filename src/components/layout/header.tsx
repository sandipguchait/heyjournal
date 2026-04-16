'use client';

import React from 'react';
import { useRouter } from '@/lib/router';
import { useApp } from '@/lib/app-context';
import { Menu, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

  const showSearch = ['journal', 'dashboard'].includes(route);

  return (
    <header className="sticky top-0 z-30 h-14 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center h-full px-4 lg:px-6 gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-muted-foreground"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="flex-1" />
        {showSearch && (
          <div className="hidden md:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search trades..."
                className="w-64 h-9 pl-9 bg-secondary/50 border-transparent focus:border-primary/30 rounded-lg text-sm"
                readOnly
                onClick={() => navigate('journal')}
              />
            </div>
          </div>
        )}
        <Button
          size="sm"
          className="gap-1.5 bg-primary hover:bg-primary/90 rounded-lg"
          onClick={() => navigate('trades/new')}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Trade</span>
        </Button>
      </div>
    </header>
  );
}
