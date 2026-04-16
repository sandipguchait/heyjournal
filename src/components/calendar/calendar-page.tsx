'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';
import { LoadingSpinner, ErrorState, CurrencyBadge } from '@/components/common/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
} from 'date-fns';

// --- Types ---

interface CalendarDayData {
  date: string;
  dayOfWeek: number;
  dayName: string;
  isCurrentMonth: boolean;
  tradeCount: number;
  wins: number;
  losses: number;
  pnl: number;
  hasReview: boolean;
  reviewId: string | null;
  trades: Array<{
    id: string;
    symbol: string;
    direction: string;
    pnl: number | null;
    status: string;
    tags: string[];
  }>;
}

interface CalendarSummary {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  reviewsWritten: number;
}

interface CalendarData {
  year: number;
  month: number;
  monthLabel: string;
  days: CalendarDayData[];
  summary: CalendarSummary;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- Main Component ---

export default function CalendarPage() {
  const { navigate } = useRouter();
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const fetchCalendar = useCallback(async (y: number, m: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/calendar?year=${y}&month=${m}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar(year, month);
  }, [year, month, fetchCalendar]);

  const goToPrevMonth = () => setCurrentDate((d) => subMonths(d, 1));
  const goToNextMonth = () => setCurrentDate((d) => addMonths(d, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: CalendarDayData) => {
    if (!day.isCurrentMonth) return;
    navigate(`journal?date=${day.date}`);
  };

  // Chunk days into weeks (rows of 7)
  const weeks: CalendarDayData[][] = [];
  if (data?.days) {
    for (let i = 0; i < data.days.length; i += 7) {
      weeks.push(data.days.slice(i, i + 7));
    }
  }

  // --- Loading ---
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner className="w-8 h-8" />
      </div>
    );
  }

  // --- Error ---
  if (error && !data) {
    return <ErrorState message={error} onRetry={() => fetchCalendar(year, month)} />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* === Month Navigation Header === */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View your trading activity by day
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={goToPrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="min-w-[160px] text-center font-semibold text-sm px-2">
              {data?.monthLabel || format(currentDate, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* === Monthly Summary === */}
      {data?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="gap-4">
            <CardContent className="px-4 pb-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Trades
              </span>
              <div className="flex items-center gap-2 mt-1">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-xl font-bold">{data.summary.totalTrades}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="gap-4">
            <CardContent className="px-4 pb-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Monthly P/L
              </span>
              <div className="mt-1">
                <CurrencyBadge value={data.summary.totalPnl} className="text-xl font-bold" />
              </div>
            </CardContent>
          </Card>
          <Card className="gap-4">
            <CardContent className="px-4 pb-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Win Rate
              </span>
              <div className="flex items-center gap-2 mt-1">
                {data.summary.winRate >= 50 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                <span
                  className={cn(
                    'text-xl font-bold',
                    data.summary.winRate >= 50
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {data.summary.winRate.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="gap-4">
            <CardContent className="px-4 pb-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Reviews Written
              </span>
              <div className="flex items-center gap-2 mt-1">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-xl font-bold">{data.summary.reviewsWritten}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* === Calendar Grid === */}
      <Card className="gap-0 py-0 overflow-hidden">
        <CardContent className="p-0">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className={cn(
                  'text-center text-xs font-semibold py-3 text-muted-foreground',
                  (day === 'Sun' || day === 'Sat') && 'text-orange-500/70 dark:text-orange-400/70'
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="divide-y divide-border">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 divide-x divide-border">
                {week.map((day) => {
                  const dateObj = parseISO(day.date);
                  const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
                  const isTodayDate = isToday(dateObj);
                  const isCurrentMonthDay = day.isCurrentMonth;

                  return (
                    <div
                      key={day.date}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        'min-h-[80px] md:min-h-[100px] p-1.5 md:p-2 transition-colors',
                        isCurrentMonthDay
                          ? 'bg-background hover:bg-accent/50 cursor-pointer'
                          : 'bg-muted/30 cursor-default',
                        isTodayDate && 'ring-2 ring-primary ring-inset bg-primary/5',
                        isWeekend && isCurrentMonthDay && 'bg-muted/20'
                      )}
                    >
                      {/* Day Number */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            'text-xs md:text-sm font-medium',
                            !isCurrentMonthDay && 'text-muted-foreground/50',
                            isTodayDate && 'text-primary font-bold'
                          )}
                        >
                          {format(dateObj, 'd')}
                        </span>
                        {/* Review indicator dot */}
                        {day.hasReview && isCurrentMonthDay && (
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Daily review written" />
                        )}
                      </div>

                      {/* Day Content */}
                      {isCurrentMonthDay && day.tradeCount > 0 && (
                        <div className="space-y-0.5">
                          {/* P/L */}
                          <div
                            className={cn(
                              'text-xs font-semibold truncate',
                              day.pnl > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : day.pnl < 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-muted-foreground'
                            )}
                          >
                            {day.pnl > 0 ? '+' : ''}${day.pnl.toFixed(2)}
                          </div>
                          {/* Trade count badge */}
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-4 px-1 font-normal"
                            >
                              {day.tradeCount} trade{day.tradeCount !== 1 ? 's' : ''}
                            </Badge>
                            {day.wins > 0 && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                {day.wins}W
                              </span>
                            )}
                            {day.losses > 0 && (
                              <span className="text-[10px] text-red-600 dark:text-red-400">
                                {day.losses}L
                              </span>
                            )}
                          </div>
                          {/* Symbol preview (show first 2) */}
                          <div className="hidden md:flex flex-wrap gap-0.5 mt-0.5">
                            {day.trades.slice(0, 2).map((t) => (
                              <span
                                key={t.id}
                                className={cn(
                                  'text-[10px] px-1 rounded font-medium',
                                  t.direction === 'long'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                )}
                              >
                                {t.symbol}
                              </span>
                            ))}
                            {day.trades.length > 2 && (
                              <span className="text-[10px] text-muted-foreground px-0.5">
                                +{day.trades.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* === Legend === */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Daily review written</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-primary ring-2 ring-primary/30" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+$0.00</span>
          <span>Positive P/L</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-red-600 dark:text-red-400 font-semibold">-$0.00</span>
          <span>Negative P/L</span>
        </div>
      </div>
    </div>
  );
}
