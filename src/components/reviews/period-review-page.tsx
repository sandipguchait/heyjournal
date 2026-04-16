'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';
import { LoadingSpinner, ErrorState } from '@/components/common/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Save,
  Trash2,
  BookOpen,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { format, parseISO, isValid, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import type { PeriodType } from '@/types';

interface PeriodReviewData {
  id: string;
  periodType: string;
  startDate: string;
  endDate: string;
  performanceSummary: string | null;
  bestSetups: string | null;
  repeatedMistakes: string | null;
  ruleViolations: string | null;
  improvementPlan: string | null;
}

function getDefaultDates(periodType: PeriodType): { startDate: string; endDate: string } {
  const now = new Date();
  if (periodType === 'weekly') {
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    const we = endOfWeek(now, { weekStartsOn: 1 });
    return { startDate: format(ws, 'yyyy-MM-dd'), endDate: format(we, 'yyyy-MM-dd') };
  }
  const ms = startOfMonth(now);
  const me = endOfMonth(now);
  return { startDate: format(ms, 'yyyy-MM-dd'), endDate: format(me, 'yyyy-MM-dd') };
}

const darkCard = 'bg-[#161618] rounded-xl border border-white/[0.06] p-5';
const darkInput = 'bg-white/[0.03] border-white/[0.08] rounded-lg focus:border-primary/50';

export default function PeriodReviewPage({ reviewId, periodType: periodTypeProp }: { reviewId?: string; periodType?: string }) {
  const { navigate } = useRouter();
  const isEditing = !!reviewId;
  const periodType: PeriodType = (isEditing ? undefined : periodTypeProp) as PeriodType || 'weekly';

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [performanceSummary, setPerformanceSummary] = useState('');
  const [bestSetups, setBestSetups] = useState('');
  const [repeatedMistakes, setRepeatedMistakes] = useState('');
  const [ruleViolations, setRuleViolations] = useState('');
  const [improvementPlan, setImprovementPlan] = useState('');

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      const defaults = getDefaultDates(periodType);
      setStartDate(defaults.startDate);
      setEndDate(defaults.endDate);
    }
  }, [isEditing, periodType]);

  const fetchReview = useCallback(async () => {
    if (!reviewId) return;
    try {
      setLoading(true); setError(null);
      const res = await fetch(`/api/reviews/period/${reviewId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PeriodReviewData = await res.json();
      const sp = parseISO(data.startDate);
      const ep = parseISO(data.endDate);
      setStartDate(isValid(sp) ? format(sp, 'yyyy-MM-dd') : data.startDate.slice(0, 10));
      setEndDate(isValid(ep) ? format(ep, 'yyyy-MM-dd') : data.endDate.slice(0, 10));
      setPerformanceSummary(data.performanceSummary || '');
      setBestSetups(data.bestSetups || '');
      setRepeatedMistakes(data.repeatedMistakes || '');
      setRuleViolations(data.ruleViolations || '');
      setImprovementPlan(data.improvementPlan || '');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load review'); }
    finally { setLoading(false); }
  }, [reviewId]);

  useEffect(() => { fetchReview(); }, [fetchReview]);

  const handleSave = async () => {
    if (!startDate || !endDate) return;
    try {
      setSaving(true); setError(null);
      const payload = { periodType: isEditing ? undefined : periodType, startDate, endDate, performanceSummary: performanceSummary || null, bestSetups: bestSetups || null, repeatedMistakes: repeatedMistakes || null, ruleViolations: ruleViolations || null, improvementPlan: improvementPlan || null };
      const url = isEditing ? `/api/reviews/period/${reviewId}` : '/api/reviews/period';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || `HTTP ${res.status}`); }
      navigate('reviews');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save review'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!reviewId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/reviews/period/${reviewId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate('reviews');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete review'); }
    finally { setDeleting(false); }
  };

  const displayType = isEditing ? periodType : periodTypeProp;

  if (loading) return <div className="flex items-center justify-center h-96"><LoadingSpinner className="w-8 h-8" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => navigate('reviews')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {isEditing ? 'Edit' : 'New'}{' '}
            {displayType ? <Badge className="bg-primary/15 text-primary text-sm font-semibold capitalize border-0 px-2">{displayType}</Badge> : null} Review
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEditing ? `Update your ${displayType || ''} trading review` : `Analyze your ${displayType || ''} trading performance`}
          </p>
        </div>
        {isEditing && (
          <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 bg-white/[0.05] border-white/[0.08] rounded-xl" onClick={() => setShowDelete(true)}>
            <Trash2 className="w-4 h-4 mr-1.5" /> Delete
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-muted-foreground hover:text-foreground">Dismiss</Button>
        </div>
      )}

      {/* Form */}
      <div className={cn(darkCard, 'space-y-6')}>
        {!isEditing && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Period Type</Label>
            <div><Badge className="bg-primary/15 text-primary text-sm px-3 py-1 capitalize border-0">{displayType}</Badge></div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Start Date <span className="text-red-400">*</span></Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={darkInput} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">End Date <span className="text-red-400">*</span></Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={darkInput} />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Performance Summary</Label>
          <Textarea placeholder={`Overall performance for this ${displayType || 'period'}...`} value={performanceSummary} onChange={(e) => setPerformanceSummary(e.target.value)} rows={4} className={darkInput} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Best Setups</Label>
          <Textarea placeholder="What trading setups worked best this period..." value={bestSetups} onChange={(e) => setBestSetups(e.target.value)} rows={3} className={darkInput} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Repeated Mistakes</Label>
          <Textarea placeholder="Mistakes that kept recurring this period..." value={repeatedMistakes} onChange={(e) => setRepeatedMistakes(e.target.value)} rows={3} className={darkInput} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Rule Violations</Label>
          <Textarea placeholder="Any trading rules you violated..." value={ruleViolations} onChange={(e) => setRuleViolations(e.target.value)} rows={3} className={darkInput} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Improvement Plan</Label>
          <Textarea placeholder="Your plan to improve for next period..." value={improvementPlan} onChange={(e) => setImprovementPlan(e.target.value)} rows={4} className={darkInput} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('reviews')} className="bg-white/[0.05] border-white/[0.08] rounded-xl">Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !startDate || !endDate} className="bg-primary text-primary-foreground rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
          {isEditing ? 'Update Review' : 'Save Review'}
        </Button>
      </div>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-[#161618] border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" /> Delete Period Review</DialogTitle>
            <DialogDescription className="text-muted-foreground">Are you sure? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} disabled={deleting} className="bg-white/[0.05] border-white/[0.08] rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="rounded-xl">
              {deleting ? <LoadingSpinner className="w-4 h-4 mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
