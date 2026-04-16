'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';
import { CurrencyBadge, ErrorState } from '@/components/common/loading';
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
  CalendarCheck,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  BarChart3,
  ChevronRight,
  BookOpen,
  Flame,
  Wallet,
  Activity,
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
  if (absVal >= 100000) {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}₹${(absVal / 100000).toFixed(1)}L`;
  }
  if (absVal >= 1000) {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}₹${(absVal / 1000).toFixed(1)}k`;
  }
  if (value >= 0) return `+₹${absVal.toFixed(0)}`;
  return `-₹${absVal.toFixed(0)}`;
}

// --- Sub-components ---

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    closed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    open: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    draft: 'bg-white/[0.06] text-muted-foreground border-white/[0.08]',
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        'capitalize text-[11px] font-medium px-2 py-0.5 rounded-md',
        variants[status] || variants.draft
      )}
    >
      {status}
    </Badge>
  );
}

function DirectionBadge({ direction }: { direction: string }) {
  const isLong = direction === 'long';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wide',
        isLong
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-red-500/15 text-red-400'
      )}
    >
      {isLong ? (
        <ArrowUpRight className="w-3 h-3" />
      ) : (
        <ArrowDownRight className="w-3 h-3" />
      )}
      {direction.toUpperCase()}
    </span>
  );
}

function KpiCard({
  label,
  icon: Icon,
  iconBg,
  iconColor,
  children,
}: {
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#161618] rounded-xl border border-white/[0.06] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            iconBg
          )}
        >
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>
      </div>
      {children}
    </div>
  );
}

function DarkCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'bg-[#161618] rounded-xl border border-white/[0.06] overflow-hidden',
        className
      )}
    >
      {children}
    </div>
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
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load dashboard'
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build chart data from recent trades
  const chartData = useMemo(() => {
    if (!data?.recentTrades) return [];
    const sorted = [...data.recentTrades]
      .filter((t) => t.tradeDate && t.status === 'closed')
      .sort(
        (a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
      );

    let cumulative = 0;
    const seen = new Map<string, number>();

    const result: { date: string; cumulative: number; label: string }[] = [];
    for (const trade of sorted) {
      const dateStr = format(new Date(trade.tradeDate), 'MMM d');
      const pnl = trade.pnl ?? 0;
      const prev = seen.get(dateStr) ?? 0;
      cumulative += pnl;
      seen.set(dateStr, prev + pnl);
      result.push({
        date: dateStr,
        cumulative: Math.round(cumulative * 100) / 100,
        label: dateStr,
      });
    }
    return result;
  }, [data?.recentTrades]);

  // --- Loading Skeleton ---
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* KPI Skeletons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-[#161618] rounded-xl border border-white/[0.06] p-5 animate-pulse"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-3 w-20 bg-white/[0.06] rounded" />
                <div className="w-8 h-8 rounded-lg bg-white/[0.06]" />
              </div>
              <div className="h-7 w-28 bg-white/[0.06] rounded mb-2" />
              <div className="h-3 w-16 bg-white/[0.06] rounded" />
            </div>
          ))}
        </div>
        {/* Chart + Actions Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 bg-[#161618] rounded-xl border border-white/[0.06] p-5 h-[340px] animate-pulse" />
          <div className="bg-[#161618] rounded-xl border border-white/[0.06] p-5 h-[340px] animate-pulse" />
        </div>
        {/* Table Skeleton */}
        <div className="bg-[#161618] rounded-xl border border-white/[0.06] p-5 h-[400px] animate-pulse" />
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
      {/* === Greeting === */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-foreground">
            Welcome back 👋
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here&apos;s your NSE &amp; BSE trading overview
          </p>
        </div>
        <Badge
          variant="outline"
          className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium border-white/[0.08] text-muted-foreground bg-white/[0.03]"
        >
          <Activity className="w-3 h-3" />
          NSE / BSE
        </Badge>
      </div>

      {/* === KPI Cards === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Today P/L */}
        <KpiCard
          label="Today's P/L"
          icon={TrendingUp}
          iconBg={
            kpis.todayPnl >= 0
              ? 'bg-emerald-500/15'
              : 'bg-red-500/15'
          }
          iconColor={
            kpis.todayPnl >= 0
              ? 'text-emerald-400'
              : 'text-red-400'
          }
        >
          <CurrencyBadge value={kpis.todayPnl} className="text-xl md:text-2xl" />
          <p className="text-xs text-muted-foreground">
            {kpis.todayTradeCount} trade{kpis.todayTradeCount !== 1 ? 's' : ''} today
          </p>
        </KpiCard>

        {/* Weekly P/L */}
        <KpiCard
          label="Weekly P/L"
          icon={BarChart3}
          iconBg={
            kpis.weekPnl >= 0
              ? 'bg-emerald-500/15'
              : 'bg-red-500/15'
          }
          iconColor={
            kpis.weekPnl >= 0
              ? 'text-emerald-400'
              : 'text-red-400'
          }
        >
          <CurrencyBadge value={kpis.weekPnl} className="text-xl md:text-2xl" />
          <p className="text-xs text-muted-foreground">This week</p>
        </KpiCard>

        {/* Monthly P/L */}
        <KpiCard
          label="Monthly P/L"
          icon={Wallet}
          iconBg={
            kpis.monthPnl >= 0
              ? 'bg-emerald-500/15'
              : 'bg-red-500/15'
          }
          iconColor={
            kpis.monthPnl >= 0
              ? 'text-emerald-400'
              : 'text-red-400'
          }
        >
          <CurrencyBadge value={kpis.monthPnl} className="text-xl md:text-2xl" />
          <p className="text-xs text-muted-foreground">This month</p>
        </KpiCard>

        {/* Win Rate & Streak */}
        <KpiCard
          label="Win Rate"
          icon={Target}
          iconBg="bg-purple-500/15"
          iconColor="text-purple-400"
        >
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'text-xl md:text-2xl font-semibold',
                kpis.winRate >= 50
                  ? 'text-emerald-400'
                  : 'text-red-400'
              )}
            >
              {kpis.winRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {kpis.totalTrades} trades
            {kpis.streak.count > 0 && (
              <span
                className={cn(
                  'ml-1.5 inline-flex items-center gap-0.5',
                  kpis.streak.type === 'win'
                    ? 'text-emerald-400'
                    : 'text-red-400'
                )}
              >
                <Flame className="w-3 h-3" />
                {kpis.streak.count}
                {kpis.streak.type === 'win' ? 'W' : 'L'}
              </span>
            )}
          </p>
        </KpiCard>
      </div>

      {/* === Missing Review Reminder === */}
      {missingReviews.length > 0 && (
        <div className="bg-amber-500/[0.08] rounded-xl border border-amber-500/20 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-amber-300">
                Missing Daily Review{missingReviews.length > 1 ? 's' : ''}
              </h3>
              <p className="text-xs text-amber-400/70 mt-0.5">
                You have unreviewed trading day
                {missingReviews.length > 1 ? 's' : ''} for the past week.
                Reviewing your trades helps improve performance.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {missingReviews.slice(0, 5).map((dateStr) => {
                  const parsed = parseISO(dateStr);
                  const label = isValid(parsed)
                    ? format(parsed, 'EEE, MMM d')
                    : dateStr;
                  return (
                    <Badge
                      key={dateStr}
                      variant="outline"
                      className="text-[11px] border-amber-500/20 text-amber-400/80 bg-amber-500/[0.06]"
                    >
                      {label}
                    </Badge>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-3">
                {missingReviews
                  .slice(0, 2)
                  .map((dateStr) => (
                    <Button
                      key={dateStr}
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 border-amber-500/20 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
                      onClick={() => navigate('reviews/daily')}
                    >
                      <CalendarCheck className="w-3 h-3 mr-1.5" />
                      Review{' '}
                      {(() => {
                        const p = parseISO(dateStr);
                        return isValid(p) ? format(p, 'MMM d') : dateStr;
                      })()}
                    </Button>
                  ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 text-amber-400/60 hover:text-amber-300 hover:bg-amber-500/10"
                  onClick={() => navigate('reviews')}
                >
                  View all
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === Chart + Quick Action === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* P/L Chart */}
        <DarkCard className="lg:col-span-2">
          <div className="px-5 pt-5 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Cumulative P/L
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Based on recent closed trades &middot; NSE &amp; BSE
                </p>
              </div>
              {chartData.length > 0 && (
                <CurrencyBadge
                  value={
                    chartData[chartData.length - 1]?.cumulative ?? 0
                  }
                  className="text-sm"
                />
              )}
            </div>
          </div>
          <div className="px-2 pb-2">
            {chartData.length > 1 ? (
              <ChartContainer
                config={chartConfig}
                className="h-[260px] w-full"
              >
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="pnlGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#10B981"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor="#10B981"
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(255,255,255,0.04)"
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                    stroke="rgba(255,255,255,0.15)"
                    tick={{ fill: 'rgba(255,255,255,0.4)' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                    tickFormatter={(v: number) =>
                      formatCurrencyCompact(v)
                    }
                    stroke="rgba(255,255,255,0.15)"
                    tick={{ fill: 'rgba(255,255,255,0.4)' }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="!bg-[#1e1e22] !border-white/[0.08] !text-foreground"
                        formatter={(value: number) => (
                          <span className="font-mono font-medium text-sm">
                            <CurrencyBadge value={value} />
                          </span>
                        )}
                        labelFormatter={(label) => (
                          <span className="text-xs text-muted-foreground">
                            {label}
                          </span>
                        )}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#10B981"
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
          </div>
        </DarkCard>

        {/* Quick Actions */}
        <DarkCard className="p-5">
          <div className="flex flex-col h-full gap-5">
            <div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center mb-3">
                <Plus className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Quick Actions
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Log a new trade or review your day.
              </p>
            </div>
            <div className="space-y-2.5 flex-1 flex flex-col justify-center">
              <Button
                className="w-full justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                onClick={() => navigate('trades/new')}
              >
                <Plus className="w-4 h-4" />
                Add New Trade
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center gap-2 border-white/[0.08] hover:bg-white/[0.04] rounded-lg"
                onClick={() => navigate('reviews/daily')}
              >
                <CalendarCheck className="w-4 h-4" />
                Write Daily Review
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-center gap-2 text-sm text-muted-foreground hover:text-foreground rounded-lg"
                onClick={() => navigate('journal')}
              >
                <BookOpen className="w-4 h-4" />
                View Trade Journal
                <ChevronRight className="w-3 h-3 ml-auto" />
              </Button>
            </div>
            {kpis.openTrades > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-white/[0.06]">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {kpis.openTrades} open position
                {kpis.openTrades !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </DarkCard>
      </div>

      {/* === Recent Trades Table === */}
      <DarkCard>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Recent Trades
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your latest NSE &amp; BSE trading activity
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-white/[0.08] hover:bg-white/[0.04] gap-1 rounded-lg"
            onClick={() => navigate('journal')}
          >
            View all
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>

        {recentTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
              <BarChart3 className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No trades yet
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Start logging your NSE/BSE trades to see them here.
            </p>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              onClick={() => navigate('trades/new')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add your first trade
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider h-10">
                    Date
                  </TableHead>
                  <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider h-10">
                    Symbol
                  </TableHead>
                  <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider h-10 hidden sm:table-cell">
                    Direction
                  </TableHead>
                  <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider h-10 text-right">
                    P/L
                  </TableHead>
                  <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider h-10 hidden md:table-cell text-right">
                    Return
                  </TableHead>
                  <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider h-10 hidden lg:table-cell">
                    Strategy
                  </TableHead>
                  <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider h-10">
                    Status
                  </TableHead>
                  <TableHead className="w-8 h-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTrades.map((trade) => {
                  const dateParsed = parseISO(trade.tradeDate);
                  const dateLabel = isValid(dateParsed)
                    ? format(dateParsed, 'MMM d')
                    : trade.tradeDate;
                  const pnlValue = trade.pnl ?? 0;

                  return (
                    <TableRow
                      key={trade.id}
                      className="border-b border-white/[0.03] cursor-pointer hover:bg-white/[0.03] transition-colors"
                      onClick={() => navigate(`trades/${trade.id}`)}
                    >
                      <TableCell className="text-xs text-muted-foreground py-3">
                        {dateLabel}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-foreground">
                            {trade.symbol}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium hidden lg:inline">
                            {trade.symbol === 'NIFTY 50' || trade.symbol === 'BANKNIFTY'
                              ? 'NSE'
                              : trade.symbol === 'SENSEX'
                                ? 'BSE'
                                : 'NSE'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 hidden sm:table-cell">
                        <DirectionBadge direction={trade.direction} />
                      </TableCell>
                      <TableCell className="text-right py-3">
                        {trade.status === 'closed' ? (
                          <CurrencyBadge
                            value={pnlValue}
                            className="text-sm font-semibold"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            &mdash;
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-3 hidden md:table-cell">
                        {trade.pnlPercent != null && trade.status === 'closed' ? (
                          <span
                            className={cn(
                              'text-xs font-medium',
                              trade.pnlPercent >= 0
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            )}
                          >
                            {trade.pnlPercent >= 0 ? '+' : ''}
                            {trade.pnlPercent.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            &mdash;
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 hidden lg:table-cell">
                        {trade.strategy ? (
                          <span className="text-xs text-muted-foreground">
                            {trade.strategy}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">
                            &mdash;
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusBadge status={trade.status} />
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DarkCard>

      {/* === Footer note === */}
      <p className="text-center text-[11px] text-muted-foreground/50 pb-2">
        Heyjournal &middot; Indian Stock Market Trading Journal &middot; NSE / BSE
      </p>
    </div>
  );
}
