import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { format, getDay } from 'date-fns';

const USER_ID = 'demo_user_001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const periodType = searchParams.get('periodType') || 'monthly';
    const dateFromStr = searchParams.get('dateFrom');
    const dateToStr = searchParams.get('dateTo');
    const strategyFilter = searchParams.get('strategy');
    const symbolFilter = searchParams.get('symbol');
    const accountFilter = searchParams.get('accountName');
    const marketTypeFilter = searchParams.get('marketType');
    const tagIdFilter = searchParams.get('tagId');

    // Build date filter from periodType
    const now = new Date();
    const periodMap: Record<string, Date> = {
      weekly: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      monthly: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      annual: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    };

    // Build where clause
    const where: Prisma.TradeWhereInput = { userId: USER_ID, status: 'closed' };

    // Date range: explicit dateFrom/dateTo take precedence over periodType
    const dateFilters: Prisma.DateTimeNullableFilter[] = [];
    if (dateFromStr) {
      dateFilters.push({ gte: new Date(dateFromStr + 'T00:00:00') });
    } else if (periodMap[periodType]) {
      dateFilters.push({ gte: periodMap[periodType] });
    }
    if (dateToStr) {
      dateFilters.push({ lte: new Date(dateToStr + 'T23:59:59') });
    }
    if (dateFilters.length > 0) {
      where.tradeDate = { ...dateFilters[0], ...(dateFilters[1] || {}) };
    }

    // Strategy filter
    if (strategyFilter && strategyFilter !== 'all') {
      where.strategy = strategyFilter;
    }

    // Symbol filter
    if (symbolFilter) {
      where.symbol = { contains: symbolFilter, mode: 'insensitive' };
    }

    // Account filter
    if (accountFilter && accountFilter !== 'all') {
      where.accountName = accountFilter;
    }

    // Market type filter
    if (marketTypeFilter && marketTypeFilter !== 'all') {
      where.marketType = marketTypeFilter;
    }

    // Tag filter
    if (tagIdFilter && tagIdFilter !== 'all') {
      where.tags = {
        some: {
          tagId: tagIdFilter,
        },
      };
    }

    // Fetch all closed trades for the period
    const trades = await db.trade.findMany({
      where,
      orderBy: { tradeDate: 'asc' },
      include: { tags: { include: { tag: true } } },
    });

    // === KPIs ===
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => (t.pnl ?? 0) > 0);
    const losingTrades = trades.filter((t) => (t.pnl ?? 0) <= 0);
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const avgWinner = winningTrades.length > 0
      ? winningTrades.reduce((s, t) => s + (t.pnl ?? 0), 0) / winningTrades.length
      : 0;
    const avgLoser = losingTrades.length > 0
      ? losingTrades.reduce((s, t) => s + (t.pnl ?? 0), 0) / losingTrades.length
      : 0;

    // Profit factor: gross profit / gross loss
    const grossProfit = winningTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((s, t) => s + (t.pnl ?? 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const tradesWithR = trades.filter((t) => t.rMultiple != null);
    const avgRMultiple = tradesWithR.length > 0
      ? tradesWithR.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / tradesWithR.length
      : 0;

    // === P/L Time Series & Equity Curve ===
    const pnlByDate: Record<string, number> = {};

    for (const trade of trades) {
      const dateStr = format(new Date(trade.tradeDate), 'yyyy-MM-dd');
      pnlByDate[dateStr] = (pnlByDate[dateStr] || 0) + (trade.pnl ?? 0);
    }

    let cumulative = 0;
    const sortedDates = Object.keys(pnlByDate).sort();
    const pnlTimeSeries: { date: string; pnl: number }[] = [];
    const equityCurve: { date: string; cumulative: number }[] = [];

    for (const date of sortedDates) {
      pnlTimeSeries.push({ date, pnl: Math.round(pnlByDate[date] * 100) / 100 });
      cumulative += pnlByDate[date];
      equityCurve.push({ date, cumulative: Math.round(cumulative * 100) / 100 });
    }

    // === Strategy Performance ===
    const strategyMap: Record<string, { wins: number; losses: number; pnl: number; count: number; rMultipleSum: number; rMultipleCount: number }> = {};
    for (const trade of trades) {
      const strat = trade.strategy || 'No Strategy';
      if (!strategyMap[strat]) {
        strategyMap[strat] = { wins: 0, losses: 0, pnl: 0, count: 0, rMultipleSum: 0, rMultipleCount: 0 };
      }
      strategyMap[strat].count++;
      strategyMap[strat].pnl += trade.pnl ?? 0;
      if ((trade.pnl ?? 0) > 0) strategyMap[strat].wins++;
      else strategyMap[strat].losses++;
      if (trade.rMultiple != null) {
        strategyMap[strat].rMultipleSum += trade.rMultiple;
        strategyMap[strat].rMultipleCount++;
      }
    }

    const strategyPerformance = Object.entries(strategyMap).map(([name, data]) => ({
      name,
      tradeCount: data.count,
      winRate: Math.round((data.count > 0 ? (data.wins / data.count) * 100 : 0) * 100) / 100,
      totalPnl: Math.round(data.pnl * 100) / 100,
      avgPnl: Math.round((data.count > 0 ? data.pnl / data.count : 0) * 100) / 100,
    })).sort((a, b) => b.totalPnl - a.totalPnl);

    // === Day of Week Performance ===
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayMap: Record<number, { count: number; wins: number; pnl: number }> = {};
    for (let i = 0; i < 7; i++) dayMap[i] = { count: 0, wins: 0, pnl: 0 };
    for (const trade of trades) {
      const day = getDay(new Date(trade.tradeDate));
      dayMap[day].count++;
      dayMap[day].pnl += trade.pnl ?? 0;
      if ((trade.pnl ?? 0) > 0) dayMap[day].wins++;
    }
    const dayPerformance = Object.entries(dayMap).map(([day, data]) => ({
      day: dayNames[parseInt(day)],
      pnl: Math.round(data.pnl * 100) / 100,
      tradeCount: data.count,
      winRate: Math.round((data.count > 0 ? (data.wins / data.count) * 100 : 0) * 100) / 100,
    }));

    // === Hour Performance ===
    const hourMap: Record<number, { count: number; wins: number; pnl: number }> = {};
    for (let i = 0; i < 24; i++) hourMap[i] = { count: 0, wins: 0, pnl: 0 };
    for (const trade of trades) {
      if (trade.entryTime) {
        const hour = new Date(trade.entryTime).getHours();
        hourMap[hour].count++;
        hourMap[hour].pnl += trade.pnl ?? 0;
        if ((trade.pnl ?? 0) > 0) hourMap[hour].wins++;
      }
    }
    const timePerformance = Object.entries(hourMap)
      .filter(([, data]) => data.count > 0)
      .map(([hour, data]) => ({
        hour: hour,
        pnl: Math.round(data.pnl * 100) / 100,
        tradeCount: data.count,
        winRate: Math.round((data.count > 0 ? (data.wins / data.count) * 100 : 0) * 100) / 100,
      }));

    // === Advanced Metrics ===
    // Max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    for (const point of equityCurve) {
      if (point.cumulative > peak) peak = point.cumulative;
      const dd = peak - point.cumulative;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // Consecutive wins/losses
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;
    for (const trade of trades) {
      if ((trade.pnl ?? 0) > 0) {
        currentWins++;
        currentLosses = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
      } else {
        currentLosses++;
        currentWins = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
      }
    }

    // Avg hold time (for trades with entry/exit time)
    const tradesWithTimes = trades.filter((t) => t.entryTime && t.exitTime);
    const avgHoldMinutes = tradesWithTimes.length > 0
      ? tradesWithTimes.reduce((sum, t) => {
          const ms = new Date(t.exitTime!).getTime() - new Date(t.entryTime!).getTime();
          return sum + ms / 60000;
        }, 0) / tradesWithTimes.length
      : null;

    // Expectancy
    const expectancy = totalTrades > 0
      ? (winRate / 100) * avgWinner + ((100 - winRate) / 100) * avgLoser
      : 0;

    // Best / Worst trade
    const bestTrade = winningTrades.length > 0
      ? Math.max(...winningTrades.map((t) => t.pnl ?? 0))
      : 0;
    const worstTrade = losingTrades.length > 0
      ? Math.min(...losingTrades.map((t) => t.pnl ?? 0))
      : 0;

    const round2 = (n: number) => Math.round(n * 100) / 100;

    return NextResponse.json({
      kpi: {
        winRate: round2(winRate),
        avgWinner: round2(avgWinner),
        avgLoser: round2(avgLoser),
        profitFactor: profitFactor === Infinity ? 999.99 : round2(profitFactor),
        expectancy: round2(expectancy),
        maxDrawdown: round2(maxDrawdown),
        bestTrade: round2(bestTrade),
        worstTrade: round2(worstTrade),
        totalTrades,
        totalPnl: round2(totalPnl),
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        grossProfit: round2(grossProfit),
        grossLoss: round2(grossLoss),
        avgRMultiple: round2(avgRMultiple),
        maxConsecutiveWins,
        maxConsecutiveLosses,
        avgHoldMinutes: avgHoldMinutes ? Math.round(avgHoldMinutes) : null,
      },
      pnlTimeSeries,
      equityCurve,
      strategyPerformance,
      dayPerformance,
      timePerformance,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
