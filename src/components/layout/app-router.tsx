'use client';

import React, { Suspense } from 'react';
import { useRouter } from '@/lib/router';
import { AppSidebar } from '@/components/layout/sidebar';
import { AppHeader } from '@/components/layout/header';
import { LoadingSpinner } from '@/components/common/loading';

// Lazy-loaded page components
import DashboardPage from '@/components/dashboard/dashboard-page';
import TradeFormPage from '@/components/trades/trade-form-page';
import TradeDetailPage from '@/components/trades/trade-detail-page';
import JournalListPage from '@/components/trades/journal-list-page';
import AnalyticsPage from '@/components/analytics/analytics-page';
import CalendarPage from '@/components/calendar/calendar-page';
import ReviewsPage from '@/components/reviews/reviews-page';
import DailyReviewPage from '@/components/reviews/daily-review-page';
import PeriodReviewPage from '@/components/reviews/period-review-page';
import SettingsPage from '@/components/settings/settings-page';
import ImportExportPage from '@/components/settings/import-export-page';

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner />
    </div>
  );
}

export function AppRouter() {
  const { route, params } = useRouter();

  const renderPage = () => {
    switch (route) {
      case 'dashboard':
        return <DashboardPage />;
      case 'trade-new':
        return <TradeFormPage />;
      case 'trade-edit':
        return <TradeFormPage tradeId={params.id} />;
      case 'trade-detail':
        return <TradeDetailPage tradeId={params.id} />;
      case 'journal':
        return <JournalListPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'reviews':
        return <ReviewsPage />;
      case 'review-daily-new':
        return <DailyReviewPage />;
      case 'review-daily-edit':
        return <DailyReviewPage reviewId={params.id} />;
      case 'review-period-new':
        return <PeriodReviewPage periodType={params.periodType || 'weekly'} />;
      case 'review-period-edit':
        return <PeriodReviewPage reviewId={params.id} />;
      case 'settings':
        return <SettingsPage />;
      case 'import-export':
        return <ImportExportPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<PageFallback />}>
            {renderPage()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
