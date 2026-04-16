'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';
import { CurrencyBadge, LoadingSpinner, ErrorState, formatCurrency } from '@/components/common/loading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Copy,
  Trash2,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  IndianRupee,
  Hash,
  Percent,
  Activity,
  BarChart3,
  Shield,
  Brain,
  FileText,
  Tag,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Briefcase,
  Globe,
  LineChart,
  Flame,
  Zap,
  CircleDot,
  Layers,
  Timer,
  Wallet,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

// --- Types ---

interface TradeScreenshot {
  id: string;
  imageUrl: string;
  label: string;
  sortOrder: number;
}

interface TradeTag {
  id: string;
  name: string;
  tradeCount?: number;
}

interface TradeData {
  id: string;
  symbol: string;
  marketType: string;
  direction: string;
  tradeDate: string;
  entryTime: string | null;
  exitTime: string | null;
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  stopLoss: number | null;
  targetPrice: number | null;
  fees: number;
  pnl: number | null;
  pnlPercent: number | null;
  riskAmount: number | null;
  rMultiple: number | null;
  strategy: string | null;
  timeframe: string | null;
  accountName: string | null;
  broker: string | null;
  setupQuality: number | null;
  confidenceRating: number | null;
  emotionalStateBefore: string | null;
  emotionalStateAfter: string | null;
  notes: string | null;
  mistakes: string | null;
  lessonsLearned: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  screenshots: TradeScreenshot[];
  tags: TradeTag[];
}

// --- Card wrapper ---

function DarkCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-[#161618] rounded-xl border border-white/[0.06] p-5', className)}>
      {children}
    </div>
  );
}

// --- Helper Components ---

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    closed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    open: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    draft: { bg: 'bg-white/[0.06]', text: 'text-zinc-400', dot: 'bg-zinc-400' },
  };
  const c = config[status] || config.draft;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg', c.bg, c.text)}>
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
        'inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg',
        isLong
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
          : 'bg-red-500/15 text-red-400 border border-red-500/20'
      )}
    >
      {isLong ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {direction.toUpperCase()}
    </span>
  );
}

function EmotionalBadge({ state }: { state: string }) {
  const colorMap: Record<string, string> = {
    calm: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
    confident: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    anxious: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    fearful: 'bg-red-500/15 text-red-400 border-red-500/20',
    greedy: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    frustrated: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    excited: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    neutral: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
  };
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold capitalize border',
      colorMap[state] || colorMap.neutral
    )}>
      {state}
    </span>
  );
}

function ScreenshotLabelBadge({ label }: { label: string }) {
  const colorMap: Record<string, string> = {
    'pre-entry': 'bg-sky-500/20 text-sky-400',
    'entry': 'bg-emerald-500/20 text-emerald-400',
    'exit': 'bg-amber-500/20 text-amber-400',
    'review': 'bg-violet-500/20 text-violet-400',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize', colorMap[label] || 'bg-zinc-500/20 text-zinc-400')}>
      {label}
    </span>
  );
}

function RatingStars({ value, max = 5 }: { value: number | null; max?: number }) {
  if (value == null) return <span className="text-xs text-zinc-500">&mdash;</span>;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={cn(
            'w-3.5 h-3.5 rounded-sm transition-colors',
            i < value
              ? 'bg-amber-400'
              : 'bg-zinc-700'
          )}
        />
      ))}
      <span className="text-xs text-zinc-500 ml-1.5">{value}/{max}</span>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-zinc-200 mt-0.5 truncate">
          {value || <span className="text-zinc-600">&mdash;</span>}
        </p>
      </div>
    </div>
  );
}

function PriceCell({ label, value, icon: Icon, variant = 'default' }: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  variant?: 'default' | 'danger' | 'success';
}) {
  const bgMap = {
    default: 'bg-white/[0.03]',
    danger: 'bg-red-500/[0.06] border-red-500/[0.1]',
    success: 'bg-emerald-500/[0.06] border-emerald-500/[0.1]',
  };
  return (
    <div className={cn('rounded-xl p-4 border border-white/[0.04]', bgMap[variant])}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn(
          'w-3.5 h-3.5',
          variant === 'danger' ? 'text-red-400' : variant === 'success' ? 'text-emerald-400' : 'text-zinc-500'
        )} />
        <p className={cn(
          'text-[11px] font-semibold uppercase tracking-wider',
          variant === 'danger' ? 'text-red-400' : variant === 'success' ? 'text-emerald-400' : 'text-zinc-500'
        )}>
          {label}
        </p>
      </div>
      <p className="text-lg font-bold text-zinc-100">
        {value || <span className="text-zinc-600">&mdash;</span>}
      </p>
    </div>
  );
}

// --- Main Component ---

export default function TradeDetailPage({ tradeId }: { tradeId: string }) {
  const { navigate, back } = useRouter();
  const [trade, setTrade] = useState<TradeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const fetchTrade = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/trades/${tradeId}`);
      if (res.status === 404) {
        setError('Trade not found');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setTrade(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trade');
    } finally {
      setLoading(false);
    }
  }, [tradeId]);

  useEffect(() => {
    fetchTrade();
  }, [fetchTrade]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/trades/${tradeId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDeleteOpen(false);
      navigate('journal');
    } catch {
      setDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      setDuplicating(true);
      const res = await fetch(`/api/trades/${tradeId}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newTrade = await res.json();
      navigate(`trades/${newTrade.id}`);
    } catch {
      setDuplicating(false);
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const lightboxPrev = () => {
    if (!trade) return;
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : trade.screenshots.length - 1));
  };

  const lightboxNext = () => {
    if (!trade) return;
    setLightboxIndex((prev) => (prev < trade.screenshots.length - 1 ? prev + 1 : 0));
  };

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner className="w-8 h-8" />
      </div>
    );
  }

  // --- Error ---
  if (error || !trade) {
    return (
      <ErrorState
        message={error || 'Unable to load trade data'}
        onRetry={fetchTrade}
      />
    );
  }

  const pnlValue = trade.pnl ?? 0;
  const pnlPercentValue = trade.pnlPercent ?? 0;
  const isWinner = pnlValue > 0;
  const isLoser = pnlValue < 0;

  const currentScreenshot = trade.screenshots[lightboxIndex];

  const tradeDateParsed = parseISO(trade.tradeDate);
  const tradeDateLabel = isValid(tradeDateParsed) ? format(tradeDateParsed, 'EEEE, MMMM d, yyyy') : trade.tradeDate;
  const tradeDateShort = isValid(tradeDateParsed) ? format(tradeDateParsed, 'MMM d, yyyy') : trade.tradeDate;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">

      {/* === Header Section === */}
      <DarkCard className="relative overflow-hidden">
        {/* Subtle gradient glow */}
        {isWinner && (
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        )}
        {isLoser && (
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        )}

        <div className="relative">
          {/* Back + Actions Row */}
          <div className="flex items-center justify-between mb-5">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] -ml-2"
              onClick={back}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-1.5"
                onClick={() => navigate(`trades/edit/${tradeId}`)}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.06] gap-1.5"
                onClick={handleDuplicate}
                disabled={duplicating}
              >
                <Copy className="w-3.5 h-3.5" />
                {duplicating ? 'Copying...' : 'Duplicate'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:text-red-300"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Symbol + Badges + P/L */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-3xl font-bold text-white tracking-tight">{trade.symbol}</h1>
                <DirectionBadge direction={trade.direction} />
                <StatusBadge status={trade.status} />
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {tradeDateLabel}
                </span>
                {trade.strategy && (
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" />
                    {trade.strategy}
                  </span>
                )}
              </div>
            </div>

            {/* Large P/L Display */}
            <div className="text-left sm:text-right">
              {trade.status === 'closed' ? (
                <>
                  <CurrencyBadge value={pnlValue} className="text-3xl sm:text-4xl" />
                  <div className="flex items-center gap-3 sm:justify-end mt-1">
                    <span className={cn(
                      'text-sm font-semibold',
                      isWinner ? 'text-emerald-400' : isLoser ? 'text-red-400' : 'text-zinc-500'
                    )}>
                      {pnlPercentValue >= 0 ? '+' : ''}{pnlPercentValue.toFixed(2)}%
                    </span>
                    {trade.rMultiple != null && (
                      <span className={cn(
                        'text-sm font-medium px-2 py-0.5 rounded-md',
                        trade.rMultiple > 0 ? 'bg-emerald-500/10 text-emerald-400' :
                        trade.rMultiple < 0 ? 'bg-red-500/10 text-red-400' : 'bg-zinc-700 text-zinc-400'
                      )}>
                        {trade.rMultiple >= 0 ? '+' : ''}{trade.rMultiple.toFixed(2)}R
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-2xl font-bold text-zinc-400">Open Position</div>
              )}
            </div>
          </div>
        </div>
      </DarkCard>

      {/* === Price Grid + P/L Summary === */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <PriceCell
          label="Entry Price"
          value={formatCurrency(trade.entryPrice)}
          icon={IndianRupee}
        />
        <PriceCell
          label="Exit Price"
          value={trade.exitPrice != null ? formatCurrency(trade.exitPrice) : undefined}
          icon={IndianRupee}
        />
        <PriceCell
          label="Stop Loss"
          value={trade.stopLoss != null ? formatCurrency(trade.stopLoss) : undefined}
          icon={Shield}
          variant="danger"
        />
        <PriceCell
          label="Target"
          value={trade.targetPrice != null ? formatCurrency(trade.targetPrice) : undefined}
          icon={Target}
          variant="success"
        />
        <PriceCell
          label="Quantity"
          value={trade.quantity.toLocaleString('en-IN')}
          icon={Layers}
        />
        <PriceCell
          label="Fees"
          value={formatCurrency(trade.fees)}
          icon={Wallet}
        />
      </div>

      {/* P/L Summary Bar */}
      <DarkCard className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Profit / Loss</p>
            <CurrencyBadge value={pnlValue} className="text-xl" />
          </div>
          <Separator orientation="vertical" className="h-10 hidden sm:block" />
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Return %</p>
            <span className={cn(
              'text-xl font-bold',
              pnlPercentValue > 0 ? 'text-emerald-400' : pnlPercentValue < 0 ? 'text-red-400' : 'text-zinc-500'
            )}>
              {pnlPercentValue >= 0 ? '+' : ''}{pnlPercentValue.toFixed(2)}%
            </span>
          </div>
          <Separator orientation="vertical" className="h-10 hidden sm:block" />
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">R-Multiple</p>
            <span className={cn(
              'text-xl font-bold',
              trade.rMultiple != null && trade.rMultiple > 0 ? 'text-emerald-400' :
              trade.rMultiple != null && trade.rMultiple < 0 ? 'text-red-400' : 'text-zinc-500'
            )}>
              {trade.rMultiple != null ? `${trade.rMultiple >= 0 ? '+' : ''}${trade.rMultiple.toFixed(2)}R` : '\u2014'}
            </span>
          </div>
          <Separator orientation="vertical" className="h-10 hidden sm:block" />
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Risk Amount</p>
            <span className="text-xl font-bold text-zinc-200">
              {trade.riskAmount != null ? formatCurrency(trade.riskAmount) : '\u2014'}
            </span>
          </div>
        </div>
      </DarkCard>

      {/* === Two Column Layout === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column - Trade Info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Trade Info */}
          <DarkCard>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-[#8B5CF6]" />
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Trade Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.04]">
              <div className="pr-0 sm:pr-4">
                <InfoItem icon={Calendar} label="Trade Date" value={tradeDateShort} />
                <InfoItem icon={Clock} label="Entry Time" value={trade.entryTime ? (() => {
                  const d = parseISO(trade.entryTime);
                  return isValid(d) ? format(d, 'h:mm a') : trade.entryTime;
                })() : null} />
                <InfoItem icon={Clock} label="Exit Time" value={trade.exitTime ? (() => {
                  const d = parseISO(trade.exitTime);
                  return isValid(d) ? format(d, 'h:mm a') : trade.exitTime;
                })() : null} />
                <InfoItem icon={Globe} label="Market Type" value={<span className="capitalize">{trade.marketType}</span>} />
              </div>
              <div className="pl-0 sm:pl-4">
                <InfoItem icon={BarChart3} label="Strategy" value={trade.strategy} />
                <InfoItem icon={LineChart} label="Timeframe" value={trade.timeframe} />
                <InfoItem icon={Hash} label="Account" value={trade.accountName} />
                <InfoItem icon={Shield} label="Broker" value={trade.broker} />
              </div>
            </div>
          </DarkCard>

          {/* Screenshots Gallery */}
          {trade.screenshots.length > 0 && (
            <DarkCard>
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-4 h-4 text-[#8B5CF6]" />
                <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Screenshots</h2>
                <Badge variant="secondary" className="text-[10px] bg-white/[0.06] text-zinc-400 ml-auto">
                  {trade.screenshots.length} image{trade.screenshots.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {trade.screenshots.map((ss, idx) => (
                  <button
                    key={ss.id}
                    className="relative group rounded-xl overflow-hidden border border-white/[0.06] aspect-video bg-[#0d0d0e] cursor-pointer hover:border-[#8B5CF6]/30 transition-colors"
                    onClick={() => openLightbox(idx)}
                  >
                    <img
                      src={ss.imageUrl}
                      alt={ss.label}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <ScreenshotLabelBadge label={ss.label} />
                    </div>
                  </button>
                ))}
              </div>
            </DarkCard>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* Psychology Card */}
          <DarkCard>
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-[#8B5CF6]" />
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Psychology</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Before Trade</p>
                {trade.emotionalStateBefore ? (
                  <EmotionalBadge state={trade.emotionalStateBefore} />
                ) : (
                  <span className="text-xs text-zinc-600">&mdash;</span>
                )}
              </div>
              <Separator className="bg-white/[0.04]" />
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">After Trade</p>
                {trade.emotionalStateAfter ? (
                  <EmotionalBadge state={trade.emotionalStateAfter} />
                ) : (
                  <span className="text-xs text-zinc-600">&mdash;</span>
                )}
              </div>
              <Separator className="bg-white/[0.04]" />
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Setup Quality</p>
                <RatingStars value={trade.setupQuality} />
              </div>
              <Separator className="bg-white/[0.04]" />
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Confidence</p>
                <RatingStars value={trade.confidenceRating} />
              </div>
            </div>
          </DarkCard>

          {/* Notes Card */}
          {(trade.notes || trade.mistakes || trade.lessonsLearned) && (
            <DarkCard>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-[#8B5CF6]" />
                <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Notes</h2>
              </div>
              <div className="space-y-4">
                {trade.notes && (
                  <div className="p-3 rounded-lg bg-white/[0.02]">
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Notes</p>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{trade.notes}</p>
                  </div>
                )}
                {trade.mistakes && (
                  <div className="p-3 rounded-lg bg-red-500/[0.04] border border-red-500/[0.08]">
                    <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-1.5">Mistakes</p>
                    <p className="text-sm text-red-300/80 whitespace-pre-wrap leading-relaxed">{trade.mistakes}</p>
                  </div>
                )}
                {trade.lessonsLearned && (
                  <div className="p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/[0.08]">
                    <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">Lessons Learned</p>
                    <p className="text-sm text-emerald-300/80 whitespace-pre-wrap leading-relaxed">{trade.lessonsLearned}</p>
                  </div>
                )}
              </div>
            </DarkCard>
          )}

          {/* Tags Card */}
          {trade.tags.length > 0 && (
            <DarkCard>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-[#8B5CF6]" />
                <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Tags</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {trade.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1] border border-white/[0.04] text-xs font-medium"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </DarkCard>
          )}
        </div>
      </div>

      {/* === Delete Confirmation === */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161618] border-white/[0.06]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Delete Trade</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete this {trade.symbol} trade? This action cannot be undone. All associated screenshots and tags will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="bg-white/[0.06] text-zinc-300 border-white/[0.06] hover:bg-white/[0.1]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Deleting...' : 'Delete Trade'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* === Screenshot Lightbox === */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="max-w-5xl p-0 overflow-hidden bg-black/95 border-white/[0.06] backdrop-blur-xl"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            Screenshot - {currentScreenshot?.label}
          </DialogTitle>
          {currentScreenshot && (
            <div className="relative flex flex-col items-center">
              <div className="flex items-center justify-between w-full px-4 py-3 bg-white/[0.03] border-b border-white/[0.06]">
                <ScreenshotLabelBadge label={currentScreenshot.label} />
                <span className="text-xs text-zinc-500">
                  {lightboxIndex + 1} / {trade.screenshots.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-zinc-400 hover:text-white hover:bg-white/10 h-8 w-8"
                  onClick={() => setLightboxOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="relative w-full flex items-center justify-center bg-black min-h-[50vh]">
                <img
                  src={currentScreenshot.imageUrl}
                  alt={currentScreenshot.label}
                  className="max-h-[75vh] max-w-full object-contain"
                />
                {trade.screenshots.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full bg-black/40"
                      onClick={lightboxPrev}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full bg-black/40"
                      onClick={lightboxNext}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
