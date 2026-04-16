'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';
import { CurrencyBadge, LoadingSpinner, ErrorState } from '@/components/common/loading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  Search,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  X,
  BookOpen,
  ArrowUpDown,
  Check,
  IndianRupee,
  Filter,
  Flame,
  Zap,
  Layers,
  CircleDot,
} from 'lucide-react';
import { format, parseISO, isValid, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns';

// --- Types ---

interface TradeListItem {
  id: string;
  symbol: string;
  direction: string;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number | null;
  pnlPercent: number | null;
  tradeDate: string;
  status: string;
  strategy: string | null;
  marketType: string;
}

interface TagItem {
  id: string;
  name: string;
  tradeCount?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// --- Constants ---

const SORT_OPTIONS = [
  { value: 'tradeDate_desc', label: 'Newest First' },
  { value: 'tradeDate_asc', label: 'Oldest First' },
  { value: 'pnl_desc', label: 'P/L: High to Low' },
  { value: 'pnl_asc', label: 'P/L: Low to High' },
  { value: 'pnlPercent_desc', label: 'Return %: High to Low' },
  { value: 'pnlPercent_asc', label: 'Return %: Low to High' },
] as const;

const INDIAN_MARKET_TYPES = [
  { value: 'equity', label: 'Equity', icon: Layers },
  { value: 'futures', label: 'Futures', icon: Flame },
  { value: 'options', label: 'Options', icon: CircleDot },
  { value: 'commodity', label: 'Commodity', icon: Zap },
  { value: 'currency', label: 'Currency', icon: IndianRupee },
] as const;

const INDIAN_STRATEGIES = [
  'Breakout',
  'Reversal',
  'Trend Following',
  'Scalping',
  'Swing Trading',
  'Gap Up/Down',
  'Mean Reversion',
  'Options Selling',
  'Iron Condor',
  'Straddle/Strangle',
  'Bull Call Spread',
  'Bear Put Spread',
  'Nifty Options',
  'Bank Nifty Options',
] as const;

const DATE_PRESETS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 90 Days', value: 'last_90' },
] as const;

// --- Helper Components ---

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    closed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    open: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    draft: { bg: 'bg-white/[0.06]', text: 'text-zinc-400', dot: 'bg-zinc-400' },
  };
  const c = config[status] || config.draft;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md', c.bg, c.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function DirectionBadge({ direction }: { direction: string }) {
  const isLong = direction === 'long';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md',
        isLong
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-red-500/15 text-red-400'
      )}
    >
      {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {direction.toUpperCase()}
    </span>
  );
}

function FilterBadge({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.06] text-zinc-300 text-xs font-medium hover:bg-white/[0.1] transition-colors">
      {label}
      <button onClick={onClear} className="text-zinc-500 hover:text-zinc-300 transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// --- Main Component ---

export default function JournalListPage() {
  const { navigate } = useRouter();

  // Data state
  const [trades, setTrades] = useState<TradeListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [symbol, setSymbol] = useState('');
  const [strategy, setStrategy] = useState('');
  const [marketType, setMarketType] = useState('all');
  const [direction, setDirection] = useState('all');
  const [profitable, setProfitable] = useState('all');
  const [status, setStatus] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState('tradeDate_desc');
  const [page, setPage] = useState(1);

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Fetch tags on mount
  useEffect(() => {
    fetch('/api/tags')
      .then(res => res.json())
      .then(data => setTags(data))
      .catch(() => {});
  }, []);

  // Fetch trades
  const fetchTrades = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
        setInitialLoad(true);
      }
      setError(null);

      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      params.set('sort', sort);

      if (search) params.set('search', search);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (symbol) params.set('symbol', symbol);
      if (strategy) params.set('strategy', strategy);
      if (marketType && marketType !== 'all') params.set('marketType', marketType);
      if (direction && direction !== 'all') params.set('direction', direction);
      if (profitable && profitable !== 'all') params.set('profitable', profitable);
      if (status && status !== 'all') params.set('status', status);
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));

      const res = await fetch(`/api/trades?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setTrades(json.trades || []);
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [search, dateFrom, dateTo, symbol, strategy, marketType, direction, profitable, status, selectedTags, sort, page]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      // fetchTrades will be called by the effect since search state changes
    }, 300);
  };

  // Date preset handler
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    setPage(1);
    const now = new Date();

    switch (preset) {
      case 'all':
        setDateFrom('');
        setDateTo('');
        break;
      case 'today': {
        const s = startOfDay(now);
        const e = endOfDay(now);
        setDateFrom(format(s, 'yyyy-MM-dd'));
        setDateTo(format(e, 'yyyy-MM-dd'));
        break;
      }
      case 'this_week': {
        const s = startOfWeek(now, { weekStartsOn: 1 });
        const e = endOfWeek(now, { weekStartsOn: 1 });
        setDateFrom(format(s, 'yyyy-MM-dd'));
        setDateTo(format(e, 'yyyy-MM-dd'));
        break;
      }
      case 'this_month': {
        const s = startOfMonth(now);
        const e = endOfMonth(now);
        setDateFrom(format(s, 'yyyy-MM-dd'));
        setDateTo(format(e, 'yyyy-MM-dd'));
        break;
      }
      case 'last_month': {
        const lastMonth = subMonths(now, 1);
        const s = startOfMonth(lastMonth);
        const e = endOfMonth(lastMonth);
        setDateFrom(format(s, 'yyyy-MM-dd'));
        setDateTo(format(e, 'yyyy-MM-dd'));
        break;
      }
      case 'last_90': {
        const s = subDays(now, 89);
        const e = endOfDay(now);
        setDateFrom(format(s, 'yyyy-MM-dd'));
        setDateTo(format(e, 'yyyy-MM-dd'));
        break;
      }
    }
  };

  // Tag toggle
  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => {
      const next = prev.includes(tagId)
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId];
      setPage(1);
      return next;
    });
  };

  // Reset all filters
  const resetFilters = () => {
    setSearch('');
    setDatePreset('all');
    setDateFrom('');
    setDateTo('');
    setSymbol('');
    setStrategy('');
    setMarketType('all');
    setDirection('all');
    setProfitable('all');
    setStatus('all');
    setSelectedTags([]);
    setSort('tradeDate_desc');
    setPage(1);
  };

  // Check if any filter is active
  const hasActiveFilters = search || datePreset !== 'all' || symbol || strategy || marketType !== 'all' || direction !== 'all' || profitable !== 'all' || status !== 'all' || selectedTags.length > 0;
  const activeFilterCount = [
    search, datePreset !== 'all', symbol, strategy, marketType !== 'all', direction !== 'all', profitable !== 'all', status !== 'all', selectedTags.length > 0,
  ].filter(Boolean).length;

  // Pagination helpers
  const getVisiblePages = (current: number, total: number): (number | 'ellipsis')[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [];
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('ellipsis', total);
    } else if (current >= total - 3) {
      pages.push(1, 'ellipsis');
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total);
    }
    return pages;
  };

  // --- Loading ---
  if (loading && initialLoad) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner className="w-8 h-8" />
      </div>
    );
  }

  // --- Error ---
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => fetchTrades(true)}
      />
    );
  }

  const noTradesAtAll = pagination.total === 0 && !hasActiveFilters;
  const noMatchingFilters = pagination.total === 0 && hasActiveFilters;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">

      {/* === Page Header === */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            Trade Journal
          </h1>
          <p className="text-sm text-zinc-500 mt-1 ml-11">
            {pagination.total} trade{pagination.total !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button
          onClick={() => navigate('trades/new')}
          className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Trade
        </Button>
      </div>

      {/* === Search & Filter Bar === */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search by symbol, notes, strategy..."
            className="pl-10 h-11 rounded-xl bg-white/[0.03] border-white/[0.06] text-zinc-200 placeholder:text-zinc-600 focus:border-[#8B5CF6]/50 focus:ring-[#8B5CF6]/20"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Popover */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                size="default"
                className="shrink-0 gap-2 h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#8B5CF6] text-[10px] text-white font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-4 space-y-4 bg-[#161618] border-white/[0.06] rounded-xl" align="end">
              <div className="space-y-4">
                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Date Range</label>
                  <Select value={datePreset} onValueChange={handleDatePreset}>
                    <SelectTrigger className="w-full h-9 bg-white/[0.03] border-white/[0.06] text-zinc-300 rounded-lg">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161618] border-white/[0.06]">
                      {DATE_PRESETS.map(p => (
                        <SelectItem key={p.value} value={p.value} className="text-zinc-300 focus:bg-white/[0.06] focus:text-white">{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {datePreset === 'all' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        placeholder="From"
                        className="h-9 bg-white/[0.03] border-white/[0.06] text-zinc-300 rounded-lg text-xs"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setDatePreset('custom'); setPage(1); }}
                      />
                      <Input
                        type="date"
                        placeholder="To"
                        className="h-9 bg-white/[0.03] border-white/[0.06] text-zinc-300 rounded-lg text-xs"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setDatePreset('custom'); setPage(1); }}
                      />
                    </div>
                  )}
                </div>

                {/* Market Type */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Market Type</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors border',
                        marketType === 'all'
                          ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/20'
                          : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:bg-white/[0.06]'
                      )}
                      onClick={() => { setMarketType('all'); setPage(1); }}
                    >
                      <Filter className="w-3 h-3" />
                      All
                    </button>
                    {INDIAN_MARKET_TYPES.map(m => (
                      <button
                        key={m.value}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors border',
                          marketType === m.value
                            ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/20'
                            : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:bg-white/[0.06]'
                        )}
                        onClick={() => { setMarketType(m.value); setPage(1); }}
                      >
                        <m.icon className="w-3 h-3" />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Strategy */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Strategy</label>
                  <Select value={strategy} onValueChange={(v) => { setStrategy(v); setPage(1); }}>
                    <SelectTrigger className="w-full h-9 bg-white/[0.03] border-white/[0.06] text-zinc-300 rounded-lg">
                      <SelectValue placeholder="All Strategies" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161618] border-white/[0.06] max-h-60">
                      <SelectItem value="" className="text-zinc-300 focus:bg-white/[0.06] focus:text-white">All Strategies</SelectItem>
                      {INDIAN_STRATEGIES.map(s => (
                        <SelectItem key={s} value={s} className="text-zinc-300 focus:bg-white/[0.06] focus:text-white">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Symbol */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Symbol</label>
                  <Input
                    placeholder="e.g. RELIANCE, NIFTY"
                    className="h-9 bg-white/[0.03] border-white/[0.06] text-zinc-300 placeholder:text-zinc-600 rounded-lg"
                    value={symbol}
                    onChange={(e) => { setSymbol(e.target.value); setPage(1); }}
                  />
                </div>

                {/* Direction + Result row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Direction</label>
                    <Select value={direction} onValueChange={(v) => { setDirection(v); setPage(1); }}>
                      <SelectTrigger className="w-full h-9 bg-white/[0.03] border-white/[0.06] text-zinc-300 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#161618] border-white/[0.06]">
                        <SelectItem value="all" className="text-zinc-300 focus:bg-white/[0.06] focus:text-white">All</SelectItem>
                        <SelectItem value="long" className="text-zinc-300 focus:bg-white/[0.06] focus:text-white">Long</SelectItem>
                        <SelectItem value="short" className="text-zinc-300 focus:bg-white/[0.06] focus:text-white">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Result</label>
                    <Select value={profitable} onValueChange={(v) => { setProfitable(v); setPage(1); }}>
                      <SelectTrigger className="w-full h-9 bg-white/[0.03] border-white/[0.06] text-zinc-300 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#161618] border-white/[0.06]">
                        <SelectItem value="all" className="text-zinc-300 focus:bg-white/[0.06] focus:text-white">All</SelectItem>
                        <SelectItem value="true" className="text-emerald-400 focus:bg-white/[0.06]">Winners</SelectItem>
                        <SelectItem value="false" className="text-red-400 focus:bg-white/[0.06]">Losers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Status</label>
                  <div className="flex gap-1.5">
                    {(['all', 'open', 'closed', 'draft'] as const).map(s => (
                      <button
                        key={s}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                          status === s
                            ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/20'
                            : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:bg-white/[0.06]'
                        )}
                        onClick={() => { setStatus(s); setPage(1); }}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Tags</label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {tags.map(tag => (
                        <button
                          key={tag.id}
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                            selectedTags.includes(tag.id)
                              ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/20'
                              : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:bg-white/[0.06]'
                          )}
                          onClick={() => toggleTag(tag.id)}
                        >
                          {selectedTags.includes(tag.id) && <Check className="w-3 h-3" />}
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reset */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 rounded-lg"
                  onClick={resetFilters}
                >
                  <X className="w-3 h-3 mr-1.5" />
                  Reset All Filters
                </Button>
              )}
            </PopoverContent>
          </Popover>

          {/* Sort Select */}
          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
            <SelectTrigger className="w-[175px] shrink-0 h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-300">
              <ArrowUpDown className="w-4 h-4 text-zinc-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#161618] border-white/[0.06]">
              {SORT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-zinc-300 focus:bg-white/[0.06] focus:text-white">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* === Active Filter Badges === */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {search && (
            <FilterBadge label={`Search: ${search}`} onClear={() => { setSearch(''); setPage(1); }} />
          )}
          {datePreset !== 'all' && (
            <FilterBadge
              label={DATE_PRESETS.find(p => p.value === datePreset)?.label || 'Custom Date'}
              onClear={() => { handleDatePreset('all'); }}
            />
          )}
          {symbol && (
            <FilterBadge label={`Symbol: ${symbol}`} onClear={() => { setSymbol(''); setPage(1); }} />
          )}
          {strategy && (
            <FilterBadge label={`Strategy: ${strategy}`} onClear={() => { setStrategy(''); setPage(1); }} />
          )}
          {marketType !== 'all' && (
            <FilterBadge label={marketType.charAt(0).toUpperCase() + marketType.slice(1)} onClear={() => { setMarketType('all'); setPage(1); }} />
          )}
          {direction !== 'all' && (
            <FilterBadge label={direction.charAt(0).toUpperCase() + direction.slice(1)} onClear={() => { setDirection('all'); setPage(1); }} />
          )}
          {profitable !== 'all' && (
            <FilterBadge label={profitable === 'true' ? 'Winners' : 'Losers'} onClear={() => { setProfitable('all'); setPage(1); }} />
          )}
          {status !== 'all' && (
            <FilterBadge label={status.charAt(0).toUpperCase() + status.slice(1)} onClear={() => { setStatus('all'); setPage(1); }} />
          )}
          {selectedTags.map(tagId => {
            const tag = tags.find(t => t.id === tagId);
            return tag ? (
              <FilterBadge key={tagId} label={tag.name} onClear={() => toggleTag(tagId)} />
            ) : null;
          })}
          <button
            className="text-xs text-[#8B5CF6] hover:text-[#A78BFA] ml-1 font-medium transition-colors"
            onClick={resetFilters}
          >
            Clear all
          </button>
        </div>
      )}

      {/* === Loading overlay for subsequent fetches === */}
      {loading && !initialLoad && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner className="w-6 h-6" />
        </div>
      )}

      {/* === Empty States === */}
      {!loading && noTradesAtAll && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
            <BookOpen className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="text-xl font-bold text-zinc-200 mb-2">No trades yet</h3>
          <p className="text-sm text-zinc-500 max-w-sm mb-8">
            Start logging your trades to build your journal and track your performance over time.
          </p>
          <Button
            onClick={() => navigate('trades/new')}
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Add your first trade
          </Button>
        </div>
      )}

      {!loading && noMatchingFilters && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
            <Search className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="text-xl font-bold text-zinc-200 mb-2">No trades match your filters</h3>
          <p className="text-sm text-zinc-500 max-w-sm mb-8">
            Try adjusting your filters or search terms to find what you&apos;re looking for.
          </p>
          <Button
            variant="secondary"
            onClick={resetFilters}
            className="bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.06] gap-2"
          >
            <X className="w-4 h-4" />
            Reset Filters
          </Button>
        </div>
      )}

      {/* === Trade Table === */}
      {!loading && !noTradesAtAll && !noMatchingFilters && (
        <>
          <div className="bg-[#161618] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white/[0.03] border-b border-white/[0.04] hover:bg-white/[0.03]">
                    <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-11">Date</TableHead>
                    <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-11">Symbol</TableHead>
                    <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-11">Direction</TableHead>
                    <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-11 text-right">P/L</TableHead>
                    <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-11 text-right hidden sm:table-cell">P/L %</TableHead>
                    <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-11 hidden md:table-cell">Strategy</TableHead>
                    <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-11">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider h-11 w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => {
                    const dateParsed = parseISO(trade.tradeDate);
                    const dateLabel = isValid(dateParsed) ? format(dateParsed, 'MMM d, yyyy') : trade.tradeDate;
                    const pnlValue = trade.pnl ?? 0;
                    const pnlPct = trade.pnlPercent ?? 0;

                    return (
                      <TableRow
                        key={trade.id}
                        className="cursor-pointer border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors group"
                        onClick={() => navigate(`trades/${trade.id}`)}
                      >
                        <TableCell className="text-xs text-zinc-500 py-3.5">
                          {dateLabel}
                        </TableCell>
                        <TableCell className="font-bold text-sm text-zinc-100 py-3.5">
                          {trade.symbol}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <DirectionBadge direction={trade.direction} />
                        </TableCell>
                        <TableCell className="text-right py-3.5">
                          {trade.status === 'closed' ? (
                            <CurrencyBadge value={pnlValue} className="text-sm font-semibold" />
                          ) : (
                            <span className="text-xs text-zinc-600">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right py-3.5 hidden sm:table-cell">
                          {trade.status === 'closed' && trade.pnlPercent != null ? (
                            <span className={cn(
                              'text-xs font-semibold',
                              pnlPct > 0 ? 'text-emerald-400' :
                              pnlPct < 0 ? 'text-red-400' : 'text-zinc-500'
                            )}>
                              {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 hidden md:table-cell">
                          {trade.strategy ? (
                            <span className="text-xs text-zinc-400 font-medium">{trade.strategy}</span>
                          ) : (
                            <span className="text-xs text-zinc-600">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <StatusBadge status={trade.status} />
                        </TableCell>
                        <TableCell className="py-3.5 text-right">
                          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* === Pagination === */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                Showing {(pagination.page - 1) * pagination.limit + 1}&ndash;{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationLink
                      aria-label="Previous page"
                      onClick={(e) => { e.preventDefault(); if (pagination.page > 1) setPage(pagination.page - 1); }}
                      className={cn(
                        'rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 h-9',
                        pagination.page <= 1 && 'pointer-events-none opacity-40'
                      )}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:block ml-1.5 text-xs">Previous</span>
                    </PaginationLink>
                  </PaginationItem>

                  {getVisiblePages(pagination.page, pagination.totalPages).map((p, idx) =>
                    p === 'ellipsis' ? (
                      <PaginationItem key={`ellipsis-${idx}`}>
                        <PaginationEllipsis className="text-zinc-600" />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={p === pagination.page}
                          onClick={(e) => { e.preventDefault(); setPage(p as number); }}
                          className={cn(
                            'h-9 w-9 rounded-lg text-xs font-semibold transition-colors',
                            p === pagination.page
                              ? 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED] hover:text-white'
                              : 'bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200'
                          )}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}

                  <PaginationItem>
                    <PaginationLink
                      aria-label="Next page"
                      onClick={(e) => { e.preventDefault(); if (pagination.page < pagination.totalPages) setPage(pagination.page + 1); }}
                      className={cn(
                        'rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 h-9',
                        pagination.page >= pagination.totalPages && 'pointer-events-none opacity-40'
                      )}
                    >
                      <span className="hidden sm:block mr-1.5 text-xs">Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}
