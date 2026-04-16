'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';
import { LoadingSpinner, ErrorState } from '@/components/common/loading';
import { Card, CardContent } from '@/components/ui/card';
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
  userId: string;
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
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return {
      startDate: format(weekStart, 'yyyy-MM-dd'),
      endDate: format(weekEnd, 'yyyy-MM-dd'),
    };
  }
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  return {
    startDate: format(monthStart, 'yyyy-MM-dd'),
    endDate: format(monthEnd, 'yyyy-MM-dd'),
  };
}

// --- Main Component ---

export default function PeriodReviewPage({
  reviewId,
  periodType: periodTypeProp,
}: {
  reviewId?: string;
  periodType?: string;
}) {
  const { navigate } = useRouter();
  const isEditing = !!reviewId;
  const periodType: PeriodType = (isEditing ? undefined : periodTypeProp) as PeriodType || 'weekly';

  // Form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [performanceSummary, setPerformanceSummary] = useState('');
  const [bestSetups, setBestSetups] = useState('');
  const [repeatedMistakes, setRepeatedMistakes] = useState('');
  const [ruleViolations, setRuleViolations] = useState('');
  const [improvementPlan, setImprovementPlan] = useState('');

  // UI state
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Initialize dates for new review
  useEffect(() => {
    if (!isEditing) {
      const defaults = getDefaultDates(periodType);
      setStartDate(defaults.startDate);
      setEndDate(defaults.endDate);
    }
  }, [isEditing, periodType]);

  // Fetch existing review
  const fetchReview = useCallback(async () => {
    if (!reviewId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/reviews/period/${reviewId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PeriodReviewData = await res.json();

      const startParsed = parseISO(data.startDate);
      const endParsed = parseISO(data.endDate);
      setStartDate(isValid(startParsed) ? format(startParsed, 'yyyy-MM-dd') : data.startDate.slice(0, 10));
      setEndDate(isValid(endParsed) ? format(endParsed, 'yyyy-MM-dd') : data.endDate.slice(0, 10));
      setPerformanceSummary(data.performanceSummary || '');
      setBestSetups(data.bestSetups || '');
      setRepeatedMistakes(data.repeatedMistakes || '');
      setRuleViolations(data.ruleViolations || '');
      setImprovementPlan(data.improvementPlan || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load review');
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  // Save handler
  const handleSave = async () => {
    if (!startDate || !endDate) return;
    try {
      setSaving(true);
      setError(null);

      const payload = {
        periodType: isEditing ? undefined : periodType,
        startDate,
        endDate,
        performanceSummary: performanceSummary || null,
        bestSetups: bestSetups || null,
        repeatedMistakes: repeatedMistakes || null,
        ruleViolations: ruleViolations || null,
        improvementPlan: improvementPlan || null,
      };

      const url = isEditing ? `/api/reviews/period/${reviewId}` : '/api/reviews/period';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      navigate('reviews');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!reviewId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/reviews/period/${reviewId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate('reviews');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete review');
    } finally {
      setDeleting(false);
    }
  };

  const displayType = isEditing ? periodType : periodTypeProp;

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto w-full">
      {/* === Header === */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('reviews')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {isEditing ? 'Edit' : 'New'} {displayType ? (
              <Badge variant="outline" className="capitalize text-sm font-semibold">
                {displayType}
              </Badge>
            ) : null} Review
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEditing
              ? `Update your ${displayType || ''} trading review`
              : `Analyze your ${displayType || ''} trading performance`}
          </p>
        </div>
        {isEditing && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </Button>
        )}
      </div>

      {/* === Error Banner === */}
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive flex-1">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* === Form === */}
      <Card className="gap-0 py-0">
        <CardContent className="p-6 space-y-6">
          {/* Period Type */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>Period Type</Label>
              <div>
                <Badge variant="secondary" className="capitalize text-sm px-3 py-1">
                  {displayType}
                </Badge>
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date <span className="text-destructive">*</span></Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date <span className="text-destructive">*</span></Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Performance Summary */}
          <div className="space-y-2">
            <Label htmlFor="performanceSummary">Performance Summary</Label>
            <Textarea
              id="performanceSummary"
              placeholder={`Overall performance for this ${displayType || 'period'}...`}
              value={performanceSummary}
              onChange={(e) => setPerformanceSummary(e.target.value)}
              rows={4}
            />
          </div>

          {/* Best Setups */}
          <div className="space-y-2">
            <Label htmlFor="bestSetups">Best Setups</Label>
            <Textarea
              id="bestSetups"
              placeholder="What trading setups worked best this period..."
              value={bestSetups}
              onChange={(e) => setBestSetups(e.target.value)}
              rows={3}
            />
          </div>

          {/* Repeated Mistakes */}
          <div className="space-y-2">
            <Label htmlFor="repeatedMistakes">Repeated Mistakes</Label>
            <Textarea
              id="repeatedMistakes"
              placeholder="Mistakes that kept recurring this period..."
              value={repeatedMistakes}
              onChange={(e) => setRepeatedMistakes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Rule Violations */}
          <div className="space-y-2">
            <Label htmlFor="ruleViolations">Rule Violations</Label>
            <Textarea
              id="ruleViolations"
              placeholder="Any trading rules you violated..."
              value={ruleViolations}
              onChange={(e) => setRuleViolations(e.target.value)}
              rows={3}
            />
          </div>

          {/* Improvement Plan */}
          <div className="space-y-2">
            <Label htmlFor="improvementPlan">Improvement Plan</Label>
            <Textarea
              id="improvementPlan"
              placeholder="Your plan to improve for next period..."
              value={improvementPlan}
              onChange={(e) => setImprovementPlan(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* === Actions === */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('reviews')}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || !startDate || !endDate}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1.5" />
          )}
          {isEditing ? 'Update Review' : 'Save Review'}
        </Button>
      </div>

      {/* === Delete Dialog === */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Period Review
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <LoadingSpinner className="w-4 h-4 mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
