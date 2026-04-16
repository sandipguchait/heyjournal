'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';
import { CurrencyBadge, LoadingSpinner, ErrorState, formatCurrency } from '@/components/common/loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DollarSign,
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

// --- Helper Components ---

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    closed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
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
        'inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-md',
        isLong
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      )}
    >
      {isLong ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
      {direction.toUpperCase()}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-0.5">{value || <span className="text-muted-foreground">&mdash;</span>}</p>
      </div>
    </div>
  );
}

function EmotionalBadge({ state }: { state: string }) {
  const colorMap: Record<string, string> = {
    calm: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    confident: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    anxious: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    fearful: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    greedy: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    frustrated: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    excited: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize', colorMap[state] || colorMap.neutral)}>
      {state}
    </span>
  );
}

function ScreenshotLabelBadge({ label }: { label: string }) {
  const colorMap: Record<string, string> = {
    'pre-entry': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    'entry': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'exit': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'review': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize', colorMap[label] || 'bg-muted text-muted-foreground')}>
      {label}
    </span>
  );
}

function RatingStars({ value, max = 5 }: { value: number | null; max?: number }) {
  if (value == null) return <span className="text-xs text-muted-foreground">&mdash;</span>;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={cn(
            'w-3 h-3 rounded-sm',
            i < value
              ? 'bg-amber-400 dark:bg-amber-500'
              : 'bg-muted'
          )}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{value}/{max}</span>
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

  const currentScreenshot = trade.screenshots[lightboxIndex];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* === Header === */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={back}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{trade.symbol}</h1>
              <DirectionBadge direction={trade.direction} />
              <StatusBadge status={trade.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {(() => {
                const d = parseISO(trade.tradeDate);
                return isValid(d) ? format(d, 'EEEE, MMMM d, yyyy') : trade.tradeDate;
              })()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="mr-2 hidden sm:block">
            <CurrencyBadge value={pnlValue} className="text-xl" />
            {trade.status === 'closed' && (
              <span className={cn(
                'text-xs font-medium ml-1',
                isWinner ? 'text-emerald-600 dark:text-emerald-400' : !isWinner && pnlValue !== 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
              )}>
                ({pnlPercentValue >= 0 ? '+' : ''}{pnlPercentValue.toFixed(2)}%)
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`trades/edit/${tradeId}`)}
          >
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            disabled={duplicating}
          >
            <Copy className="w-4 h-4 mr-1" />
            {duplicating ? 'Copying...' : 'Duplicate'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mobile P/L */}
      <div className="sm:hidden">
        <Card className="gap-4">
          <CardContent className="px-4 pb-4 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">P/L</p>
            <CurrencyBadge value={pnlValue} className="text-3xl" />
            {trade.status === 'closed' && (
              <p className={cn(
                'text-sm font-medium mt-1',
                isWinner ? 'text-emerald-600 dark:text-emerald-400' : !isWinner && pnlValue !== 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
              )}>
                {pnlPercentValue >= 0 ? '+' : ''}{pnlPercentValue.toFixed(2)}%
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === Two Column Layout === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trade Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                Trade Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
                <div className="pr-0 sm:pr-4">
                  <InfoRow icon={Calendar} label="Trade Date" value={(() => {
                    const d = parseISO(trade.tradeDate);
                    return isValid(d) ? format(d, 'MMM d, yyyy') : trade.tradeDate;
                  })()} />
                  <InfoRow icon={Clock} label="Entry Time" value={trade.entryTime ? (() => {
                    const d = parseISO(trade.entryTime);
                    return isValid(d) ? format(d, 'h:mm a') : trade.entryTime;
                  })() : null} />
                  <InfoRow icon={Clock} label="Exit Time" value={trade.exitTime ? (() => {
                    const d = parseISO(trade.exitTime);
                    return isValid(d) ? format(d, 'h:mm a') : trade.exitTime;
                  })() : null} />
                  <InfoRow icon={Globe} label="Market Type" value={<span className="capitalize">{trade.marketType}</span>} />
                </div>
                <div className="pl-0 sm:pl-4">
                  <InfoRow icon={BarChart3} label="Strategy" value={trade.strategy} />
                  <InfoRow icon={LineChart} label="Timeframe" value={trade.timeframe} />
                  <InfoRow icon={Hash} label="Account" value={trade.accountName} />
                  <InfoRow icon={Shield} label="Broker" value={trade.broker} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                Price Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Entry Price */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground font-medium">Entry Price</p>
                  <p className="text-lg font-semibold mt-1">{formatCurrency(trade.entryPrice)}</p>
                </div>

                {/* Exit Price */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground font-medium">Exit Price</p>
                  <p className="text-lg font-semibold mt-1">
                    {trade.exitPrice != null ? formatCurrency(trade.exitPrice) : <span className="text-muted-foreground">&mdash;</span>}
                  </p>
                </div>

                {/* Stop Loss */}
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">Stop Loss</p>
                  <p className="text-lg font-semibold mt-1">
                    {trade.stopLoss != null ? formatCurrency(trade.stopLoss) : <span className="text-muted-foreground">&mdash;</span>}
                  </p>
                </div>

                {/* Target Price */}
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Target</p>
                  <p className="text-lg font-semibold mt-1">
                    {trade.targetPrice != null ? formatCurrency(trade.targetPrice) : <span className="text-muted-foreground">&mdash;</span>}
                  </p>
                </div>

                {/* Quantity */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground font-medium">Quantity</p>
                  <p className="text-lg font-semibold mt-1">{trade.quantity}</p>
                </div>

                {/* Fees */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground font-medium">Fees</p>
                  <p className="text-lg font-semibold mt-1">{formatCurrency(trade.fees)}</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* P/L */}
                <div className="text-center p-3">
                  <p className="text-xs text-muted-foreground font-medium">Profit / Loss</p>
                  <CurrencyBadge value={pnlValue} className="text-xl mt-1 block" />
                </div>

                {/* P/L % */}
                <div className="text-center p-3">
                  <p className="text-xs text-muted-foreground font-medium">P/L %</p>
                  <span className={cn(
                    'text-xl font-semibold block mt-1',
                    pnlPercentValue > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                    pnlPercentValue < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                  )}>
                    {pnlPercentValue >= 0 ? '+' : ''}{pnlPercentValue.toFixed(2)}%
                  </span>
                </div>

                {/* R-Multiple */}
                <div className="text-center p-3">
                  <p className="text-xs text-muted-foreground font-medium">R-Multiple</p>
                  <span className={cn(
                    'text-xl font-semibold block mt-1',
                    trade.rMultiple != null && trade.rMultiple > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                    trade.rMultiple != null && trade.rMultiple < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                  )}>
                    {trade.rMultiple != null ? `${trade.rMultiple >= 0 ? '+' : ''}${trade.rMultiple.toFixed(2)}R` : '\u2014'}
                  </span>
                </div>

                {/* Risk Amount */}
                <div className="text-center p-3">
                  <p className="text-xs text-muted-foreground font-medium">Risk Amount</p>
                  <p className="text-xl font-semibold block mt-1">
                    {trade.riskAmount != null ? formatCurrency(trade.riskAmount) : '\u2014'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Psychology Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4 text-muted-foreground" />
                Psychology
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Before Trade</span>
                {trade.emotionalStateBefore ? (
                  <EmotionalBadge state={trade.emotionalStateBefore} />
                ) : (
                  <span className="text-xs text-muted-foreground">&mdash;</span>
                )}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">After Trade</span>
                {trade.emotionalStateAfter ? (
                  <EmotionalBadge state={trade.emotionalStateAfter} />
                ) : (
                  <span className="text-xs text-muted-foreground">&mdash;</span>
                )}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Setup Quality</span>
                <RatingStars value={trade.setupQuality} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Confidence</span>
                <RatingStars value={trade.confidenceRating} />
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          {(trade.notes || trade.mistakes || trade.lessonsLearned) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {trade.notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{trade.notes}</p>
                  </div>
                )}
                {trade.notes && trade.mistakes && <Separator />}
                {trade.mistakes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Mistakes</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-red-600 dark:text-red-400">{trade.mistakes}</p>
                  </div>
                )}
                {(trade.notes || trade.mistakes) && trade.lessonsLearned && <Separator />}
                {trade.lessonsLearned && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Lessons Learned</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-emerald-600 dark:text-emerald-400">{trade.lessonsLearned}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tags Card */}
          {trade.tags.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex flex-wrap gap-1.5">
                  {trade.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="text-xs">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Screenshots Gallery */}
          {trade.screenshots.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  Screenshots
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  {trade.screenshots.map((ss, idx) => (
                    <button
                      key={ss.id}
                      className="relative group rounded-lg overflow-hidden border border-border aspect-video bg-muted cursor-pointer"
                      onClick={() => openLightbox(idx)}
                    >
                      <img
                        src={ss.imageUrl}
                        alt={ss.label}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      <div className="absolute bottom-1 left-1">
                        <ScreenshotLabelBadge label={ss.label} />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* === Delete Confirmation === */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {trade.symbol} trade? This action cannot be undone. All associated screenshots and tags will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
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
          className="max-w-4xl p-0 overflow-hidden bg-black border-black"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            Screenshot - {currentScreenshot?.label}
          </DialogTitle>
          {currentScreenshot && (
            <div className="relative flex flex-col items-center">
              <div className="flex items-center justify-between w-full p-3 bg-black/80">
                <ScreenshotLabelBadge label={currentScreenshot.label} />
                <span className="text-xs text-white/60">
                  {lightboxIndex + 1} / {trade.screenshots.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 h-8 w-8"
                  onClick={() => setLightboxOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="relative w-full flex items-center justify-center">
                <img
                  src={currentScreenshot.imageUrl}
                  alt={currentScreenshot.label}
                  className="max-h-[70vh] max-w-full object-contain"
                />
                {trade.screenshots.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-10 w-10 rounded-full"
                      onClick={lightboxPrev}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-10 w-10 rounded-full"
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
