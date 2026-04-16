'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';
import { LoadingSpinner, ErrorState, CurrencyBadge, formatCurrency } from '@/components/common/loading';
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
  parseISO,
  isToday,
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

const darkCard = 'bg-[#161618] rounded-xl border border-white/[0.06] p-5';

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

  useEffect(() => { fetchCalendar(year, month); }, [year, month, fetchCalendar]);

  const goToPrevMonth = () => setCurrentDate((d) => { const prev = new Date(d); prev.setMonth(prev.getMonth() - 1); return prev; });
  const goToNextMonth = () => setCurrentDate((d) => { const next = new Date(d); next.setMonth(next.getMonth() + 1); return next; });
  const goToToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: CalendarDayData) => {
    if (!day.isCurrentMonth) return;
    navigate(`journal?date=${day.date}`);
  };

  // Chunk days into weeks
  const weeks: CalendarDayData[][] = [];
  if (data?.days) {
    for (let i = 0; i < data.days.length; i += 7) {
      weeks.push(data.days.slice(i, i + 7));
    }
  }

  if (loading && !data) {
    return <div className="flex items-center justify-center h-96"><LoadingSpinner className="w-8 h-8" /></div>;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={() => fetchCalendar(year, month)} />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* === Month Navigation === */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">View your trading activity by day</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday} className="bg-white/[0.05] border-white/[0.08] rounded-xl hover:bg-white/[0.08]">
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-9 w-9 bg-white/[0.05] border-white/[0.08] rounded-xl hover:bg-white/[0.08]" onClick={goToPrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="min-w-[180px] text-center font-semibold text-sm px-2">
              {data?.monthLabel || format(currentDate, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" className="h-9 w-9 bg-white/[0.05] border-white/[0.08] rounded-xl hover:bg-white/[0.08]" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* === Monthly Summary Cards === */}
      {data?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={darkCard}>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Trades</span>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold">{data.summary.totalTrades}</span>
            </div>
          </div>
          <div className={darkCard}>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly P/L</span>
            <div className="mt-2">
              <CurrencyBadge value={data.summary.totalPnl} className="text-xl font-bold" />
            </div>
          </div>
          <div className={darkCard}>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Win Rate</span>
            <div className="flex items-center gap-2 mt-2">
              {data.summary.winRate >= 50 ? (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
              )}
              <span className={cn('text-xl font-bold', data.summary.winRate >= 50 ? 'text-emerald-400' : 'text-red-400')}>
                {data.summary.winRate.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className={darkCard}>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reviews Written</span>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold">{data.summary.reviewsWritten}</span>
            </div>
          </div>
        </div>
      )}

      {/* === Calendar Grid === */}
      <div className="bg-[#161618] rounded-xl border border-white/[0.06] overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-white/[0.06]">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className={cn(
                'text-center text-xs font-semibold py-3 text-muted-foreground',
                (day === 'Sun' || day === 'Sat') && 'text-primary/60'
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="divide-y divide-white/[0.04]">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 divide-x divide-white/[0.04]">
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
                      isCurrentMonthDay && 'bg-[#161618] hover:bg-white/[0.03] cursor-pointer',
                      !isCurrentMonthDay && 'bg-[#111113] cursor-default',
                      isWeekend && isCurrentMonthDay && 'bg-[#131315]',
                      isWeekend && !isCurrentMonthDay && 'bg-[#0e0e10]',
                      isTodayDate && 'ring-2 ring-primary ring-inset bg-primary/5'
                    )}
                  >
                    {/* Day Number */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn('text-xs md:text-sm font-medium', !isCurrentMonthDay && 'text-muted-foreground/40', isTodayDate && 'text-primary font-bold')}>
                        {format(dateObj, 'd')}
                      </span>
                      {day.hasReview && isCurrentMonthDay && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Daily review written" />
                      )}
                    </div>

                    {/* Day Content */}
                    {isCurrentMonthDay && day.tradeCount > 0 && (
                      <div className="space-y-0.5">
                        {/* P/L */}
                        <div className={cn('text-xs font-semibold truncate', day.pnl > 0 ? 'text-emerald-400' : day.pnl < 0 ? 'text-red-400' : 'text-muted-foreground')}>
                          {day.pnl > 0 ? '+' : ''}{formatCurrency(day.pnl)}
                        </div>
                        {/* Trade count & W/L */}
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-[10px] h-4 px-1 font-normal bg-white/[0.05] border-0">
                            {day.tradeCount}
                          </Badge>
                          {day.wins > 0 && <span className="text-[10px] text-emerald-400">{day.wins}W</span>}
                          {day.losses > 0 && <span className="text-[10px] text-red-400">{day.losses}L</span>}
                        </div>
                        {/* Symbol preview */}
                        <div className="hidden md:flex flex-wrap gap-0.5 mt-0.5">
                          {day.trades.slice(0, 2).map((t) => (
                            <span key={t.id} className={cn('text-[10px] px-1 rounded font-medium', t.direction === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}>
                              {t.symbol}
                            </span>
                          ))}
                          {day.trades.length > 2 && (
                            <span className="text-[10px] text-muted-foreground px-0.5">+{day.trades.length - 2}</span>
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
      </div>

      {/* === Legend === */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Daily review written</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border-2 border-primary" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-400 font-semibold text-sm">+₹0.00</span>
          <span>Profit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-red-400 font-semibold text-sm">-₹0.00</span>
          <span>Loss</span>
        </div>
      </div>
    </div>
  );
}
