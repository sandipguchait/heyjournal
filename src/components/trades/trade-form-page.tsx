'use client';

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';
import { CurrencyBadge, LoadingSpinner, ErrorState } from '@/components/common/loading';
import { format } from 'date-fns';
import type {
  MarketType,
  Direction,
  TradeStatus,
  ScreenshotLabel,
  EmotionalState,
} from '@/types';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Save,
  Trash2,
  Copy,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Upload,
  ImagePlus,
  TrendingUp,
  TrendingDown,
  Calculator,
  Loader2,
  Tag,
  AlertCircle,
  Brain,
  BarChart3,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

// ─── Indian Market Presets ──────────────────────────────────────────────────

const MARKET_TYPES: { value: MarketType; label: string; desc: string }[] = [
  { value: 'stocks', label: 'Equity', desc: 'NSE / BSE' },
  { value: 'futures', label: 'Futures', desc: 'NSE F&O' },
  { value: 'options', label: 'Options', desc: 'NSE F&O' },
  { value: 'stocks', label: 'Commodity', desc: 'MCX' },
  { value: 'futures', label: 'Currency', desc: 'NSE' },
];

const MARKET_TYPE_OPTIONS: { value: string; label: string; sublabel: string }[] = [
  { value: 'equity', label: 'Equity', sublabel: 'NSE / BSE' },
  { value: 'futures', label: 'Futures', sublabel: 'NSE F&O' },
  { value: 'options', label: 'Options', sublabel: 'NSE F&O' },
  { value: 'commodity', label: 'Commodity', sublabel: 'MCX' },
  { value: 'currency', label: 'Currency', sublabel: 'NSE' },
];

const STRATEGY_PRESETS = [
  'Breakout',
  'Pullback',
  'Trend Following',
  'Mean Reversion',
  'Scalping',
  'Swing Trade',
  'Momentum',
  'Support/Resistance',
  'VWAP Strategy',
  'Gap Up/Down',
  'Opening Range Breakout',
  'Fibonacci Retracement',
  'Olam High-Low',
  'Renko Chart',
  'Candlestick Pattern',
];

const BROKER_PRESETS = [
  'Zerodha',
  'Groww',
  'Angel One',
  'Upstox',
  'ICICI Direct',
  'HDFC Securities',
  'Kotak Securities',
  'Motilal Oswal',
  '5paisa',
  'Sharekhan',
  'Edelweiss',
  'Other',
];

const TIMEFRAME_OPTIONS = [
  { value: '1m', label: '1 Min' },
  { value: '3m', label: '3 Min' },
  { value: '5m', label: '5 Min' },
  { value: '15m', label: '15 Min' },
  { value: '30m', label: '30 Min' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hour' },
  { value: '1D', label: '1 Day' },
  { value: '1W', label: '1 Week' },
];

const EMOTIONAL_STATES: EmotionalState[] = [
  'calm',
  'confident',
  'anxious',
  'fearful',
  'greedy',
  'frustrated',
  'excited',
  'neutral',
];

const SCREENSHOT_LABELS: { value: ScreenshotLabel; label: string }[] = [
  { value: 'pre-entry', label: 'Pre-Entry' },
  { value: 'entry', label: 'Entry' },
  { value: 'exit', label: 'Exit' },
  { value: 'review', label: 'Review' },
];

const STATUS_OPTIONS: { value: TradeStatus; label: string; color: string }[] = [
  { value: 'open', label: 'Open', color: 'bg-emerald-500' },
  { value: 'closed', label: 'Closed', color: 'bg-muted-foreground' },
  { value: 'draft', label: 'Draft', color: 'bg-amber-500' },
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface Tag {
  id: string;
  name: string;
  tradeCount?: number;
}

interface ExistingScreenshot {
  id: string;
  imageUrl: string;
  label: ScreenshotLabel;
  sortOrder: number;
}

interface NewScreenshot {
  file: File;
  previewUrl: string;
  label: ScreenshotLabel;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function calculatePnL(fields: {
  direction: Direction;
  entryPrice: number;
  exitPrice: number | undefined;
  quantity: number;
  stopLoss: number | undefined;
  fees: number;
}) {
  const { direction, entryPrice, exitPrice, quantity, stopLoss, fees } = fields;
  let pnl = 0;
  let pnlPercent = 0;
  let rMultiple: number | null = null;

  if (exitPrice != null && entryPrice > 0) {
    if (direction === 'long') {
      pnl = (exitPrice - entryPrice) * quantity - fees;
    } else {
      pnl = (entryPrice - exitPrice) * quantity - fees;
    }
    pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
    if (direction === 'short') pnlPercent = -pnlPercent;

    if (stopLoss != null && Math.abs(entryPrice - stopLoss) > 0) {
      const totalRisk = Math.abs(entryPrice - stopLoss) * quantity;
      if (totalRisk > 0) rMultiple = pnl / totalRisk;
    }
  }

  return { pnl, pnlPercent, rMultiple };
}

// ─── Dark Card Wrapper ──────────────────────────────────────────────────────

function DarkCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-[#161618] rounded-xl border border-white/[0.06] p-5',
        className
      )}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
    </div>
  );
}

// ─── Collapsible Section Card (outside component to prevent remount on re-render) ────

const SectionCard = memo(function SectionCard({
  sectionKey,
  title,
  icon: Icon,
  children,
  className,
  defaultOpen,
  openSections,
  onToggle,
}: {
  sectionKey: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  openSections: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const isOpen = openSections[sectionKey] ?? defaultOpen ?? true;
  return (
    <div className={cn('bg-[#161618] rounded-xl border border-white/[0.06]', className)}>
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h3>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <>
          <Separator className="bg-white/[0.06]" />
          <div className="p-5 space-y-4">{children}</div>
        </>
      )}
    </div>
  );
});

// ─── Rating Slider (outside component to prevent remount on re-render) ────

const RatingSlider = memo(function RatingSlider({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        <span className="text-sm font-medium text-muted-foreground">
          {value > 0 ? `${value}/5` : '—'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          min={0}
          max={5}
          step={1}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          className="flex-1"
        />
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star === value ? 0 : star)}
              className="w-6 h-6 flex items-center justify-center transition-colors"
            >
              <svg
                className={cn(
                  'w-4 h-4',
                  star <= value ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'
                )}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                fill="none"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

// ─── Component ──────────────────────────────────────────────────────────────

export default function TradeFormPage({ tradeId }: { tradeId?: string }) {
  const router = useRouter();
  const isEdit = !!tradeId;

  // ─── Loading / Error States ─────────────────────────────────────────────

  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);

  // ─── Collapsible Sections ──────────────────────────────────────────────

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    price: true,
    details: true,
    psychology: false,
    screenshots: false,
  });

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ─── Form Fields ───────────────────────────────────────────────────────

  const [symbol, setSymbol] = useState('');
  const [marketType, setMarketType] = useState<string>('equity');
  const [direction, setDirection] = useState<Direction>('long');
  const [tradeDate, setTradeDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [entryTime, setEntryTime] = useState('');
  const [exitTime, setExitTime] = useState('');
  const [status, setStatus] = useState<TradeStatus>('closed');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [stopLoss, setStopLoss] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [fees, setFees] = useState('0');
  const [strategy, setStrategy] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [accountName, setAccountName] = useState('');
  const [broker, setBroker] = useState('');
  const [setupQuality, setSetupQuality] = useState(0);
  const [confidenceRating, setConfidenceRating] = useState(0);
  const [emotionalStateBefore, setEmotionalStateBefore] = useState<EmotionalState | ''>('');
  const [emotionalStateAfter, setEmotionalStateAfter] = useState<EmotionalState | ''>('');
  const [notes, setNotes] = useState('');
  const [mistakes, setMistakes] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // ─── Tags ──────────────────────────────────────────────────────────────

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  // ─── Screenshots ───────────────────────────────────────────────────────

  const [existingScreenshots, setExistingScreenshots] = useState<ExistingScreenshot[]>([]);
  const [newScreenshots, setNewScreenshots] = useState<NewScreenshot[]>([]);
  const [uploadingScreenshots, setUploadingScreenshots] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // ─── Validation ────────────────────────────────────────────────────────

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Fetch trade data for editing ──────────────────────────────────────

  useEffect(() => {
    if (!tradeId) return;

    async function fetchTrade() {
      setFetching(true);
      setFetchError('');
      try {
        const res = await fetch(`/api/trades/${tradeId}`);
        if (!res.ok) throw new Error('Failed to load trade');
        const trade = await res.json();

        setSymbol(trade.symbol || '');

        // Map old market types to new ones
        const mt = trade.marketType || 'stocks';
        if (mt === 'stocks') setMarketType('equity');
        else if (mt === 'futures') setMarketType('futures');
        else if (mt === 'options') setMarketType('options');
        else if (mt === 'crypto' || mt === 'forex') setMarketType('equity');
        else setMarketType('equity');

        setDirection((trade.direction as Direction) || 'long');
        setTradeDate(trade.tradeDate ? format(new Date(trade.tradeDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
        setEntryTime(trade.entryTime ? format(new Date(trade.entryTime), 'HH:mm') : '');
        setExitTime(trade.exitTime ? format(new Date(trade.exitTime), 'HH:mm') : '');
        setStatus((trade.status as TradeStatus) || 'closed');
        setEntryPrice(trade.entryPrice != null ? String(trade.entryPrice) : '');
        setExitPrice(trade.exitPrice != null ? String(trade.exitPrice) : '');
        setQuantity(trade.quantity != null ? String(trade.quantity) : '1');
        setStopLoss(trade.stopLoss != null ? String(trade.stopLoss) : '');
        setTargetPrice(trade.targetPrice != null ? String(trade.targetPrice) : '');
        setFees(trade.fees != null ? String(trade.fees) : '0');
        setStrategy(trade.strategy || '');
        setTimeframe(trade.timeframe || '');
        setAccountName(trade.accountName || '');
        setBroker(trade.broker || '');
        setSetupQuality(trade.setupQuality || 0);
        setConfidenceRating(trade.confidenceRating || 0);
        setEmotionalStateBefore((trade.emotionalStateBefore as EmotionalState) || '');
        setEmotionalStateAfter((trade.emotionalStateAfter as EmotionalState) || '');
        setNotes(trade.notes || '');
        setMistakes(trade.mistakes || '');
        setLessonsLearned(trade.lessonsLearned || '');
        setSelectedTagIds(
          Array.isArray(trade.tags) ? trade.tags.map((t: Tag) => t.id) : []
        );
        setExistingScreenshots(
          Array.isArray(trade.screenshots) ? trade.screenshots : []
        );
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setFetching(false);
      }
    }

    fetchTrade();
  }, [tradeId]);

  // ─── Fetch tags ────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchTags() {
      try {
        const res = await fetch('/api/tags');
        if (res.ok) {
          const data = await res.json();
          setAvailableTags(Array.isArray(data) ? data : []);
        }
      } catch {
        // silently ignore
      }
    }
    fetchTags();
  }, []);

  // ─── Auto-calculated P/L ──────────────────────────────────────────────

  const { pnl, pnlPercent, rMultiple } = calculatePnL({
    direction,
    entryPrice: parseFloat(entryPrice) || 0,
    exitPrice: exitPrice ? parseFloat(exitPrice) : undefined,
    quantity: parseFloat(quantity) || 0,
    stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
    fees: parseFloat(fees) || 0,
  });

  // ─── Create tag ────────────────────────────────────────────────────────

  const handleCreateTag = useCallback(async () => {
    const trimmed = newTagName.trim();
    if (!trimmed || creatingTag) return;

    setCreatingTag(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        const tag = await res.json();
        setAvailableTags((prev) => [...prev, tag]);
        setSelectedTagIds((prev) => [...prev, tag.id]);
        setNewTagName('');
      }
    } catch {
      // silently ignore
    } finally {
      setCreatingTag(false);
    }
  }, [newTagName, creatingTag]);

  // ─── Toggle tag selection ──────────────────────────────────────────────

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  // ─── Screenshot handlers ───────────────────────────────────────────────

  function handleFileSelect(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const newOnes: NewScreenshot[] = arr.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      label: 'entry' as ScreenshotLabel,
    }));
    setNewScreenshots((prev) => [...prev, ...newOnes]);
    setOpenSections((prev) => ({ ...prev, screenshots: true }));
  }

  function updateNewScreenshotLabel(index: number, label: ScreenshotLabel) {
    setNewScreenshots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, label } : s))
    );
  }

  function removeNewScreenshot(index: number) {
    setNewScreenshots((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function removeExistingScreenshot(id: string) {
    setExistingScreenshots((prev) => prev.filter((s) => s.id !== id));
  }

  // ─── Drag & drop ───────────────────────────────────────────────────────

  const [dragActive, setDragActive] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  }

  // ─── Validation ────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!symbol.trim()) errs.symbol = 'Symbol is required';
    if (!tradeDate) errs.tradeDate = 'Trade date is required';
    if (!entryPrice || parseFloat(entryPrice) <= 0) errs.entryPrice = 'Valid entry price is required';
    if (!quantity || parseFloat(quantity) <= 0) errs.quantity = 'Valid quantity is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Map marketType for API ────────────────────────────────────────────

  function mapMarketTypeForApi(mt: string): MarketType {
    if (mt === 'equity' || mt === 'commodity') return 'stocks';
    if (mt === 'futures') return 'futures';
    if (mt === 'options') return 'options';
    if (mt === 'currency') return 'futures';
    return 'stocks';
  }

  // ─── Save ──────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setErrors({});

    try {
      const body: Record<string, unknown> = {
        symbol: symbol.trim(),
        marketType: mapMarketTypeForApi(marketType),
        direction,
        tradeDate,
        entryTime: entryTime ? `${tradeDate}T${entryTime}:00` : undefined,
        exitTime: exitTime ? `${tradeDate}T${exitTime}:00` : undefined,
        entryPrice: parseFloat(entryPrice),
        exitPrice: exitPrice ? parseFloat(exitPrice) : undefined,
        quantity: parseFloat(quantity),
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        fees: parseFloat(fees) || 0,
        status,
        strategy: strategy || undefined,
        timeframe: timeframe || undefined,
        accountName: accountName || undefined,
        broker: broker || undefined,
        setupQuality: setupQuality || undefined,
        confidenceRating: confidenceRating || undefined,
        emotionalStateBefore: emotionalStateBefore || undefined,
        emotionalStateAfter: emotionalStateAfter || undefined,
        notes: notes || undefined,
        mistakes: mistakes || undefined,
        lessonsLearned: lessonsLearned || undefined,
        tagIds: selectedTagIds,
      };

      // Remove undefined values
      for (const key of Object.keys(body)) {
        if (body[key] === undefined) delete body[key];
      }

      let savedTradeId = tradeId;

      if (isEdit) {
        const res = await fetch(`/api/trades/${tradeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to update trade' }));
          throw new Error(data.error || 'Failed to update trade');
        }
      } else {
        const res = await fetch('/api/trades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to create trade' }));
          throw new Error(data.error || 'Failed to create trade');
        }
        const data = await res.json();
        savedTradeId = data.id;
      }

      // Upload new screenshots
      if (savedTradeId && newScreenshots.length > 0) {
        setUploadingScreenshots(true);
        for (const screenshot of newScreenshots) {
          try {
            const formData = new FormData();
            formData.append('file', screenshot.file);
            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });
            if (!uploadRes.ok) continue;
            const uploadData = await uploadRes.json();

            await fetch('/api/screenshots', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tradeId: savedTradeId,
                imageUrl: uploadData.url,
                label: screenshot.label,
                sortOrder: existingScreenshots.length + newScreenshots.indexOf(screenshot),
              }),
            });
          } catch {
            // Continue with remaining screenshots
          }
        }
        setUploadingScreenshots(false);
      }

      router.navigate(`trades/${savedTradeId}`);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Save failed' });
      setSaving(false);
    }
  }

  // ─── Duplicate ─────────────────────────────────────────────────────────

  async function handleDuplicate() {
    if (!tradeId || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/trades/${tradeId}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to duplicate');
      const data = await res.json();
      router.navigate(`trades/${data.id}`);
    } catch {
      setErrors({ submit: 'Failed to duplicate trade' });
      setSaving(false);
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!tradeId || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/trades/${tradeId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.navigate('journal');
    } catch {
      setErrors({ submit: 'Failed to delete trade' });
      setSaving(false);
    }
  }

  // ─── Render: Fetching State ────────────────────────────────────────────

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner className="h-8 w-8" />
          <p className="text-sm text-muted-foreground">Loading trade data...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-6">
        <ErrorState message={fetchError} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  // ─── Render: Form ──────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Go back"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">
              {isEdit ? 'Edit Trade' : 'New Trade'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEdit
                ? `Editing ${symbol || 'trade'}`
                : 'Record a new trade entry'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEdit && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    className="bg-white/[0.05] border-white/[0.08] rounded-xl hover:bg-white/[0.08]"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#161618] border-white/[0.06]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this trade?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      This action cannot be undone. This will permanently delete
                      the trade and all associated screenshots.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-white/[0.05] border-white/[0.08] rounded-xl">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-white hover:bg-destructive/90 rounded-xl"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicate}
                disabled={saving}
                className="bg-white/[0.05] border-white/[0.08] rounded-xl hover:bg-white/[0.08]"
              >
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            disabled={saving}
            className="bg-white/[0.05] border-white/[0.08] rounded-xl hover:bg-white/[0.08]"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || uploadingScreenshots}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {saving
              ? 'Saving...'
              : uploadingScreenshots
                ? 'Uploading...'
                : 'Save Trade'}
          </Button>
        </div>
      </div>

      {/* Global Error */}
      {errors.submit && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errors.submit}
        </div>
      )}

      {/* Two-column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ─── Left Column: Basic Info + Price + Tags ────────────────── */}

        <div className="space-y-5">
          {/* Trade Information Section */}
          <SectionCard sectionKey="basic" title="Trade Information" icon={BarChart3} openSections={openSections} onToggle={toggleSection}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Symbol */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="symbol" className="text-sm text-muted-foreground">
                  Symbol <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="symbol"
                  placeholder="e.g., RELIANCE, NIFTY 50, BANKNIFTY"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className={cn(
                    'bg-white/[0.03] border-white/[0.08] rounded-lg focus:border-primary',
                    errors.symbol && 'border-red-500'
                  )}
                />
                {errors.symbol && (
                  <p className="text-xs text-red-400">{errors.symbol}</p>
                )}
              </div>

              {/* Market Type */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm text-muted-foreground">Market Type</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {MARKET_TYPE_OPTIONS.map((mt) => (
                    <button
                      key={mt.value}
                      type="button"
                      onClick={() => setMarketType(mt.value)}
                      className={cn(
                        'flex flex-col items-center gap-0.5 p-3 rounded-xl border transition-all text-center',
                        marketType === mt.value
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-white/[0.03] border-white/[0.08] text-muted-foreground hover:bg-white/[0.05] hover:border-white/[0.12]'
                      )}
                    >
                      <span className="text-xs font-medium">{mt.label}</span>
                      <span className="text-[10px] opacity-60">{mt.sublabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm text-muted-foreground">Direction</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDirection('long')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all font-medium text-sm',
                      direction === 'long'
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                        : 'bg-white/[0.03] border-white/[0.08] text-muted-foreground hover:bg-white/[0.05]'
                    )}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('short')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all font-medium text-sm',
                      direction === 'short'
                        ? 'bg-red-500/15 border-red-500/50 text-red-400'
                        : 'bg-white/[0.03] border-white/[0.08] text-muted-foreground hover:bg-white/[0.05]'
                    )}
                  >
                    <ArrowDownRight className="h-4 w-4" />
                    SHORT
                  </button>
                </div>
              </div>

              {/* Trade Date */}
              <div className="space-y-1.5">
                <Label htmlFor="tradeDate" className="text-sm text-muted-foreground">
                  Trade Date <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="tradeDate"
                  type="date"
                  value={tradeDate}
                  onChange={(e) => setTradeDate(e.target.value)}
                  className={cn(
                    'bg-white/[0.03] border-white/[0.08] rounded-lg focus:border-primary',
                    errors.tradeDate && 'border-red-500'
                  )}
                />
                {errors.tradeDate && (
                  <p className="text-xs text-red-400">{errors.tradeDate}</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as TradeStatus)}
                >
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] rounded-lg">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161618] border-white/[0.06]">
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-block w-2 h-2 rounded-full',
                              s.color
                            )}
                          />
                          {s.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Entry Time */}
              <div className="space-y-1.5">
                <Label htmlFor="entryTime" className="text-sm text-muted-foreground">
                  Entry Time
                </Label>
                <Input
                  id="entryTime"
                  type="time"
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.08] rounded-lg"
                />
              </div>

              {/* Exit Time */}
              <div className="space-y-1.5">
                <Label htmlFor="exitTime" className="text-sm text-muted-foreground">
                  Exit Time
                </Label>
                <Input
                  id="exitTime"
                  type="time"
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.08] rounded-lg"
                />
              </div>
            </div>
          </SectionCard>

          {/* Price & Quantity Section */}
          <SectionCard sectionKey="price" title="Price & Quantity" icon={Calculator} openSections={openSections} onToggle={toggleSection}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Entry Price */}
              <div className="space-y-1.5">
                <Label htmlFor="entryPrice" className="text-sm text-muted-foreground">
                  Entry Price (₹) <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="entryPrice"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className={cn(
                    'bg-white/[0.03] border-white/[0.08] rounded-lg focus:border-primary',
                    errors.entryPrice && 'border-red-500'
                  )}
                />
                {errors.entryPrice && (
                  <p className="text-xs text-red-400">{errors.entryPrice}</p>
                )}
              </div>

              {/* Exit Price */}
              <div className="space-y-1.5">
                <Label htmlFor="exitPrice" className="text-sm text-muted-foreground">
                  Exit Price (₹)
                </Label>
                <Input
                  id="exitPrice"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.08] rounded-lg"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <Label htmlFor="quantity" className="text-sm text-muted-foreground">
                  Quantity <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={cn(
                    'bg-white/[0.03] border-white/[0.08] rounded-lg focus:border-primary',
                    errors.quantity && 'border-red-500'
                  )}
                />
                {errors.quantity && (
                  <p className="text-xs text-red-400">{errors.quantity}</p>
                )}
              </div>

              {/* Stop Loss */}
              <div className="space-y-1.5">
                <Label htmlFor="stopLoss" className="text-sm text-muted-foreground">
                  Stop Loss (₹)
                </Label>
                <Input
                  id="stopLoss"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.08] rounded-lg"
                />
              </div>

              {/* Target Price */}
              <div className="space-y-1.5">
                <Label htmlFor="targetPrice" className="text-sm text-muted-foreground">
                  Target (₹)
                </Label>
                <Input
                  id="targetPrice"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.08] rounded-lg"
                />
              </div>

              {/* Fees */}
              <div className="space-y-1.5">
                <Label htmlFor="fees" className="text-sm text-muted-foreground">
                  Fees (₹)
                </Label>
                <Input
                  id="fees"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.08] rounded-lg"
                />
              </div>
            </div>

            {/* Auto-calculated P/L */}
            {exitPrice && parseFloat(exitPrice) > 0 && (
              <>
                <Separator className="bg-white/[0.06] my-2" />
                <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">P/L</p>
                    <p className="text-sm font-bold">
                      <CurrencyBadge value={pnl} />
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">P/L %</p>
                    <p
                      className={cn(
                        'text-sm font-bold',
                        pnlPercent > 0 && 'text-emerald-400',
                        pnlPercent < 0 && 'text-red-400',
                        pnlPercent === 0 && 'text-muted-foreground'
                      )}
                    >
                      {pnlPercent >= 0 ? '+' : ''}
                      {pnlPercent.toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      R-Multiple
                    </p>
                    <p
                      className={cn(
                        'text-sm font-bold',
                        rMultiple != null && rMultiple > 0 && 'text-emerald-400',
                        rMultiple != null && rMultiple < 0 && 'text-red-400',
                        (rMultiple == null || rMultiple === 0) && 'text-muted-foreground'
                      )}
                    >
                      {rMultiple != null ? `${rMultiple.toFixed(2)}R` : '—'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </SectionCard>

          {/* Tags Section */}
          <SectionCard sectionKey="tags" title="Tags" icon={Tag} openSections={openSections} onToggle={toggleSection}>
            <div className="space-y-3">
              {/* Selected Tags */}
              <div className="flex flex-wrap gap-2">
                {selectedTagIds.length > 0 ? (
                  selectedTagIds.map((tagId) => {
                    const tag = availableTags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <Badge
                        key={tag.id}
                        className="cursor-pointer bg-primary/15 text-primary border-primary/30 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30 transition-colors"
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No tags selected — click available tags below to add
                  </p>
                )}
              </div>

              {/* Available Tags */}
              {availableTags.filter((t) => !selectedTagIds.includes(t.id)).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {availableTags
                    .filter((t) => !selectedTagIds.includes(t.id))
                    .map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="cursor-pointer bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] transition-colors"
                        onClick={() => toggleTag(tag.id)}
                      >
                        + {tag.name}
                      </Badge>
                    ))}
                </div>
              )}

              {/* Create New Tag */}
              <div className="flex gap-2">
                <Input
                  placeholder="New tag name..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateTag();
                    }
                  }}
                  className="flex-1 h-9 text-sm bg-white/[0.03] border-white/[0.08] rounded-lg"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || creatingTag}
                  className="h-9 bg-white/[0.05] border-white/[0.08] rounded-lg hover:bg-white/[0.08]"
                >
                  {creatingTag ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  Add
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ─── Right Column: Details + Psychology + Screenshots ────────── */}

        <div className="space-y-5">
          {/* Trade Details Section */}
          <SectionCard sectionKey="details" title="Trade Details" icon={FileText} openSections={openSections} onToggle={toggleSection}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Strategy */}
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Strategy</Label>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] rounded-lg">
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161618] border-white/[0.06]">
                    {STRATEGY_PRESETS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Timeframe */}
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] rounded-lg">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161618] border-white/[0.06]">
                    {TIMEFRAME_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account Name */}
              <div className="space-y-1.5">
                <Label htmlFor="accountName" className="text-sm text-muted-foreground">
                  Account Name
                </Label>
                <Input
                  id="accountName"
                  placeholder="e.g. Main Account"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.08] rounded-lg"
                />
              </div>

              {/* Broker */}
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Broker</Label>
                <Select value={broker} onValueChange={setBroker}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] rounded-lg">
                    <SelectValue placeholder="Select broker" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161618] border-white/[0.06]">
                    {BROKER_PRESETS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-white/[0.06] my-2" />

            {/* Ratings */}
            <div className="space-y-4">
              <RatingSlider
                value={setupQuality}
                onChange={setSetupQuality}
                label="Setup Quality"
              />
              <RatingSlider
                value={confidenceRating}
                onChange={setConfidenceRating}
                label="Confidence Rating"
              />
            </div>
          </SectionCard>

          {/* Psychology & Notes Section */}
          <SectionCard sectionKey="psychology" title="Psychology & Notes" icon={Brain} openSections={openSections} onToggle={toggleSection}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Emotional State Before */}
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">
                  Emotional State Before
                </Label>
                <Select
                  value={emotionalStateBefore}
                  onValueChange={(v) => setEmotionalStateBefore(v as EmotionalState)}
                >
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] rounded-lg">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161618] border-white/[0.06]">
                    {EMOTIONAL_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Emotional State After */}
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">
                  Emotional State After
                </Label>
                <Select
                  value={emotionalStateAfter}
                  onValueChange={(v) => setEmotionalStateAfter(v as EmotionalState)}
                >
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] rounded-lg">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161618] border-white/[0.06]">
                    {EMOTIONAL_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-white/[0.06] my-2" />

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm text-muted-foreground">
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="General trade notes, observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none bg-white/[0.03] border-white/[0.08] rounded-lg"
              />
            </div>

            {/* Mistakes */}
            <div className="space-y-1.5">
              <Label htmlFor="mistakes" className="text-sm text-muted-foreground">
                Mistakes
              </Label>
              <Textarea
                id="mistakes"
                placeholder="What mistakes were made during this trade?"
                value={mistakes}
                onChange={(e) => setMistakes(e.target.value)}
                rows={2}
                className="resize-none bg-white/[0.03] border-white/[0.08] rounded-lg"
              />
            </div>

            {/* Lessons Learned */}
            <div className="space-y-1.5">
              <Label htmlFor="lessonsLearned" className="text-sm text-muted-foreground">
                Lessons Learned
              </Label>
              <Textarea
                id="lessonsLearned"
                placeholder="What can be improved for next time?"
                value={lessonsLearned}
                onChange={(e) => setLessonsLearned(e.target.value)}
                rows={2}
                className="resize-none bg-white/[0.03] border-white/[0.08] rounded-lg"
              />
            </div>
          </SectionCard>

          {/* Screenshots Section */}
          <SectionCard sectionKey="screenshots" title="Screenshots" icon={ImagePlus} openSections={openSections} onToggle={toggleSection}>
            <div className="space-y-4">
              {/* Drop Zone */}
              <div
                ref={dropZoneRef}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop images here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1">
                  PNG, JPG, GIF, WebP up to 10MB each
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>

              {/* Existing Screenshots (edit mode) */}
              {existingScreenshots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Existing Screenshots
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto">
                    {existingScreenshots.map((screenshot) => (
                      <div
                        key={screenshot.id}
                        className="relative group rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.03]"
                      >
                        <img
                          src={screenshot.imageUrl}
                          alt={screenshot.label}
                          className="w-full h-28 object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge className="text-[10px] px-2 py-0.5 bg-black/60 text-white border-0 backdrop-blur-sm">
                            {screenshot.label}
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExistingScreenshot(screenshot.id)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Screenshots */}
              {newScreenshots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    New Screenshots ({newScreenshots.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto">
                    {newScreenshots.map((screenshot, index) => (
                      <div
                        key={screenshot.previewUrl}
                        className="relative group rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.03]"
                      >
                        <img
                          src={screenshot.previewUrl}
                          alt={`New screenshot ${index + 1}`}
                          className="w-full h-28 object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <select
                            value={screenshot.label}
                            onChange={(e) =>
                              updateNewScreenshotLabel(index, e.target.value as ScreenshotLabel)
                            }
                            className="text-[10px] rounded-lg border-0 bg-black/60 text-white px-2 py-0.5 cursor-pointer backdrop-blur-sm"
                          >
                            {SCREENSHOT_LABELS.map((l) => (
                              <option key={l.value} value={l.value}>
                                {l.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewScreenshot(index)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="p-2 border-t border-white/[0.06]">
                          <p className="text-[10px] text-muted-foreground truncate">
                            {screenshot.file.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Bottom Action Bar (mobile) */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-white/[0.06] rounded-xl p-3 flex items-center justify-between gap-3 lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          disabled={saving}
          className="bg-white/[0.05] border-white/[0.08] rounded-xl hover:bg-white/[0.08]"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || uploadingScreenshots}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          {saving
            ? 'Saving...'
            : uploadingScreenshots
              ? 'Uploading...'
              : 'Save Trade'}
        </Button>
      </div>
    </div>
  );
}
