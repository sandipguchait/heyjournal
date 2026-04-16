import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { format, subDays, startOfDay, differenceInDays } from 'date-fns';

const USER_ID = 'demo_user_001';

export async function GET() {
  try {
    const now = new Date();

    // === KPI Cards ===
    const allTrades = await db.trade.findMany({
      where: { userId: USER_ID, status: 'closed' },
    });

    const totalTrades = allTrades.length;
    const winningTrades = allTrades.filter((t) => (t.pnl ?? 0) > 0);
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const totalPnl = allTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

    // Today's P/L
    const todayStart = startOfDay(now);
    const todayTrades = allTrades.filter(
      (t) => new Date(t.tradeDate) >= todayStart,
    );
    const todayPnl = todayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const todayTradeCount = todayTrades.length;

    // This week P/L
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekTrades = allTrades.filter((t) => new Date(t.tradeDate) >= weekStart);
    const weekPnl = weekTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

    // This month P/L
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTrades = allTrades.filter((t) => new Date(t.tradeDate) >= monthStart);
    const monthPnl = monthTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

    // === Recent Trades ===
    const recentTrades = await db.trade.findMany({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        tags: { include: { tag: true } },
      },
    });

    const formattedRecentTrades = recentTrades.map((t) => ({
      id: t.id,
      symbol: t.symbol,
      direction: t.direction,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      pnl: t.pnl,
      pnlPercent: t.pnlPercent,
      tradeDate: t.tradeDate,
      status: t.status,
      strategy: t.strategy,
      tags: t.tags.map((tt) => tt.tag),
    }));

    // === Missing Review Dates ===
    // Get last 7 days with trades that don't have daily reviews
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(now, i);
      return startOfDay(d);
    });

    const existingReviews = await db.dailyReview.findMany({
      where: {
        userId: USER_ID,
        reviewDate: { in: last7Days },
      },
      select: { reviewDate: true },
    });

    const reviewedDates = new Set(
      existingReviews.map((r) => format(new Date(r.reviewDate), 'yyyy-MM-dd')),
    );

    // Find days that had trades but no review
    const tradeDates = new Set(
      allTrades.map((t) => format(new Date(t.tradeDate), 'yyyy-MM-dd')),
    );

    const missingReviews: string[] = [];
    for (const day of last7Days) {
      const dateStr = format(day, 'yyyy-MM-dd');
      if (tradeDates.has(dateStr) && !reviewedDates.has(dateStr)) {
        missingReviews.push(dateStr);
      }
    }

    // === Streak ===
    // Current winning/losing streak
    let currentStreak = 0;
    let streakType: 'win' | 'loss' | 'none' = 'none';
    const sortedByDate = [...allTrades].sort(
      (a, b) => new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime(),
    );
    if (sortedByDate.length > 0) {
      const firstPnl = sortedByDate[0].pnl ?? 0;
      streakType = firstPnl >= 0 ? 'win' : 'loss';
      for (const trade of sortedByDate) {
        const pnl = trade.pnl ?? 0;
        if ((streakType === 'win' && pnl > 0) || (streakType === 'loss' && pnl < 0)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Open trades count
    const openTradeCount = await db.trade.count({
      where: { userId: USER_ID, status: 'open' },
    });

    return NextResponse.json({
      kpis: {
        totalTrades,
        winRate: Math.round(winRate * 100) / 100,
        totalPnl: Math.round(totalPnl * 100) / 100,
        todayPnl: Math.round(todayPnl * 100) / 100,
        todayTradeCount,
        weekPnl: Math.round(weekPnl * 100) / 100,
        monthPnl: Math.round(monthPnl * 100) / 100,
        openTrades: openTradeCount,
        streak: {
          type: streakType,
          count: currentStreak,
        },
      },
      recentTrades: formattedRecentTrades,
      missingReviews,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
