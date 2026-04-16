import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const USER_ID = 'demo_user_001';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const original = await db.trade.findFirst({
      where: { id, userId: USER_ID },
      include: {
        screenshots: { orderBy: { sortOrder: 'asc' } },
        tags: { include: { tag: true } },
      },
    });

    if (!original) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const tagIds = original.tags.map((tt) => tt.tagId);

    const duplicate = await db.trade.create({
      data: {
        userId: USER_ID,
        symbol: original.symbol,
        marketType: original.marketType,
        direction: original.direction,
        tradeDate: new Date(),
        entryTime: null,
        exitTime: null,
        entryPrice: original.entryPrice,
        exitPrice: original.exitPrice,
        quantity: original.quantity,
        stopLoss: original.stopLoss,
        targetPrice: original.targetPrice,
        fees: original.fees,
        pnl: original.pnl,
        pnlPercent: original.pnlPercent,
        riskAmount: original.riskAmount,
        rMultiple: original.rMultiple,
        strategy: original.strategy,
        timeframe: original.timeframe,
        accountName: original.accountName,
        broker: original.broker,
        setupQuality: original.setupQuality,
        confidenceRating: original.confidenceRating,
        emotionalStateBefore: original.emotionalStateBefore,
        emotionalStateAfter: original.emotionalStateAfter,
        notes: original.notes,
        mistakes: original.mistakes,
        lessonsLearned: original.lessonsLearned,
        status: 'open',
        tags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
      include: {
        screenshots: { orderBy: { sortOrder: 'asc' } },
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json({
      ...duplicate,
      tags: duplicate.tags.map((tt) => tt.tag),
    }, { status: 201 });
  } catch (error) {
    console.error('Error duplicating trade:', error);
    return NextResponse.json({ error: 'Failed to duplicate trade' }, { status: 500 });
  }
}
