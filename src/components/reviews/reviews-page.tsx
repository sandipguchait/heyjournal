'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/common/loading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  CalendarCheck,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

// --- Types ---

interface DailyReviewItem {
  id: string;
  reviewDate: string;
  summary: string | null;
  whatWentWell: string | null;
  mistakesMade: string | null;
  emotionalState: string | null;
  lessonLearned: string | null;
  tomorrowPlan: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PeriodReviewItem {
  id: string;
  periodType: string;
  startDate: string;
  endDate: string;
  performanceSummary: string | null;
  bestSetups: string | null;
  repeatedMistakes: string | null;
  ruleViolations: string | null;
  improvementPlan: string | null;
  createdAt: string;
  updatedAt: string;
}

const darkCard = 'bg-[#161618] rounded-xl border border-white/[0.06] p-5';

// --- Main Component ---

export default function ReviewsPage() {
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState('daily');

  const [dailyReviews, setDailyReviews] = useState<DailyReviewItem[]>([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const [weeklyReviews, setWeeklyReviews] = useState<PeriodReviewItem[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  const [monthlyReviews, setMonthlyReviews] = useState<PeriodReviewItem[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'daily' | 'period' } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDailyReviews = useCallback(async () => {
    try {
      setDailyLoading(true); setDailyError(null);
      const res = await fetch('/api/reviews/daily');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDailyReviews(json.reviews || []);
    } catch (err) { setDailyError(err instanceof Error ? err.message : 'Failed to load daily reviews'); }
    finally { setDailyLoading(false); }
  }, []);

  const fetchPeriodReviews = useCallback(async (type: string, setter: (r: PeriodReviewItem[]) => void, setLoading: (l: boolean) => void, setErr: (e: string | null) => void) => {
    try {
      setLoading(true); setErr(null);
      const res = await fetch(`/api/reviews/period?periodType=${type}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setter(json.reviews || []);
    } catch (err) { setErr(err instanceof Error ? err.message : `Failed to load ${type} reviews`); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchDailyReviews();
    fetchPeriodReviews('weekly', setWeeklyReviews, setWeeklyLoading, setWeeklyError);
    fetchPeriodReviews('monthly', setMonthlyReviews, setMonthlyLoading, setMonthlyError);
  }, [fetchDailyReviews, fetchPeriodReviews]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const url = deleteTarget.type === 'daily' ? `/api/reviews/daily/${deleteTarget.id}` : `/api/reviews/period/${deleteTarget.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (deleteTarget.type === 'daily') setDailyReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      else {
        setWeeklyReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        setMonthlyReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      }
      setDeleteTarget(null);
    } catch (err) { console.error('Delete failed:', err); }
    finally { setDeleting(false); }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full">
      {/* === Header === */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Reviews
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Daily, weekly, and monthly trading reviews</p>
        </div>
        <Button
          onClick={() => {
            if (activeTab === 'daily') navigate('reviews/daily');
            else if (activeTab === 'weekly') navigate('reviews/weekly');
            else navigate('reviews/monthly');
          }}
          className="bg-primary text-primary-foreground rounded-xl"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create New Review
        </Button>
      </div>

      {/* === Tabs === */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#161618] border border-white/[0.06] rounded-xl p-1 w-full">
          <TabsTrigger value="daily" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1">
            <CalendarCheck className="w-4 h-4 mr-1.5" /> Daily
          </TabsTrigger>
          <TabsTrigger value="weekly" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1">
            Weekly
          </TabsTrigger>
          <TabsTrigger value="monthly" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1">
            Monthly
          </TabsTrigger>
        </TabsList>

        {/* Daily */}
        <TabsContent value="daily">
          {dailyLoading ? (
            <div className="flex items-center justify-center py-16"><LoadingSpinner className="w-8 h-8" /></div>
          ) : dailyError ? (
            <ErrorState message={dailyError} onRetry={fetchDailyReviews} />
          ) : dailyReviews.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No daily reviews yet"
              description="Start writing daily reviews to track your trading performance and identify patterns."
              action={<Button onClick={() => navigate('reviews/daily')} className="bg-primary text-primary-foreground rounded-xl"><Plus className="w-4 h-4 mr-1.5" /> Write Your First Review</Button>}
            />
          ) : (
            <div className="space-y-3 mt-4">
              {dailyReviews.map((review) => {
                const dateParsed = parseISO(review.reviewDate);
                const dateLabel = isValid(dateParsed) ? format(dateParsed, 'EEEE, MMM d, yyyy') : review.reviewDate;
                return (
                  <div key={review.id} className={cn(darkCard, 'cursor-pointer transition-colors hover:border-white/[0.12]')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0" onClick={() => navigate(`reviews/daily/${review.id}`)}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-semibold">{dateLabel}</span>
                          {review.emotionalState && (
                            <Badge className="bg-primary/15 text-primary text-[10px] h-5 capitalize border-0">{review.emotionalState}</Badge>
                          )}
                        </div>
                        {review.summary ? (
                          <p className="text-sm text-muted-foreground line-clamp-2">{review.summary}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No summary written</p>
                        )}
                        {review.lessonLearned && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                            <span className="font-medium text-foreground/70">Lesson:</span> {review.lessonLearned}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => navigate(`reviews/daily/${review.id}`)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => setDeleteTarget({ id: review.id, type: 'daily' })} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Weekly */}
        <TabsContent value="weekly">
          <PeriodReviewList
            reviews={weeklyReviews} loading={weeklyLoading} error={weeklyError}
            onRetry={() => fetchPeriodReviews('weekly', setWeeklyReviews, setWeeklyLoading, setWeeklyError)}
            onEdit={(id) => navigate(`reviews/weekly/${id}`)} onDelete={(id) => setDeleteTarget({ id, type: 'period' })}
            onNew={() => navigate('reviews/weekly')} periodType="weekly"
          />
        </TabsContent>

        {/* Monthly */}
        <TabsContent value="monthly">
          <PeriodReviewList
            reviews={monthlyReviews} loading={monthlyLoading} error={monthlyError}
            onRetry={() => fetchPeriodReviews('monthly', setMonthlyReviews, setMonthlyLoading, setMonthlyError)}
            onEdit={(id) => navigate(`reviews/monthly/${id}`)} onDelete={(id) => setDeleteTarget({ id, type: 'period' })}
            onNew={() => navigate('reviews/monthly')} periodType="monthly"
          />
        </TabsContent>
      </Tabs>

      {/* === Delete Dialog === */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-[#161618] border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" /> Delete Review
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting} className="bg-white/[0.05] border-white/[0.08] rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="rounded-xl">
              {deleting ? <LoadingSpinner className="w-4 h-4 mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Period Review List ---

function PeriodReviewList({ reviews, loading, error, onRetry, onEdit, onDelete, onNew, periodType }: {
  reviews: PeriodReviewItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  periodType: string;
}) {
  if (loading) return <div className="flex items-center justify-center py-16"><LoadingSpinner className="w-8 h-8" /></div>;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={`No ${periodType} reviews yet`}
        description={`Write ${periodType} reviews to analyze your trading patterns over time.`}
        action={<Button onClick={onNew} className="bg-primary text-primary-foreground rounded-xl"><Plus className="w-4 h-4 mr-1.5" /> Create {periodType === 'weekly' ? 'Weekly' : 'Monthly'} Review</Button>}
      />
    );
  }

  return (
    <div className="space-y-3 mt-4">
      {reviews.map((review) => {
        const startParsed = parseISO(review.startDate);
        const endParsed = parseISO(review.endDate);
        const startLabel = isValid(startParsed) ? format(startParsed, 'MMM d, yyyy') : review.startDate;
        const endLabel = isValid(endParsed) ? format(endParsed, 'MMM d, yyyy') : review.endDate;
        return (
          <div key={review.id} className="bg-[#161618] rounded-xl border border-white/[0.06] p-5 cursor-pointer transition-colors hover:border-white/[0.12]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0" onClick={() => onEdit(review.id)}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge className="bg-primary/15 text-primary text-xs capitalize border-0">{review.periodType}</Badge>
                  <span className="text-sm font-semibold">{startLabel} &mdash; {endLabel}</span>
                </div>
                {review.performanceSummary ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">{review.performanceSummary}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No summary written</p>
                )}
                {review.bestSetups && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                    <span className="font-medium text-foreground/70">Best setups:</span> {review.bestSetups}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onEdit(review.id)} title="Edit">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => onDelete(review.id)} title="Delete">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
