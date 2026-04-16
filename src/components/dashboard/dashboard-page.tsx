'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';
import { CurrencyBadge, LoadingSpinner, ErrorState } from '@/components/common/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  CalendarCheck,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  BarChart3,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

// --- Types ---

interface Kpis {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  todayPnl: number;
  todayTradeCount: number;
  weekPnl: number;
  monthPnl: number;
  openTrades: number;
  streak: { type: 'win' | 'loss' | 'none'; count: number };
}

interface RecentTrade {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number | null;
  pnl: number | null;
  pnlPercent: number | null;
  tradeDate: string;
  status: 'closed' | 'open' | 'draft';
  strategy: string | null;
}

interface DashboardData {
  kpis: Kpis;
  recentTrades: RecentTrade[];
  missingReviews: string[];
}

// --- Chart Config ---

const chartConfig = {
  cumulative: {
    label: 'Cumulative P/L',
    color: 'hsl(160, 84%, 39%)',
  },
} satisfies ChartConfig;

// --- Helpers ---

function formatCurrencyCompact(value: number): string {
  const absVal = Math.abs(value);
  if (absVal >= 1000) {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}$${(absVal / 1000).toFixed(1)}k`;
  }
  if (value >= 0) return `+$${absVal.toFixed(2)}`;
  return `-$${absVal.toFixed(2)}`;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    closed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    draft: 'bg-muted text-muted-foreground',
  };
  return (
    <Badge variant="outline" className={cn('capitalize text-xs', variants[status] || variants.draft)}>
      {status}
    </Badge>
  );
}

function DirectionBadge({ direction }: { direction: string }) {
  const isLong = direction === 'long';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded',
        isLong
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      )}
    >
      {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {direction.toUpperCase()}
    </span>
  );
}

// --- Main Component ---

export default function DashboardPage() {
  const { navigate } = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDashboard();
    return () => { cancelled = true; };
  }, []);

  // Build chart data from recent trades
  const chartData = useMemo(() => {
    if (!data?.recentTrades) return [];
    const sorted = [...data.recentTrades]
      .filter((t) => t.tradeDate && t.status === 'closed')
      .sort((a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime());

    let cumulative = 0;
    const seen = new Map<string, number>();

    const result: { date: string; cumulative: number; label: string }[] = [];
    for (const trade of sorted) {
      const dateStr = format(new Date(trade.tradeDate), 'MMM d');
      const pnl = trade.pnl ?? 0;
      const prev = seen.get(dateStr) ?? 0;
      cumulative += pnl;
      seen.set(dateStr, prev + pnl);
      result.push({ date: dateStr, cumulative: Math.round(cumulative * 100) / 100, label: dateStr });
    }
    return result;
  }, [data?.recentTrades]);

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner className="w-8 h-8" />
      </div>
    );
  }

  // --- Error ---
  if (error || !data) {
    return (
      <ErrorState
        message={error || 'Unable to load dashboard data'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const { kpis, recentTrades, missingReviews } = data;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* === KPI Cards === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today P/L */}
        <Card className="gap-4">
          <CardContent className="px-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today&apos;s P/L</span>
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                kpis.todayPnl >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
              )}>
                {kpis.todayPnl >= 0
                  ? <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  : <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                }
              </div>
            </div>
            <CurrencyBadge value={kpis.todayPnl} className="text-2xl" />
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.todayTradeCount} trade{kpis.todayTradeCount !== 1 ? 's' : ''} today
            </p>
          </CardContent>
        </Card>

        {/* Weekly P/L */}
        <Card className="gap-4">
          <CardContent className="px-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Weekly P/L</span>
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                kpis.weekPnl >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
              )}>
                <BarChart3 className={cn(
                  'w-4 h-4',
                  kpis.weekPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )} />
              </div>
            </div>
            <CurrencyBadge value={kpis.weekPnl} className="text-2xl" />
            <p className="text-xs text-muted-foreground mt-1">This week</p>
          </CardContent>
        </Card>

        {/* Monthly P/L */}
        <Card className="gap-4">
          <CardContent className="px-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monthly P/L</span>
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                kpis.monthPnl >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
              )}>
                <TrendingUp className={cn(
                  'w-4 h-4',
                  kpis.monthPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )} />
              </div>
            </div>
            <CurrencyBadge value={kpis.monthPnl} className="text-2xl" />
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        {/* Win Rate & Total Trades */}
        <Card className="gap-4">
          <CardContent className="px-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Win Rate</span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                'text-2xl font-semibold',
                kpis.winRate >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}>
                {kpis.winRate.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.totalTrades} total trades &middot;{' '}
              <span className={cn(
                kpis.streak.type === 'win' ? 'text-emerald-600 dark:text-emerald-400' :
                kpis.streak.type === 'loss' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
              )}>
                {kpis.streak.count > 0 ? `${kpis.streak.count}${kpis.streak.type === 'win' ? 'W' : 'L'} streak` : 'No streak'}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* === Missing Review Reminder === */}
      {missingReviews.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 gap-4">
          <CardContent className="px-4 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Missing Daily Review{missingReviews.length > 1 ? 's' : ''}
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  You have unreviewed trading day{missingReviews.length > 1 ? 's' : ''} for the past week. Reviewing your trades helps improve performance.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {missingReviews.slice(0, 5).map((dateStr) => {
                    const parsed = parseISO(dateStr);
                    const label = isValid(parsed) ? format(parsed, 'EEE, MMM d') : dateStr;
                    return (
                      <Badge key={dateStr} variant="outline" className="text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
                        {label}
                      </Badge>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-3">
                  {missingReviews.map((dateStr) => (
                    <Button
                      key={dateStr}
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                      onClick={() => navigate('reviews/daily')}
                    >
                      <CalendarCheck className="w-3 h-3 mr-1" />
                      Review {(() => { const p = parseISO(dateStr); return isValid(p) ? format(p, 'MMM d') : dateStr; })()}
                    </Button>
                  )).slice(0, 2)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                onClick={() => navigate('reviews')}
              >
                View all
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* === Chart + Quick Action === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* P/L Chart */}
        <Card className="lg:col-span-2 gap-0 py-0 overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold">Cumulative P/L</CardTitle>
            <CardDescription>Based on recent closed trades</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {chartData.length > 1 ? (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                    tickFormatter={(v: number) => formatCurrencyCompact(v)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value: number) => (
                          <span className="font-mono font-medium text-sm">
                            <CurrencyBadge value={value} />
                          </span>
                        )}
                        labelFormatter={(label) => (
                          <span className="text-xs text-muted-foreground">{label}</span>
                        )}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="hsl(160, 84%, 39%)"
                    strokeWidth={2}
                    fill="url(#pnlGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                Not enough closed trades to show the chart
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card className="gap-4 h-full">
            <CardContent className="px-4 pb-4 flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">Quick Actions</h3>
                <p className="text-xs text-muted-foreground mt-1">Log a new trade or review your day.</p>
              </div>
              <div className="space-y-2 mt-4">
                <Button className="w-full justify-center gap-2" onClick={() => navigate('trades/new')}>
                  <Plus className="w-4 h-4" />
                  Add New Trade
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => navigate('reviews/daily')}
                >
                  <CalendarCheck className="w-4 h-4" />
                  Write Daily Review
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-center gap-2 text-sm"
                  onClick={() => navigate('journal')}
                >
                  <BookOpen className="w-4 h-4" />
                  View Trade Journal
                  <ChevronRight className="w-3 h-3 ml-auto" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* === Recent Trades Table === */}
      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-sm font-semibold">Recent Trades</CardTitle>
            <CardDescription>Your latest trading activity</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => navigate('journal')}
          >
            View all
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {recentTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <BarChart3 className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No trades yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Start logging your trades to see them here.</p>
              <Button size="sm" onClick={() => navigate('trades/new')}>
                <Plus className="w-4 h-4 mr-1" />
                Add your first trade
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Symbol</TableHead>
                  <TableHead className="text-xs">Direction</TableHead>
                  <TableHead className="text-xs">P/L</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTrades.map((trade) => {
                  const dateParsed = parseISO(trade.tradeDate);
                  const dateLabel = isValid(dateParsed) ? format(dateParsed, 'MMM d, yyyy') : trade.tradeDate;
                  const pnlValue = trade.pnl ?? 0;

                  return (
                    <TableRow
                      key={trade.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`trades/${trade.id}`)}
                    >
                      <TableCell className="text-xs text-muted-foreground py-3">
                        {dateLabel}
                      </TableCell>
                      <TableCell className="font-semibold text-sm py-3">
                        {trade.symbol}
                      </TableCell>
                      <TableCell className="py-3">
                        <DirectionBadge direction={trade.direction} />
                      </TableCell>
                      <TableCell className="py-3">
                        {trade.status === 'closed' ? (
                          <CurrencyBadge value={pnlValue} className="text-sm" />
                        ) : (
                          <span className="text-xs text-muted-foreground">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusBadge status={trade.status} />
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
