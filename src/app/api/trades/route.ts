import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

const USER_ID = 'demo_user_001';

function calculateTradeFields(data: {
  direction: string;
  entryPrice: number;
  exitPrice?: number | null;
  quantity: number;
  stopLoss?: number | null;
  fees: number;
}) {
  const { direction, entryPrice, exitPrice, quantity, stopLoss, fees } = data;

  let pnl: number | null = null;
  let pnlPercent: number | null = null;
  let rMultiple: number | null = null;

  if (exitPrice != null) {
    if (direction === 'long') {
      pnl = (exitPrice - entryPrice) * quantity - fees;
    } else {
      pnl = (entryPrice - exitPrice) * quantity - fees;
    }
    pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
    if (direction === 'short') {
      pnlPercent = -pnlPercent;
    }

    if (stopLoss != null && stopLoss !== entryPrice) {
      const riskPerShare = Math.abs(entryPrice - stopLoss);
      const totalRisk = riskPerShare * quantity;
      if (totalRisk > 0) {
        rMultiple = pnl / totalRisk;
      }
    }
  }

  return { pnl, pnlPercent, rMultiple };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const symbol = searchParams.get('symbol');
    const strategy = searchParams.get('strategy');
    const marketType = searchParams.get('marketType');
    const direction = searchParams.get('direction');
    const tags = searchParams.get('tags');
    const profitable = searchParams.get('profitable');
    const status = searchParams.get('status');
    const accountName = searchParams.get('accountName');
    const sort = searchParams.get('sort') || 'tradeDate_desc';
    const search = searchParams.get('search');

    const where: Prisma.TradeWhereInput = { userId: USER_ID };

    if (dateFrom || dateTo) {
      where.tradeDate = {};
      if (dateFrom) {
        where.tradeDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.tradeDate.lte = end;
      }
    }

    if (symbol) where.symbol = { contains: symbol };
    if (strategy) where.strategy = { contains: strategy };
    if (marketType) where.marketType = marketType;
    if (direction) where.direction = direction;
    if (status) where.status = status;
    if (accountName) where.accountName = { contains: accountName };

    if (profitable === 'true') {
      where.pnl = { gt: 0 };
    } else if (profitable === 'false') {
      where.pnl = { lt: 0 };
    }

    if (tags) {
      const tagIds = tags.split(',');
      where.tags = {
        some: {
          tagId: { in: tagIds },
        },
      };
    }

    if (search) {
      where.OR = [
        { symbol: { contains: search } },
        { notes: { contains: search } },
        { strategy: { contains: search } },
        { mistakes: { contains: search } },
        { lessonsLearned: { contains: search } },
      ];
    }

    const sortField = sort.split('_')[0];
    const sortDir = sort.split('_')[1] || 'desc';
    const sortMap: Record<string, Prisma.TradeOrderByWithRelationInput> = {
      tradeDate: { tradeDate: sortDir as 'asc' | 'desc' },
      entryPrice: { entryPrice: sortDir as 'asc' | 'desc' },
      exitPrice: { exitPrice: sortDir as 'asc' | 'desc' },
      pnl: { pnl: sortDir as 'asc' | 'desc' },
      pnlPercent: { pnlPercent: sortDir as 'asc' | 'desc' },
      rMultiple: { rMultiple: sortDir as 'asc' | 'desc' },
      createdAt: { createdAt: sortDir as 'asc' | 'desc' },
    };

    const [trades, total] = await Promise.all([
      db.trade.findMany({
        where,
        orderBy: sortMap[sortField] || { tradeDate: 'desc' },
        skip,
        take: limit,
        include: {
          screenshots: { orderBy: { sortOrder: 'asc' } },
          tags: { include: { tag: true } },
        },
      }),
      db.trade.count({ where }),
    ]);

    const formattedTrades = trades.map((trade) => ({
      ...trade,
      tags: trade.tags.map((tt) => tt.tag),
    }));

    return NextResponse.json({
      trades: formattedTrades,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing trades:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      symbol,
      marketType = 'stocks',
      direction = 'long',
      tradeDate,
      entryTime,
      exitTime,
      entryPrice,
      exitPrice,
      quantity = 1,
      stopLoss,
      targetPrice,
      fees = 0,
      strategy,
      timeframe,
      accountName,
      broker,
      setupQuality,
      confidenceRating,
      emotionalStateBefore,
      emotionalStateAfter,
      notes,
      mistakes,
      lessonsLearned,
      status = 'closed',
      tagIds = [],
    } = body;

    if (!symbol || !tradeDate || entryPrice == null) {
      return NextResponse.json(
        { error: 'symbol, tradeDate, and entryPrice are required' },
        { status: 400 },
      );
    }

    const calcFields = calculateTradeFields({
      direction,
      entryPrice,
      exitPrice,
      quantity,
      stopLoss,
      fees,
    });

    const riskAmount =
      stopLoss != null ? Math.abs(entryPrice - stopLoss) * quantity : null;

    const trade = await db.trade.create({
      data: {
        userId: USER_ID,
        symbol,
        marketType,
        direction,
        tradeDate: new Date(tradeDate),
        entryTime: entryTime ? new Date(entryTime) : null,
        exitTime: exitTime ? new Date(exitTime) : null,
        entryPrice,
        exitPrice: exitPrice ?? null,
        quantity,
        stopLoss: stopLoss ?? null,
        targetPrice: targetPrice ?? null,
        fees,
        pnl: calcFields.pnl,
        pnlPercent: calcFields.pnlPercent,
        riskAmount,
        rMultiple: calcFields.rMultiple,
        strategy,
        timeframe,
        accountName,
        broker,
        setupQuality,
        confidenceRating,
        emotionalStateBefore,
        emotionalStateAfter,
        notes,
        mistakes,
        lessonsLearned,
        status,
        tags: {
          create: tagIds.map((tagId: string) => ({ tagId })),
        },
      },
      include: {
        screenshots: { orderBy: { sortOrder: 'asc' } },
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json({
      ...trade,
      tags: trade.tags.map((tt) => tt.tag),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating trade:', error);
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 });
  }
}
