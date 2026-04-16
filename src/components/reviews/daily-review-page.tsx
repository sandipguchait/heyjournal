'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';
import { LoadingSpinner, ErrorState } from '@/components/common/loading';
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

const EMOTIONAL_STATES: EmotionalState[] = ['calm','confident','anxious','fearful','greedy','frustrated','excited','neutral'];

const darkCard = 'bg-[#161618] rounded-xl border border-white/[0.06] p-5';
const darkInput = 'bg-white/[0.03] border-white/[0.08] rounded-lg focus:border-primary/50';

interface DailyReviewData {
  id: string;
  reviewDate: string;
  summary: string | null;
  whatWentWell: string | null;
  mistakesMade: string | null;
  emotionalState: string | null;
  lessonLearned: string | null;
  tomorrowPlan: string | null;
}

export default function DailyReviewPage({ reviewId }: { reviewId?: string }) {
  const { navigate } = useRouter();
  const isEditing = !!reviewId;

  const [reviewDate, setReviewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState('');
  const [whatWentWell, setWhatWentWell] = useState('');
  const [mistakesMade, setMistakesMade] = useState('');
  const [emotionalState, setEmotionalState] = useState<string>('');
  const [lessonLearned, setLessonLearned] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchReview = useCallback(async () => {
    if (!reviewId) return;
    try {
      setLoading(true); setError(null);
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
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load review'); }
    finally { setLoading(false); }
  }, [reviewId]);

  useEffect(() => { fetchReview(); }, [fetchReview]);

  const handleSave = async () => {
    if (!reviewDate) return;
    try {
      setSaving(true); setError(null);
      const payload = { reviewDate, summary: summary || null, whatWentWell: whatWentWell || null, mistakesMade: mistakesMade || null, emotionalState: emotionalState || null, lessonLearned: lessonLearned || null, tomorrowPlan: tomorrowPlan || null };
      const url = isEditing ? `/api/reviews/daily/${reviewId}` : '/api/reviews/daily';
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
      const res = await fetch(`/api/reviews/daily/${reviewId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate('reviews');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete review'); }
    finally { setDeleting(false); }
  };

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
            <CalendarCheck className="w-5 h-5 text-primary" />
            {isEditing ? 'Edit Daily Review' : 'New Daily Review'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{isEditing ? 'Update your daily trading review' : 'Reflect on your trading day'}</p>
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
        <div className="space-y-2">
          <Label className="text-sm font-medium">Review Date <span className="text-red-400">*</span></Label>
          <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className={cn(darkInput, 'max-w-xs')} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Summary</Label>
          <Textarea placeholder="Brief summary of your trading day..." value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className={darkInput} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">What Went Well</Label>
          <Textarea placeholder="What trades or decisions worked well today..." value={whatWentWell} onChange={(e) => setWhatWentWell(e.target.value)} rows={3} className={darkInput} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Mistakes Made</Label>
          <Textarea placeholder="What mistakes did you make today..." value={mistakesMade} onChange={(e) => setMistakesMade(e.target.value)} rows={3} className={darkInput} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Emotional State</Label>
          <Select value={emotionalState} onValueChange={setEmotionalState}>
            <SelectTrigger className={cn(darkInput, 'max-w-xs')}>
              <SelectValue placeholder="Select your emotional state" />
            </SelectTrigger>
            <SelectContent>
              {EMOTIONAL_STATES.map((state) => (<SelectItem key={state} value={state} className="capitalize">{state}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Lesson Learned</Label>
          <Textarea placeholder="What did you learn from today's trading..." value={lessonLearned} onChange={(e) => setLessonLearned(e.target.value)} rows={3} className={darkInput} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Tomorrow&apos;s Plan</Label>
          <Textarea placeholder="Your plan for tomorrow's trading session..." value={tomorrowPlan} onChange={(e) => setTomorrowPlan(e.target.value)} rows={3} className={darkInput} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('reviews')} className="bg-white/[0.05] border-white/[0.08] rounded-xl">Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !reviewDate} className="bg-primary text-primary-foreground rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
          {isEditing ? 'Update Review' : 'Save Review'}
        </Button>
      </div>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-[#161618] border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" /> Delete Daily Review</DialogTitle>
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
