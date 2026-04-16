'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';
import { CurrencyBadge, LoadingSpinner, ErrorState } from '@/components/common/loading';
import { Card, CardContent } from '@/components/ui/card';
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
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Plus,
  SlidersHorizontal,
  X,
  BookOpen,
  ArrowUpDown,
  Check,
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

const MARKET_TYPES = ['stocks', 'forex', 'crypto', 'futures', 'options'] as const;
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
  const variants: Record<string, string> = {
    closed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    draft: 'bg-muted text-muted-foreground',
  };
  return (
    <Badge variant="outline" className={cn('capitalize text-xs font-medium', variants[status] || variants.draft)}>
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

function FilterBadge({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
      {label}
      <button onClick={onClear} className="hover:text-primary/80">
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4">
      {/* === Page Header === */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Trade Journal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pagination.total} trade{pagination.total !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button onClick={() => navigate('trades/new')} className="shrink-0">
          <Plus className="w-4 h-4 mr-1" />
          Add Trade
        </Button>
      </div>

      {/* === Search & Filter Bar === */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search trades by symbol, notes, strategy..."
            className="pl-9"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="default" className="shrink-0 gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 space-y-4" align="end">
              <div className="space-y-4">
                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Date Range</label>
                  <Select value={datePreset} onValueChange={handleDatePreset}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_PRESETS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {datePreset === 'all' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        placeholder="From"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setDatePreset('custom'); setPage(1); }}
                      />
                      <Input
                        type="date"
                        placeholder="To"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setDatePreset('custom'); setPage(1); }}
                      />
                    </div>
                  )}
                </div>

                {/* Symbol */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Symbol</label>
                  <Input
                    placeholder="e.g. AAPL"
                    value={symbol}
                    onChange={(e) => { setSymbol(e.target.value); setPage(1); }}
                  />
                </div>

                {/* Strategy */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Strategy</label>
                  <Input
                    placeholder="e.g. Breakout"
                    value={strategy}
                    onChange={(e) => { setStrategy(e.target.value); setPage(1); }}
                  />
                </div>

                {/* Market Type */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Market Type</label>
                  <Select value={marketType} onValueChange={(v) => { setMarketType(v); setPage(1); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Markets</SelectItem>
                      {MARKET_TYPES.map(m => (
                        <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Direction */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Direction</label>
                  <Select value={direction} onValueChange={(v) => { setDirection(v); setPage(1); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="long">Long</SelectItem>
                      <SelectItem value="short">Short</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Profitable */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Result</label>
                  <Select value={profitable} onValueChange={(v) => { setProfitable(v); setPage(1); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">Winners</SelectItem>
                      <SelectItem value="false">Losers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Tags</label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {tags.map(tag => (
                        <button
                          key={tag.id}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors',
                            selectedTags.includes(tag.id)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80 text-foreground'
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
                <Button variant="outline" size="sm" className="w-full" onClick={resetFilters}>
                  <X className="w-3 h-3 mr-1" />
                  Reset All Filters
                </Button>
              )}
            </PopoverContent>
          </Popover>

          {/* Sort */}
          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
            <SelectTrigger className="w-[170px] shrink-0">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
            className="text-xs text-muted-foreground hover:text-foreground ml-1"
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
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No trades yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Start logging your trades to build your journal and track your performance over time.
          </p>
          <Button onClick={() => navigate('trades/new')}>
            <Plus className="w-4 h-4 mr-1" />
            Add your first trade
          </Button>
        </div>
      )}

      {!loading && noMatchingFilters && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No trades match your filters</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Try adjusting your filters or search terms to find what you&apos;re looking for.
          </p>
          <Button variant="outline" onClick={resetFilters}>
            <X className="w-4 h-4 mr-1" />
            Reset Filters
          </Button>
        </div>
      )}

      {/* === Trade Table === */}
      {!loading && !noTradesAtAll && !noMatchingFilters && (
        <>
          <Card className="gap-0 py-0 overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium">Date</TableHead>
                    <TableHead className="text-xs font-medium">Symbol</TableHead>
                    <TableHead className="text-xs font-medium">Direction</TableHead>
                    <TableHead className="text-xs font-medium text-right">P/L</TableHead>
                    <TableHead className="text-xs font-medium text-right hidden sm:table-cell">P/L %</TableHead>
                    <TableHead className="text-xs font-medium hidden md:table-cell">Strategy</TableHead>
                    <TableHead className="text-xs font-medium">Status</TableHead>
                    <TableHead className="text-xs font-medium w-8" />
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
                        className="cursor-pointer"
                        onClick={() => navigate(`trades/${trade.id}`)}
                      >
                        <TableCell className="text-xs text-muted-foreground py-3">
                          <div className="flex items-center gap-1.5">
                            <span>{dateLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-sm py-3">
                          {trade.symbol}
                        </TableCell>
                        <TableCell className="py-3">
                          <DirectionBadge direction={trade.direction} />
                        </TableCell>
                        <TableCell className="text-right py-3">
                          {trade.status === 'closed' ? (
                            <CurrencyBadge value={pnlValue} className="text-sm font-semibold" />
                          ) : (
                            <span className="text-xs text-muted-foreground">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right py-3 hidden sm:table-cell">
                          {trade.status === 'closed' && trade.pnlPercent != null ? (
                            <span className={cn(
                              'text-xs font-medium',
                              pnlPct > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                              pnlPct < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                            )}>
                              {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 hidden md:table-cell">
                          {trade.strategy ? (
                            <span className="text-xs text-muted-foreground">{trade.strategy}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <StatusBadge status={trade.status} />
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <ChevronDown className="w-4 h-4 text-muted-foreground rotate-[-90deg]" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* === Pagination === */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}&ndash;{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationLink
                      aria-label="Previous page"
                      onClick={(e) => { e.preventDefault(); if (pagination.page > 1) setPage(pagination.page - 1); }}
                      className={cn(pagination.page <= 1 && 'pointer-events-none opacity-50')}
                    >
                      <ChevronDown className="w-4 h-4 rotate-90" />
                      <span className="hidden sm:block ml-1">Previous</span>
                    </PaginationLink>
                  </PaginationItem>

                  {getVisiblePages(pagination.page, pagination.totalPages).map((p, idx) =>
                    p === 'ellipsis' ? (
                      <PaginationItem key={`ellipsis-${idx}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={p === pagination.page}
                          onClick={(e) => { e.preventDefault(); setPage(p as number); }}
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
                      className={cn(pagination.page >= pagination.totalPages && 'pointer-events-none opacity-50')}
                    >
                      <span className="hidden sm:block mr-1">Next</span>
                      <ChevronDown className="w-4 h-4 rotate-90" />
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
