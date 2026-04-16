'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';
import { LoadingSpinner, ErrorState } from '@/components/common/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  CalendarCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import type { EmotionalState } from '@/types';

const EMOTIONAL_STATES: EmotionalState[] = [
  'calm', 'confident', 'anxious', 'fearful', 'greedy', 'frustrated', 'excited', 'neutral',
];

interface DailyReviewData {
  id: string;
  userId: string;
  reviewDate: string;
  summary: string | null;
  whatWentWell: string | null;
  mistakesMade: string | null;
  emotionalState: string | null;
  lessonLearned: string | null;
  tomorrowPlan: string | null;
}

// --- Main Component ---

export default function DailyReviewPage({ reviewId }: { reviewId?: string }) {
  const { navigate, back } = useRouter();
  const isEditing = !!reviewId;

  // Form state
  const [reviewDate, setReviewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState('');
  const [whatWentWell, setWhatWentWell] = useState('');
  const [mistakesMade, setMistakesMade] = useState('');
  const [emotionalState, setEmotionalState] = useState<string>('');
  const [lessonLearned, setLessonLearned] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');

  // UI state
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch existing review
  const fetchReview = useCallback(async () => {
    if (!reviewId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/reviews/daily/${reviewId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DailyReviewData = await res.json();

      const dateParsed = parseISO(data.reviewDate);
      setReviewDate(isValid(dateParsed) ? format(dateParsed, 'yyyy-MM-dd') : data.reviewDate);
      setSummary(data.summary || '');
      setWhatWentWell(data.whatWentWell || '');
      setMistakesMade(data.mistakesMade || '');
      setEmotionalState(data.emotionalState || '');
      setLessonLearned(data.lessonLearned || '');
      setTomorrowPlan(data.tomorrowPlan || '');
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
    if (!reviewDate) return;
    try {
      setSaving(true);
      setError(null);

      const payload = {
        reviewDate,
        summary: summary || null,
        whatWentWell: whatWentWell || null,
        mistakesMade: mistakesMade || null,
        emotionalState: emotionalState || null,
        lessonLearned: lessonLearned || null,
        tomorrowPlan: tomorrowPlan || null,
      };

      const url = isEditing ? `/api/reviews/daily/${reviewId}` : '/api/reviews/daily';
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
      const res = await fetch(`/api/reviews/daily/${reviewId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate('reviews');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete review');
    } finally {
      setDeleting(false);
    }
  };

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
            <CalendarCheck className="w-5 h-5" />
            {isEditing ? 'Edit Daily Review' : 'New Daily Review'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEditing ? 'Update your daily trading review' : 'Reflect on your trading day'}
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
          {/* Review Date */}
          <div className="space-y-2">
            <Label htmlFor="reviewDate">Review Date <span className="text-destructive">*</span></Label>
            <Input
              id="reviewDate"
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              placeholder="Brief summary of your trading day..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
            />
          </div>

          {/* What Went Well */}
          <div className="space-y-2">
            <Label htmlFor="whatWentWell">What Went Well</Label>
            <Textarea
              id="whatWentWell"
              placeholder="What trades or decisions worked well today..."
              value={whatWentWell}
              onChange={(e) => setWhatWentWell(e.target.value)}
              rows={3}
            />
          </div>

          {/* Mistakes Made */}
          <div className="space-y-2">
            <Label htmlFor="mistakesMade">Mistakes Made</Label>
            <Textarea
              id="mistakesMade"
              placeholder="What mistakes did you make today..."
              value={mistakesMade}
              onChange={(e) => setMistakesMade(e.target.value)}
              rows={3}
            />
          </div>

          {/* Emotional State */}
          <div className="space-y-2">
            <Label htmlFor="emotionalState">Emotional State</Label>
            <Select value={emotionalState} onValueChange={setEmotionalState}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select your emotional state" />
              </SelectTrigger>
              <SelectContent>
                {EMOTIONAL_STATES.map((state) => (
                  <SelectItem key={state} value={state} className="capitalize">
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lesson Learned */}
          <div className="space-y-2">
            <Label htmlFor="lessonLearned">Lesson Learned</Label>
            <Textarea
              id="lessonLearned"
              placeholder="What did you learn from today's trading..."
              value={lessonLearned}
              onChange={(e) => setLessonLearned(e.target.value)}
              rows={3}
            />
          </div>

          {/* Tomorrow's Plan */}
          <div className="space-y-2">
            <Label htmlFor="tomorrowPlan">Tomorrow&apos;s Plan</Label>
            <Textarea
              id="tomorrowPlan"
              placeholder="Your plan for tomorrow's trading session..."
              value={tomorrowPlan}
              onChange={(e) => setTomorrowPlan(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* === Actions === */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('reviews')}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || !reviewDate}>
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
              Delete Daily Review
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this daily review? This action cannot be undone.
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
