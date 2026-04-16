'use client'

import { AppProvider } from '@/lib/app-context';
import { ThemeProvider } from '@/lib/theme-provider';
import { HashRouter } from '@/lib/router';
import { AppRouter } from '@/components/layout/app-router';

export default function Home() {
  return (
    <ThemeProvider>
      <AppProvider>
        <HashRouter>
          <AppRouter />
        </HashRouter>
      </AppProvider>
    </ThemeProvider>
  );
}
