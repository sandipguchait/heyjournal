import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';

const USER_ID = 'demo_user_001';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Fetch trades for this month
    const trades = await db.trade.findMany({
      where: {
        userId: USER_ID,
        tradeDate: { gte: monthStart, lte: monthEnd },
      },
      include: { tags: { include: { tag: true } } },
      orderBy: { tradeDate: 'asc' },
    });

    // Fetch daily reviews for this month
    const reviews = await db.dailyReview.findMany({
      where: {
        userId: USER_ID,
        reviewDate: { gte: monthStart, lte: monthEnd },
      },
    });

    // Build calendar data
    const calendarDays = days.map((day) => {
      const dayTrades = trades.filter((t) => isSameDay(new Date(t.tradeDate), day));
      const dayReview = reviews.find((r) => isSameDay(new Date(r.reviewDate), day));

      const totalPnl = dayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
      const wins = dayTrades.filter((t) => (t.pnl ?? 0) > 0).length;
      const losses = dayTrades.filter((t) => (t.pnl ?? 0) <= 0).length;

      return {
        date: format(day, 'yyyy-MM-dd'),
        dayOfWeek: getDay(day),
        dayName: DAY_NAMES[getDay(day)],
        isCurrentMonth: true,
        tradeCount: dayTrades.length,
        wins,
        losses,
        pnl: Math.round(totalPnl * 100) / 100,
        hasReview: !!dayReview,
        reviewId: dayReview?.id || null,
        trades: dayTrades.map((t) => ({
          id: t.id,
          symbol: t.symbol,
          direction: t.direction,
          pnl: t.pnl,
          status: t.status,
          tags: t.tags.map((tt) => tt.tag.name),
        })),
      };
    });

    // Add padding days for the beginning of the month (previous month)
    const firstDayOfWeek = getDay(monthStart);
    const paddingBefore: typeof calendarDays = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const padDate = new Date(monthStart);
      padDate.setDate(padDate.getDate() - (i + 1));
      paddingBefore.push({
        date: format(padDate, 'yyyy-MM-dd'),
        dayOfWeek: getDay(padDate),
        dayName: DAY_NAMES[getDay(padDate)],
        isCurrentMonth: false,
        tradeCount: 0,
        wins: 0,
        losses: 0,
        pnl: 0,
        hasReview: false,
        reviewId: null,
        trades: [],
      });
    }

    // Add padding days for the end of the month (next month)
    const totalCells = paddingBefore.length + calendarDays.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    const paddingAfter: typeof calendarDays = [];
    for (let i = 1; i <= remainingCells; i++) {
      const padDate = new Date(monthEnd);
      padDate.setDate(padDate.getDate() + i);
      paddingAfter.push({
        date: format(padDate, 'yyyy-MM-dd'),
        dayOfWeek: getDay(padDate),
        dayName: DAY_NAMES[getDay(padDate)],
        isCurrentMonth: false,
        tradeCount: 0,
        wins: 0,
        losses: 0,
        pnl: 0,
        hasReview: false,
        reviewId: null,
        trades: [],
      });
    }

    // Monthly summary
    const monthPnl = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const monthWins = trades.filter((t) => (t.pnl ?? 0) > 0).length;
    const monthTotal = trades.length;
    const monthWinRate = monthTotal > 0 ? (monthWins / monthTotal) * 100 : 0;

    return NextResponse.json({
      year,
      month,
      monthLabel: format(monthStart, 'MMMM yyyy'),
      days: [...paddingBefore, ...calendarDays, ...paddingAfter],
      summary: {
        totalTrades: monthTotal,
        winRate: Math.round(monthWinRate * 100) / 100,
        totalPnl: Math.round(monthPnl * 100) / 100,
        reviewsWritten: reviews.length,
      },
    });
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 });
  }
}
