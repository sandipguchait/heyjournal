'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';
import {
  CurrencyBadge,
  LoadingSpinner,
  ErrorState,
  formatCurrency,
} from '@/components/common/loading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  ArrowUpDown,
  CalendarIcon,
  Filter,
  X,
  Award,
  AlertTriangle,
  Flame,
  Clock,
  Trophy,
  Activity,
  Zap,
  IndianRupee,
} from 'lucide-react';
import {
  format,
  parseISO,
  isValid,
  startOfWeek,
  startOfMonth,
  startOfYear,
  startOfQuarter,
  endOfDay,
} from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyticsKpi {
  winRate: number;
  avgWinner: number;
  avgLoser: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
  totalTrades: number;
  totalPnl: number;
  winningTrades: number;
  losingTrades: number;
  grossProfit: number;
  grossLoss: number;
  avgRMultiple: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  avgHoldMinutes: number | null;
}

interface PnlTimeSeriesPoint { date: string; pnl: number; }
interface EquityCurvePoint { date: string; cumulative: number; }

interface StrategyPerformance {
  name: string;
  tradeCount: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

interface DayPerformance { day: string; pnl: number; tradeCount: number; winRate: number; }
interface TimePerformance { hour: string; pnl: number; tradeCount: number; winRate: number; }

interface AnalyticsData {
  kpi: AnalyticsKpi;
  pnlTimeSeries: PnlTimeSeriesPoint[];
  equityCurve: EquityCurvePoint[];
  strategyPerformance: StrategyPerformance[];
  dayPerformance: DayPerformance[];
  timePerformance: TimePerformance[];
}

interface FilterOptions {
  strategies: string[];
  symbols: string[];
  accounts: string[];
  marketTypes: string[];
  tags: { id: string; name: string }[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const DATE_PRESETS = [
  { label: 'This Week', value: 'thisWeek' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'This Quarter', value: 'thisQuarter' },
  { label: 'This Year', value: 'thisYear' },
  { label: 'All Time', value: 'allTime' },
] as const;

type DatePreset = (typeof DATE_PRESETS)[number]['value'];
type SortField = 'name' | 'tradeCount' | 'winRate' | 'totalPnl' | 'avgPnl';
type SortDir = 'asc' | 'desc';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  return formatCurrency(value);
}

function getDateRange(preset: DatePreset): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'thisWeek': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
    case 'thisMonth': return { from: startOfMonth(now), to: endOfDay(now) };
    case 'thisQuarter': return { from: startOfQuarter(now), to: endOfDay(now) };
    case 'thisYear': return { from: startOfYear(now), to: endOfDay(now) };
    case 'allTime': return { from: new Date('2020-01-01'), to: endOfDay(now) };
  }
}

function formatDateParam(d: Date | undefined): string | null {
  if (!d) return null;
  return format(d, 'yyyy-MM-dd');
}

// ─── Dark Card wrapper ──────────────────────────────────────────────────────

const darkCard = 'bg-[#161618] rounded-xl border border-white/[0.06] p-5';
const darkCardNoPad = 'bg-[#161618] rounded-xl border border-white/[0.06]';

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; dataKey: string; color: string }>;
  label?: string;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#1e1e20] px-3 py-2 shadow-xl text-xs">
      <p className="font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono font-semibold text-foreground">
            {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Skeletons ──────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={cn(darkCard)}>
          <Skeleton className="h-3 w-20 mb-2 bg-white/[0.06]" />
          <Skeleton className="h-7 w-28 mb-1 bg-white/[0.06]" />
          <Skeleton className="h-3 w-16 bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className={cn(darkCardNoPad, 'overflow-hidden')}>
      <div className="p-5 pb-2">
        <Skeleton className="h-4 w-32 mb-1 bg-white/[0.06]" />
        <Skeleton className="h-3 w-48 bg-white/[0.06]" />
      </div>
      <div className="px-5 pb-5">
        <Skeleton className="h-[260px] w-full bg-white/[0.06]" />
      </div>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  colorClass,
  subtext,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  colorClass: string;
  subtext?: string;
}) {
  return (
    <div className={cn(darkCard)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorClass)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router = useRouter();

  const [periodType, setPeriodType] = useState<'weekly' | 'monthly' | 'annual'>('monthly');
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [strategyFilter, setStrategyFilter] = useState('all');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');
  const [marketTypeFilter, setMarketTypeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>('totalPnl');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ── Fetch filter options ──
  useEffect(() => {
    async function fetchOptions() {
      try {
        const res = await fetch('/api/trades?limit=500');
        if (!res.ok) return;
        const json = await res.json();
        const trades = json.trades || [];
        const strategies = [...new Set(trades.map((t: { strategy?: string }) => t.strategy).filter(Boolean))] as string[];
        const accounts = [...new Set(trades.map((t: { accountName?: string }) => t.accountName).filter(Boolean))] as string[];
        const marketTypes = [...new Set(trades.map((t: { marketType?: string }) => t.marketType).filter(Boolean))] as string[];
        setFilterOptions({ strategies, symbols: [], accounts, marketTypes, tags: [] });
      } catch { /* ignore */ }
    }
    fetchOptions();
  }, []);

  useEffect(() => {
    async function fetchTags() {
      try {
        const res = await fetch('/api/tags');
        if (!res.ok) return;
        const json = await res.json();
        setFilterOptions((prev) => (prev ? { ...prev, tags: json.tags || [] } : prev));
      } catch { /* ignore */ }
    }
    fetchTags();
  }, []);

  // ── Fetch analytics ──
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('periodType', periodType);

      if (useCustomDate && customFrom) params.set('dateFrom', formatDateParam(customFrom) || '');
      if (useCustomDate && customTo) params.set('dateTo', formatDateParam(customTo) || '');
      else {
        const { from, to } = getDateRange(datePreset);
        params.set('dateFrom', formatDateParam(from) || '');
        params.set('dateTo', formatDateParam(to) || '');
      }

      if (strategyFilter !== 'all') params.set('strategy', strategyFilter);
      if (symbolFilter.trim()) params.set('symbol', symbolFilter.trim());
      if (accountFilter !== 'all') params.set('accountName', accountFilter);
      if (marketTypeFilter !== 'all') params.set('marketType', marketTypeFilter);
      if (tagFilter !== 'all') params.set('tagId', tagFilter);

      const res = await fetch(`/api/analytics?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [periodType, datePreset, useCustomDate, customFrom, customTo, strategyFilter, symbolFilter, accountFilter, marketTypeFilter, tagFilter]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // ── Derived ──
  const sortedStrategies = useMemo(() => {
    if (!data?.strategyPerformance) return [];
    return [...data.strategyPerformance].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [data?.strategyPerformance, sortField, sortDir]);

  const orderedDayPerformance = useMemo(() => {
    if (!data?.dayPerformance) return [];
    return DAY_ORDER.map((day) => data.dayPerformance.find((d) => d.day === day) || { day, pnl: 0, tradeCount: 0, winRate: 0 });
  }, [data?.dayPerformance]);

  const pnlChartData = useMemo(() => {
    if (!data?.pnlTimeSeries) return [];
    return data.pnlTimeSeries.map((p) => ({ ...p, label: isValid(parseISO(p.date)) ? format(parseISO(p.date), 'MMM d') : p.date }));
  }, [data?.pnlTimeSeries]);

  const equityChartData = useMemo(() => {
    if (!data?.equityCurve) return [];
    return data.equityCurve.map((p) => ({ ...p, label: isValid(parseISO(p.date)) ? format(parseISO(p.date), 'MMM d') : p.date }));
  }, [data?.equityCurve]);

  const timeChartData = useMemo(() => {
    if (!data?.timePerformance) return [];
    return data.timePerformance
      .map((p) => ({ ...p, label: `${p.hour}:00`, hourNum: parseInt(p.hour, 10) }))
      .sort((a, b) => a.hourNum - b.hourNum);
  }, [data?.timePerformance]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const activeFilterCount = [
    strategyFilter !== 'all', symbolFilter.trim() !== '', accountFilter !== 'all',
    marketTypeFilter !== 'all', tagFilter !== 'all', useCustomDate,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setStrategyFilter('all'); setSymbolFilter(''); setAccountFilter('all');
    setMarketTypeFilter('all'); setTagFilter('all'); setUseCustomDate(false);
    setCustomFrom(undefined); setCustomTo(undefined);
  };

  // ── Loading ──
  if (loading && !data) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 bg-white/[0.06]" />
          <Skeleton className="h-9 w-32 bg-white/[0.06]" />
        </div>
        <Skeleton className="h-10 w-full bg-white/[0.06]" />
        <KpiSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton /><ChartSkeleton /><ChartSkeleton /><ChartSkeleton />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return <div className="p-4 md:p-6 max-w-7xl mx-auto w-full"><ErrorState message={error} onRetry={fetchAnalytics} /></div>;
  }

  if (!data) return null;
  const { kpi } = data;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Deep dive into your trading performance</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAnalytics}
          disabled={loading}
          className="bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.08] rounded-xl"
        >
          {loading ? <LoadingSpinner className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      {/* ── Period Toggle ── */}
      <Tabs value={periodType} onValueChange={(v) => setPeriodType(v as 'weekly' | 'monthly' | 'annual')}>
        <TabsList className="bg-[#161618] border border-white/[0.06] rounded-xl p-1">
          <TabsTrigger value="weekly" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Clock className="w-4 h-4 mr-1" /> Weekly
          </TabsTrigger>
          <TabsTrigger value="monthly" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CalendarIcon className="w-4 h-4 mr-1" /> Monthly
          </TabsTrigger>
          <TabsTrigger value="annual" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="w-4 h-4 mr-1" /> Annual
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── Filters Bar ── */}
      <div className={cn(darkCardNoPad, 'overflow-hidden')}>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filters</span>
            {activeFilterCount > 0 && (
              <Badge className="bg-primary/15 text-primary text-xs border-0">{activeFilterCount}</Badge>
            )}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-6 text-xs ml-auto text-muted-foreground hover:text-foreground" onClick={clearFilters}>
                <X className="w-3 h-3 mr-1" /> Clear all
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Date Range</span>
              <Select value={useCustomDate ? 'custom' : datePreset} onValueChange={(v) => {
                if (v === 'custom') setUseCustomDate(true);
                else { setUseCustomDate(false); setDatePreset(v as DatePreset); }
              }}>
                <SelectTrigger size="sm" className="w-[140px] bg-white/[0.03] border-white/[0.08] rounded-lg h-8">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {useCustomDate && (
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('h-8 justify-start text-left font-normal bg-white/[0.03] border-white/[0.08] rounded-lg', !customFrom && 'text-muted-foreground')}>
                    <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                    {customFrom && customTo ? `${format(customFrom, 'MMM d')} - ${format(customTo, 'MMM d, yy')}` : 'Pick dates'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="range" selected={{ from: customFrom, to: customTo }} onSelect={(range) => { setCustomFrom(range?.from); setCustomTo(range?.to); if (range?.to) setCalendarOpen(false); }} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
            )}

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Strategy</span>
              <Select value={strategyFilter} onValueChange={setStrategyFilter}>
                <SelectTrigger size="sm" className="w-[140px] bg-white/[0.03] border-white/[0.08] rounded-lg h-8">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Strategies</SelectItem>
                  {filterOptions?.strategies.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Symbol</span>
              <Input placeholder="Filter symbol..." value={symbolFilter} onChange={(e) => setSymbolFilter(e.target.value)} className="h-8 text-sm w-[140px] bg-white/[0.03] border-white/[0.08] rounded-lg" />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Account</span>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger size="sm" className="w-[140px] bg-white/[0.03] border-white/[0.08] rounded-lg h-8">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {filterOptions?.accounts.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Market</span>
              <Select value={marketTypeFilter} onValueChange={setMarketTypeFilter}>
                <SelectTrigger size="sm" className="w-[130px] bg-white/[0.03] border-white/[0.08] rounded-lg h-8">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Markets</SelectItem>
                  {filterOptions?.marketTypes.map((m) => (<SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {filterOptions && filterOptions.tags.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Tag</span>
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger size="sm" className="w-[130px] bg-white/[0.03] border-white/[0.08] rounded-lg h-8">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {filterOptions.tags.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {loading ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Win Rate" value={<span className={cn(kpi.winRate >= 50 ? 'text-emerald-400' : 'text-red-400')}>{kpi.winRate.toFixed(1)}%</span>} icon={Target} colorClass={cn(kpi.winRate >= 50 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400')} subtext={`${kpi.winningTrades}W / ${kpi.losingTrades}L`} />
          <KpiCard label="Avg Winner" value={<CurrencyBadge value={kpi.avgWinner} />} icon={TrendingUp} colorClass="bg-emerald-500/15 text-emerald-400" subtext="Average winning trade" />
          <KpiCard label="Avg Loser" value={<CurrencyBadge value={kpi.avgLoser} />} icon={TrendingDown} colorClass="bg-red-500/15 text-red-400" subtext="Average losing trade" />
          <KpiCard label="Profit Factor" value={<span className={cn(kpi.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400')}>{kpi.profitFactor.toFixed(2)}</span>} icon={IndianRupee} colorClass={cn(kpi.profitFactor >= 1 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400')} subtext={kpi.profitFactor >= 1 ? 'Profitable ratio' : 'Needs improvement'} />
          <KpiCard label="Expectancy" value={<span className={cn(kpi.expectancy > 0 ? 'text-emerald-400' : 'text-red-400')}>{formatCurrency(kpi.expectancy)}</span>} icon={Zap} colorClass={cn(kpi.expectancy > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400')} subtext="Expected per trade" />
          <KpiCard label="Max Drawdown" value={<span className="text-red-400">{formatCurrency(kpi.maxDrawdown)}</span>} icon={AlertTriangle} colorClass="bg-red-500/15 text-red-400" subtext="Largest peak-to-trough" />
          <KpiCard label="Best Trade" value={<CurrencyBadge value={kpi.bestTrade} />} icon={Trophy} colorClass="bg-emerald-500/15 text-emerald-400" subtext="Single best trade" />
          <KpiCard label="Worst Trade" value={<CurrencyBadge value={kpi.worstTrade} />} icon={Flame} colorClass="bg-red-500/15 text-red-400" subtext="Single worst trade" />
        </div>
      )}

      {/* ── Charts Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* P/L Bar Chart */}
        <div className={cn(darkCardNoPad, 'overflow-hidden')}>
          <div className="p-5 pb-2">
            <p className="text-sm font-semibold">P/L by Period</p>
            <p className="text-xs text-muted-foreground mt-0.5">Daily profit and loss distribution</p>
          </div>
          <div className="px-5 pb-5">
            {pnlChartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pnlChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} interval="preserveStartEnd" stroke="rgba(255,255,255,0.3)" />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={(v: number) => formatCompact(v)} stroke="rgba(255,255,255,0.3)" />
                    <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                    <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={32}>
                      {pnlChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No P/L data for this period</div>
            )}
          </div>
        </div>

        {/* Cumulative Equity Curve */}
        <div className={cn(darkCardNoPad, 'overflow-hidden')}>
          <div className="p-5 pb-2">
            <p className="text-sm font-semibold">Cumulative Equity Curve</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total P/L progression over time</p>
          </div>
          <div className="px-5 pb-5">
            {equityChartData.length > 1 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} interval="preserveStartEnd" stroke="rgba(255,255,255,0.3)" />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={(v: number) => formatCompact(v)} stroke="rgba(255,255,255,0.3)" />
                    <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                    <Area type="monotone" dataKey="cumulative" stroke="#10B981" strokeWidth={2} fill="url(#equityGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Not enough data</div>
            )}
          </div>
        </div>

        {/* Strategy Performance Table */}
        <div className={cn(darkCardNoPad, 'overflow-hidden lg:col-span-2')}>
          <div className="p-5 pb-3">
            <p className="text-sm font-semibold">Strategy Performance</p>
            <p className="text-xs text-muted-foreground mt-0.5">Breakdown by trading strategy</p>
          </div>
          <div className="px-5 pb-5">
            {sortedStrategies.length > 0 ? (
              <div className="max-h-96 overflow-y-auto rounded-lg border border-white/[0.06]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/[0.06] bg-white/[0.03]">
                      <TableHead className="text-xs cursor-pointer hover:text-foreground h-9" onClick={() => handleSort('name')}>
                        <span className="flex items-center gap-1">Strategy <ArrowUpDown className="w-3 h-3" /></span>
                      </TableHead>
                      <TableHead className="text-xs text-right cursor-pointer hover:text-foreground h-9" onClick={() => handleSort('tradeCount')}>
                        <span className="flex items-center gap-1 justify-end">Trades <ArrowUpDown className="w-3 h-3" /></span>
                      </TableHead>
                      <TableHead className="text-xs text-right cursor-pointer hover:text-foreground h-9" onClick={() => handleSort('winRate')}>
                        <span className="flex items-center gap-1 justify-end">Win Rate <ArrowUpDown className="w-3 h-3" /></span>
                      </TableHead>
                      <TableHead className="text-xs text-right cursor-pointer hover:text-foreground h-9" onClick={() => handleSort('totalPnl')}>
                        <span className="flex items-center gap-1 justify-end">Total P/L <ArrowUpDown className="w-3 h-3" /></span>
                      </TableHead>
                      <TableHead className="text-xs text-right cursor-pointer hover:text-foreground h-9" onClick={() => handleSort('avgPnl')}>
                        <span className="flex items-center gap-1 justify-end">Avg P/L <ArrowUpDown className="w-3 h-3" /></span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStrategies.map((row) => (
                      <TableRow key={row.name} className="border-white/[0.04] hover:bg-white/[0.03]">
                        <TableCell className="font-medium text-sm py-3">{row.name}</TableCell>
                        <TableCell className="text-sm text-right py-3">{row.tradeCount}</TableCell>
                        <TableCell className="text-sm text-right py-3">
                          <span className={cn(row.winRate >= 50 ? 'text-emerald-400' : 'text-red-400')}>{row.winRate.toFixed(1)}%</span>
                        </TableCell>
                        <TableCell className="text-sm text-right py-3"><CurrencyBadge value={row.totalPnl} className="text-sm" /></TableCell>
                        <TableCell className="text-sm text-right py-3"><CurrencyBadge value={row.avgPnl} className="text-sm" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">No strategy data available</div>
            )}
          </div>
        </div>

        {/* Day of Week */}
        <div className={cn(darkCardNoPad, 'overflow-hidden')}>
          <div className="p-5 pb-2">
            <p className="text-sm font-semibold">Day of Week Performance</p>
            <p className="text-xs text-muted-foreground mt-0.5">P/L breakdown by trading day</p>
          </div>
          <div className="px-5 pb-5">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderedDayPerformance} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={(v: string) => v.slice(0, 3)} stroke="rgba(255,255,255,0.3)" />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={(v: number) => formatCompact(v)} stroke="rgba(255,255,255,0.3)" />
                  <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                  <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
                  <Bar dataKey="pnl" name="P/L" radius={[3, 3, 0, 0]} maxBarSize={40}>
                    {orderedDayPerformance.map((entry, index) => (
                      <Cell key={index} fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Time of Day */}
        <div className={cn(darkCardNoPad, 'overflow-hidden')}>
          <div className="p-5 pb-2">
            <p className="text-sm font-semibold">Time of Day Performance</p>
            <p className="text-xs text-muted-foreground mt-0.5">P/L breakdown by trading hour (IST)</p>
          </div>
          <div className="px-5 pb-5">
            {timeChartData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} stroke="rgba(255,255,255,0.3)" />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={(v: number) => formatCompact(v)} stroke="rgba(255,255,255,0.3)" />
                    <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} labelFormatter={(label) => `Hour: ${label}`} />} />
                    <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
                    <Bar dataKey="pnl" name="P/L" radius={[3, 3, 0, 0]} maxBarSize={40}>
                      {timeChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No time-based data</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary Statistics ── */}
      <div className={cn(darkCardNoPad, 'overflow-hidden')}>
        <div className="p-5 pb-3">
          <p className="text-sm font-semibold flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Summary Statistics</p>
          <p className="text-xs text-muted-foreground mt-0.5">Additional performance metrics for this period</p>
        </div>
        <div className="px-5 pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Trades</p>
              <p className="text-lg font-bold">{kpi.totalTrades}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total P/L</p>
              <CurrencyBadge value={kpi.totalPnl} className="text-lg font-bold" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Gross Profit</p>
              <CurrencyBadge value={kpi.grossProfit} className="text-lg font-bold" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Gross Loss</p>
              <CurrencyBadge value={-Math.abs(kpi.grossLoss)} className="text-lg font-bold" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Max Win Streak</p>
              <p className="text-lg font-bold text-emerald-400">{kpi.maxConsecutiveWins} <span className="text-xs text-muted-foreground ml-1">wins</span></p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Max Loss Streak</p>
              <p className="text-lg font-bold text-red-400">{kpi.maxConsecutiveLosses} <span className="text-xs text-muted-foreground ml-1">losses</span></p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 pt-4 border-t border-white/[0.06]">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg R-Multiple</p>
              <p className="text-lg font-bold">{kpi.avgRMultiple.toFixed(2)}R</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Winners</p>
              <p className="text-lg font-bold text-emerald-400">{kpi.winningTrades}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Losers</p>
              <p className="text-lg font-bold text-red-400">{kpi.losingTrades}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Hold Time</p>
              <p className="text-lg font-bold">
                {kpi.avgHoldMinutes != null ? (
                  <>{Math.floor(kpi.avgHoldMinutes / 60) > 0 && <>{Math.floor(kpi.avgHoldMinutes / 60)}h </>}{(kpi.avgHoldMinutes % 60)}m</>
                ) : (<span className="text-muted-foreground">N/A</span>)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Expectancy</p>
              <p className={cn('text-lg font-bold', kpi.expectancy > 0 ? 'text-emerald-400' : 'text-red-400')}>{formatCurrency(kpi.expectancy)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Profit Factor</p>
              <p className={cn('text-lg font-bold', kpi.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400')}>{kpi.profitFactor.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
